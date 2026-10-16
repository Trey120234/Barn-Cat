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
})();
