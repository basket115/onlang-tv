// setup-dom-shim.js
//
// Minimaler Shim, damit die klassischen Browser-Scripts aus src/ (die
// window.ONLANG.* referenzieren) auch unter Node.js für die
// automatisierten Tests ausgeführt werden können. Betrifft NUR die
// Testumgebung — hat keinerlei Einfluss auf den Browser-Betrieb der
// eigentlichen Anwendung.

globalThis.window = globalThis.window || globalThis;
globalThis.window.location = globalThis.window.location || { search: '' };
