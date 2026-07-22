// tenant-schema.js
//
// Kanonische Struktur eines Mandanten-Datensatzes inkl. neutraler
// Standardwerte. Dient tenant-validator.js als Quelle für Fallback-Werte
// bei fehlenden oder ungültigen Feldern. Muss inhaltlich mit
// public/demo-data/default.js übereinstimmen (siehe docs/DATA_MODEL.md
// für die Feld-Dokumentation).
//
// Ab Phase 5 klassisches <script> (kein ES-Modul mehr) — siehe
// docs/ARCHITECTURE.md, Abschnitt "Kein Build-Schritt nötig". Die
// Namen unter tenant.theme (accent/background/surface/text) sind
// UNVERÄNDERT seit Schritt 1 — Phase 5 ergänzt ausschließlich neue,
// optionale Felder (Branding: Logos, Präsentiert-von-Sponsor,
// Kategorien-/Partner-/Video-Struktur), keine bestehenden umbenannt.

window.ONLANG = window.ONLANG || {};
window.ONLANG.tenant = window.ONLANG.tenant || {};

(function (ns) {
  'use strict';

  var DEFAULT_TENANT_SCHEMA = Object.freeze({
    tenant: {
      customerId: 'DEFAULT',
      name: 'ONLANG TV',
      tagline: 'Das Videoportal für Vereine und Verbände',
      logoUrl: '',
      // NEU (Phase 5, optional): Kurztext im Logo-Platzhalter, falls
      // kein logoUrl-Bild vorhanden ist (z.B. "BBK"). Fällt sonst auf
      // die Initialen von "name" zurück.
      logoText: '',
      // UNVERÄNDERT seit Schritt 1 — Farb-Namensraum bleibt exakt so.
      theme: {
        accent: '#f28c00',
        background: '#080808',
        surface: '#151515',
        text: '#ffffff',
      },
      // NEU (Phase 5, optional): Hauptsponsor-Einblendung
      // ("präsentiert von ...") über dem Player.
      presenter: {
        label: '',
        name: '',
        logoUrl: '',
      },
    },
    settings: {
      defaultView: 'full',
      autoplay: false,
      mutedAutoplay: true,
      loopPlaylist: false,
      advertisingMode: 'off',
    },
    live: {
      enabled: false,
      title: '',
      date: '',
      time: '',
    },
    // Item-Struktur (Phase 5 festgelegt, siehe docs/DATA_MODEL.md):
    // { id, title, description, category, durationLabel, src, badge }
    // "description"/"badge" sind optional. Entspricht exakt der
    // Struktur, die playlist-controller.js/playlist-ui.js bereits seit
    // Schritt 3 unverändert erwarten (id/title/category/durationLabel/src).
    videos: [],
    // Item-Struktur: { id, icon, label, description }
    categories: [],
    // Item-Struktur: { id, name, logoUrl, subtitle }
    partners: [],
    // Item-Struktur (unverändert seit Schritt 4):
    // { id, title, sponsor, durationLabel, src, active }
    advertisements: [],
  });

  // Gültige Werte für settings.advertisingMode.
  var VALID_ADVERTISING_MODES = ['off', 'startup', 'always'];

  // Gültige Werte für settings.defaultView.
  var VALID_VIEW_MODES = ['full', 'embed'];

  ns.TenantSchema = {
    DEFAULT_TENANT_SCHEMA: DEFAULT_TENANT_SCHEMA,
    VALID_ADVERTISING_MODES: VALID_ADVERTISING_MODES,
    VALID_VIEW_MODES: VALID_VIEW_MODES,
  };
})(window.ONLANG.tenant);
