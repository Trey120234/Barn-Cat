// Copies the game files into the "www" folder, which Capacitor packs inside the Android/iPhone app.
// (The website itself is served straight from the main folder; "www" is only for the apps and is never uploaded.)
// If you add a file the game needs, add it to FILES here too (and to sw.js).
import { cpSync, rmSync, mkdirSync } from "node:fs";

const FILES = ["index.html", "style.css", "game.js", "install.js", "manifest.webmanifest", "sw.js", "fonts", "icons", "licenses"];

rmSync("www", { recursive: true, force: true });
mkdirSync("www");
for (const f of FILES) cpSync(f, "www/" + f, { recursive: true });
console.log("Copied the game into www/:", FILES.join(", "));
