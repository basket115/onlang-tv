// harness.js
//
// Ladeumgebung für die Integrationstests: startet index.html in jsdom,
// führt alle klassischen <script>-Dateien aus src/ und public/demo-data/
// in der richtigen Reihenfolge aus und ersetzt die in jsdom nicht
// vorhandene Medienwiedergabe durch eine steuerbare Nachbildung.
//
// Die Nachbildung ist bewusst KEIN vereinfachtes Modell des Ablaufs,
// sondern eine Nachbildung des <video>-Elements: sie kennt nur src,
// play(), pause(), load() und feuert dieselben nativen Ereignisse wie
// ein Browser. Der gesamte getestete Ablauf stammt damit unverändert aus
// dem Produktivcode.
//
// Betrifft AUSSCHLIESSLICH die Testumgebung.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Reihenfolge exakt wie in index.html. Wird gegen index.html geprüft,
 * damit die Tests nicht unbemerkt eine andere Datei-Auswahl testen als
 * die Anwendung tatsächlich lädt.
 */
export function getScriptOrderFromIndexHtml() {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  return [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
}

/**
 * Baut eine vollständige ONLANG-TV-Umgebung auf.
 *
 * @param {{ url?: string, autoplayBlocked?: boolean }} [options]
 */
export async function createApp(options = {}) {
  const url = options.url || 'https://onlang-tv.test/?kunde=V006';

  const dom = new JSDOM('<!doctype html><html><body><div id="app"></div></body></html>', {
    url,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
  });

  const { window } = dom;

  // --- Medienwiedergabe nachbilden -----------------------------------
  // jsdom implementiert play()/pause()/load() nicht. Statt eines
  // Platzhalters wird hier das reale Browserverhalten nachgebildet,
  // inklusive blockiertem Autoplay (NotAllowedError).
  const state = {
    autoplayBlocked: !!options.autoplayBlocked,
    playCalls: 0,
    loadedSources: [],
  };

  // --- Bootstrap-API nachbilden --------------------------------------
  // Standardfall der Demo: die Netlify Function ist nicht erreichbar
  // (lokale Vorschau, Apps Script offline). Die Anwendung MUSS dann
  // sauber auf die lokale Registry zurückfallen. Über
  // options.bootstrapResponse lässt sich auch eine erfolgreiche Antwort
  // simulieren.
  window.fetch = function fetch() {
    if (options.bootstrapResponse) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(options.bootstrapResponse),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ success: false }),
    });
  };

  const proto = window.HTMLMediaElement.prototype;

  Object.defineProperty(proto, 'error', {
    configurable: true,
    get() {
      return this.__mediaError || null;
    },
  });

  // jsdom stellt paused/ended nur lesend bereit — für die Nachbildung
  // müssen beide beschreibbar sein.
  Object.defineProperty(proto, 'paused', {
    configurable: true,
    get() {
      return this.__paused !== false;
    },
    set(value) {
      this.__paused = !!value;
    },
  });

  Object.defineProperty(proto, 'ended', {
    configurable: true,
    get() {
      return this.__ended === true;
    },
    set(value) {
      this.__ended = !!value;
    },
  });

  proto.load = function load() {
    this.__mediaError = null;
    this.__ended = false;
    this.paused = true;
    if (this.src) state.loadedSources.push(stripOrigin(this.src));
  };

  proto.play = function play() {
    state.playCalls += 1;

    if (state.autoplayBlocked && !window.__userHasInteracted) {
      const error = new Error('play() blocked');
      error.name = 'NotAllowedError';
      return Promise.reject(error);
    }

    if (!this.src) {
      const error = new Error('no source');
      error.name = 'NotSupportedError';
      return Promise.reject(error);
    }

    this.paused = false;
    // Browser feuern "play" asynchron, nicht im selben Tick.
    queueMicrotask(() => {
      if (!this.paused) this.dispatchEvent(new window.Event('play'));
    });
    return Promise.resolve();
  };

  proto.pause = function pause() {
    if (this.paused) return;
    this.paused = true;
    this.dispatchEvent(new window.Event('pause'));
  };

  // --- Skripte in der Reihenfolge von index.html ausführen ------------
  for (const relativeSrc of getScriptOrderFromIndexHtml()) {
    const code = fs.readFileSync(path.join(ROOT, relativeSrc), 'utf8');
    const scriptEl = window.document.createElement('script');
    scriptEl.textContent = code;
    window.document.body.appendChild(scriptEl);
  }

  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await settle(window);

  return {
    dom,
    window,
    document: window.document,
    state,

    /** Das aktuell in der Ansicht sichtbare <video>-Element. */
    get video() {
      return window.document.querySelector('.player-video');
    },

    /** Der aktuell angezeigte Ablaufzustand (aus der Ansicht gelesen). */
    get flowState() {
      const el = window.document.querySelector('.player-flow-state');
      return el ? el.textContent : null;
    },

    /** Kennzeichnung "WERBUNG" / "JETZT LÄUFT". */
    get nowPlayingTag() {
      const el = window.document.querySelector('.now-playing-tag');
      return el ? el.textContent : null;
    },

    get nowPlayingTitle() {
      const el = window.document.querySelector('.now-playing-title');
      return el ? el.textContent : null;
    },

    /** Zuletzt in das <video>-Element geladene Quelle. */
    get currentSource() {
      return state.loadedSources[state.loadedSources.length - 1] || null;
    },

    get activateVisible() {
      const el = window.document.querySelector('.player-activate');
      return !!el && el.hidden === false;
    },

    get tenantClasses() {
      return [...window.document.body.classList].filter((c) => c.startsWith('tenant-'));
    },

    /** Simuliert das Ende des laufenden Mediums. */
    async endMedia() {
      const video = window.document.querySelector('.player-video');
      video.paused = true;
      video.ended = true;
      video.dispatchEvent(new window.Event('ended'));
      await settle(window);
    },

    /** Simuliert einen echten Medienfehler (z.B. Datei nicht gefunden). */
    async failMedia(code = 4) {
      const video = window.document.querySelector('.player-video');
      video.__mediaError = { code };
      video.dispatchEvent(new window.Event('error'));
      await settle(window);
    },

    /** Simuliert die erste echte Nutzeraktion (hebt die Blockierung auf). */
    async userActivates() {
      window.__userHasInteracted = true;
      const btn = window.document.querySelector('.player-activate');
      btn.dispatchEvent(new window.Event('click', { bubbles: true }));
      await settle(window);
    },

    /** Wählt im Vereins-Schnellwechsler einen anderen Mandanten. */
    async switchTenant(registryKey) {
      const select = window.document.querySelector('.tv-tenant-switcher');
      select.value = registryKey;
      select.dispatchEvent(new window.Event('change'));
      await settle(window);
    },

    /**
     * Löst mehrere Wechsel unmittelbar hintereinander aus, ohne die
     * jeweiligen Ladevorgänge abzuwarten (Test auf Wettlaufsituationen).
     */
    async switchTenantRapid(registryKeys) {
      const select = window.document.querySelector('.tv-tenant-switcher');
      for (const key of registryKeys) {
        select.value = key;
        select.dispatchEvent(new window.Event('change'));
      }
      await settle(window);
    },

    settle: () => settle(window),
    close: () => dom.window.close(),
  };
}

function stripOrigin(src) {
  return String(src).replace(/^https?:\/\/[^/]+\//, '');
}

/** Wartet, bis alle angestoßenen Microtasks/Promises abgearbeitet sind. */
async function settle(window, rounds = 8) {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    await Promise.resolve();
  }
}

// --- Kleine Zusicherungshilfen ---------------------------------------

let passed = 0;
const failures = [];

export function check(label, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  \u2713 ${label}`);
  } else {
    failures.push(label + (detail ? ` (${detail})` : ''));
    console.error(`  \u2717 ${label}${detail ? ` \u2014 ${detail}` : ''}`);
  }
}

export function equal(label, actual, expected) {
  check(label, actual === expected, `erwartet "${expected}", tatsächlich "${actual}"`);
}

export function finish(name) {
  if (failures.length > 0) {
    console.error(`\n${name}: ${failures.length} Test(s) fehlgeschlagen:`);
    failures.forEach((f) => console.error(`  - ${f}`));
    process.exit(1);
  }
  console.log(`${name}: ${passed} Test(s) bestanden\n`);
}
