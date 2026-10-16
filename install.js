// Barn Cat: Midnight Prowler - installing the game as an app on a phone.
//  - Turns on the offline helper (sw.js), so the game works without internet after the first visit.
//  - Shows the "Get the app" box on the start screen: an Install button on Android, steps on iPhone.
//  - Hides that box when the game is already running as an installed app (or inside a store app later).
(() => {
  const $ = (id) => document.getElementById(id);
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const installed = () => window.matchMedia("(display-mode: standalone)").matches
    || window.matchMedia("(display-mode: fullscreen)").matches
    || navigator.standalone === true
    || !!window.Capacitor;   // the future Google Play / App Store versions

  // offline helper: only for the website (not when opening the file directly, and not inside the
  // store apps, which already have the game stored inside them)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http") && !window.Capacitor) {
    navigator.serviceWorker.register("sw.js").catch(() => { /* the game still works without it */ });
  }

  checkForUpdate();   // Android test app only
  if (installed()) return;
  if (isIOS) { $("getAppIphone").hidden = false; return; }
  if (!isAndroid) return;   // computers: no box

  $("getAppAndroid").hidden = false;
  let prompt = null;
  // Chrome tells us when it can install the app; then we show our own Install button.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    $("installBtn").hidden = false;
    $("installHelp").hidden = true;
  });
  $("installBtn").onclick = async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    prompt = null;
    $("installBtn").hidden = true;
  };
  window.addEventListener("appinstalled", () => { $("getAppAndroid").hidden = true; });

  // ---- "Update available" (only in the Android test app downloaded from GitHub) ----
  // Each cloud build writes app-build.json with its build number. When the app opens with internet,
  // it asks GitHub for the newest release; if it's newer, it offers "Update" or "Not now".
  // Not allowed in Google Play builds (they set "selfUpdate": false).
  async function checkForUpdate() {
    const cap = window.Capacitor;
    if (!cap || !cap.getPlatform || cap.getPlatform() !== "android") return;
    let me, rel;
    try { me = await (await fetch("app-build.json", { cache: "no-store" })).json(); } catch (e) { return; }
    if (!me || !me.selfUpdate || !me.build) return;
    try {
      const r = await fetch("https://api.github.com/repos/Trey120234/Barn-Cat/releases/latest", { cache: "no-store" });
      if (!r.ok) return;
      rel = await r.json();
    } catch (e) { return; }   // no internet: say nothing
    const latest = parseInt(String(rel.tag_name || "").replace("android-", ""), 10);
    const apk = (rel.assets || []).find((a) => a.name === "BarnCat.apk");
    if (!latest || latest <= me.build || !apk) return;

    $("updateText").textContent = `Build ${latest} is ready (you have build ${me.build}). Your progress is kept.`;
    $("updateScreen").hidden = false;
    $("updateBtn").focus();
    let downloaded = false;
    const status = (t) => { $("updateStatus").textContent = t; };
    const install = async () => {
      const res = await cap.nativePromise("AppUpdater", "install", {});
      if (res && res.needsPermission) {
        status("One time only: turn on \"Allow from this source\" for Barn Cat, come back, then tap Install.");
      } else {
        status("Tap Install on the next screen to finish.");
      }
      $("updateBtn").textContent = "Install";
      $("updateBtn").disabled = false;
    };
    $("updateLaterBtn").onclick = () => { $("updateScreen").hidden = true; };
    $("updateBtn").onclick = async () => {
      $("updateBtn").disabled = true;
      try {
        if (!downloaded) {
          $("updateBar").hidden = false;
          status("Downloading…");
          const listener = cap.addListener("AppUpdater", "progress", (e) => {
            $("updateFill").style.width = e.percent + "%";
            status(`Downloading… ${e.percent}%`);
          });
          await cap.nativePromise("AppUpdater", "download", { url: apk.browser_download_url });
          listener.remove();
          downloaded = true;
          $("updateFill").style.width = "100%";
        }
        await install();
      } catch (e) {
        status("The update didn't download. Check your internet and try again.");
        $("updateBtn").textContent = "Try again";
        $("updateBtn").disabled = false;
      }
    };
  }
})();
