// runtime-config.js
//
// Liest laufzeit-relevante, NICHT mandantenspezifische Einstellungen aus
// der URL (aktuell: Ansichtsmodus full/embed). Die Kunden-ID selbst wird
// bewusst getrennt davon in tenant-service.js gelesen (siehe
// docs/ARCHITECTURE.md, Abschnitt "Verantwortlichkeiten").
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.config = window.ONLANG.config || {};

(function (ns) {
  'use strict';

  var VALID_VIEW_MODES = ['full', 'embed'];

  /**
   * Liest den in der URL explizit angeforderten Ansichtsmodus
   * (?modus=full|embed). Liefert null, wenn keiner (oder ein
   * ungültiger) angegeben wurde — main.js entscheidet dann anhand von
   * tenant.settings.defaultView.
   * @param {Location} [location] - optional, für Tests injizierbar
   * @returns {{ modus: 'full' | 'embed' | null }}
   */
  function getRuntimeConfig(location) {
    location = location || window.location;
    var params = new URLSearchParams(location.search);
    var requested = params.get('modus');
    var modus = VALID_VIEW_MODES.indexOf(requested) !== -1 ? requested : null;

    // Separate Einstiegseiten dürfen einen Standardmodus setzen. Eine
    // ausdrücklich übergebene URL (?modus=...) hat weiterhin Vorrang.
    if (!modus && VALID_VIEW_MODES.indexOf(window.ONLANG_DEFAULT_VIEW) !== -1) {
      modus = window.ONLANG_DEFAULT_VIEW;
    }

    return { modus: modus };
  }

  ns.RuntimeConfig = { getRuntimeConfig: getRuntimeConfig };
})(window.ONLANG.config);
