// tenant-service.js
//
// Verantwortlich für: Kunden-ID aus der URL lesen, passenden lokalen
// Demo-Datensatz laden, validieren, neutralen Fallback liefern, sowie
// (neu in Phase 5) das Theme des geladenen Mandanten auf :root
// anzuwenden.
//
// WICHTIG (siehe docs/ARCHITECTURE.md, Abschnitt "Austauschbare
// Datenquelle"): Diese Datei ist bewusst die EINZIGE Stelle, die weiß,
// woher Mandantendaten kommen. Views und Controller rufen ausschließlich
// loadTenantData() auf und kennen weder das Registry-Muster unten noch
// eine spätere echte API. Wenn in Phase 7 eine echte
// Google-Sheets-/API-Anbindung hinzukommt, wird ausschließlich diese
// Datei geändert.
//
// WICHTIGER HINWEIS ZUR DATENQUELLE (Phase 5):
// Reines fetch() einer .json-Datei funktioniert unter file:// in Chrome
// NICHT ("Fetch API cannot load file:///... URL scheme 'file' is not
// supported") — das wurde empirisch geprüft. Daher werden die
// Mandantendaten NICHT per fetch(), sondern über klassische
// <script>-Tags geladen, die sich in eine Registry eintragen (exakt
// dasselbe Muster wie bereits playlist-data.js/advertising-data.js).
// Siehe public/demo-data/*.js — die begleitenden *.json-Dateien im
// selben Ordner sind reine, menschenlesbare Referenz/Dokumentation und
// werden zur Laufzeit NICHT geladen.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.tenant = window.ONLANG.tenant || {};
// Registry, in die sich public/demo-data/*.js-Dateien eintragen
// (siehe z.B. public/demo-data/default.js).
window.ONLANG.tenantRegistry = window.ONLANG.tenantRegistry || {};

(function (ns) {
  'use strict';

  var DEFAULT_CUSTOMER_ID = 'DEFAULT';

  /**
   * Liest die angeforderte Kunden-ID aus der URL. Primärer, seit
   * Schritt 1 dokumentierter Parameter ist "?kunde=". Zusätzlich wird
   * "?tenant=" als Alias akzeptiert (falls "kunde" fehlt) — beide
   * führen zum selben Ergebnis. Fehlen beide, wird
   * DEFAULT_CUSTOMER_ID verwendet.
   * @param {Location} [location] - optional, für Tests injizierbar
   * @returns {string}
   */
  function getRequestedCustomerId(location) {
    location = location || window.location;
    var params = new URLSearchParams(location.search);
    var kunde = params.get('kunde');
    if (kunde && kunde.trim() !== '') return kunde.trim();
    var tenantAlias = params.get('tenant');
    if (tenantAlias && tenantAlias.trim() !== '') return tenantAlias.trim();
    return DEFAULT_CUSTOMER_ID;
  }

  /**
   * Liefert alle aktuell über <script>-Tags registrierten Mandanten-IDs
   * (siehe public/demo-data/*.js) — wird z.B. vom
   * Vereins-Schnellwechsler-Dropdown verwendet.
   * @returns {string[]}
   */
  function getAvailableCustomerIds() {
    return Object.keys(ns.tenantRegistryRef());
  }

  /**
   * Lädt, validiert und liefert die Mandantendaten für die angeforderte
   * Kunden-ID. Liefert bei jedem Fehler einen klaren, funktionierenden
   * neutralen Fallback statt einer Exception. Bleibt bewusst
   * Promise-basiert (obwohl die aktuelle Quelle synchron ist), damit
   * eine spätere echte API-Anbindung (Phase 7) ohne Änderungen an den
   * Aufrufstellen möglich ist.
   *
   * @param {string} requestedCustomerId
   * @returns {Promise<{
   *   requestedCustomerId: string,
   *   loadedCustomerId: string,
   *   usedFallback: boolean,
   *   data: object,
   *   warnings: string[],
   *   loadError: string | null
   * }>}
   */
  function loadTenantData(requestedCustomerId) {
    var requestedId = requestedCustomerId || DEFAULT_CUSTOMER_ID;
    var loadedId = requestedId;
    var raw = null;
    var loadError = null;

    raw = lookupTenantRaw(requestedId);
    if (raw === null) {
      loadError = 'Kein Datensatz gefunden für Kunden-ID "' + requestedId + '" (erwartet: public/demo-data/' + requestedId + '.js, eingetragen unter window.ONLANG.tenantRegistry["' + requestedId + '"]).';
      loadedId = DEFAULT_CUSTOMER_ID;
      raw = lookupTenantRaw(DEFAULT_CUSTOMER_ID);
      if (raw === null) {
        loadError += ' | Zusätzlich konnte auch der Standard-Datensatz ("DEFAULT") nicht gefunden werden.';
      }
    }

    var validated = ns.TenantValidator.validateTenantData(raw);
    var usedFallback = loadedId !== requestedId;

    var result = {
      requestedCustomerId: requestedId,
      loadedCustomerId: loadedId,
      usedFallback: usedFallback,
      data: validated.data,
      warnings: validated.warnings,
      loadError: loadError,
    };

    return Promise.resolve(result);
  }

  function lookupTenantRaw(customerId) {
    // Suche zunächst exakt, dann case-insensitiv (Kunden-IDs in URLs
    // werden häufig unterschiedlich großgeschrieben eingegeben).
    if (Object.prototype.hasOwnProperty.call(ns.tenantRegistryRef(), customerId)) {
      return ns.tenantRegistryRef()[customerId];
    }
    var lowerTarget = String(customerId).toLowerCase();
    var registry = ns.tenantRegistryRef();
    for (var key in registry) {
      if (Object.prototype.hasOwnProperty.call(registry, key) && key.toLowerCase() === lowerTarget) {
        return registry[key];
      }
    }
    return null;
  }

  /**
   * Überträgt tenant.theme (unverändert seit Schritt 1: accent/
   * background/surface/text) als CSS-Variablen auf :root — siehe
   * src/styles/tokens.css für die Variablennamen. Rein additiv: ohne
   * Aufruf bleiben die neutralen Standardwerte aus tokens.css aktiv.
   * @param {{ accent: string, background: string, surface: string, text: string }} theme
   */
  function applyTenantTheme(theme) {
    if (!theme) return;
    var root = document.documentElement;
    if (theme.accent) root.style.setProperty('--tv-accent', theme.accent);
    if (theme.background) root.style.setProperty('--tv-bg', theme.background);
    if (theme.surface) root.style.setProperty('--tv-surface', theme.surface);
    if (theme.text) root.style.setProperty('--tv-text', theme.text);
  }

  ns.tenantRegistryRef = function () {
    return window.ONLANG.tenantRegistry;
  };

  ns.TenantService = {
    DEFAULT_CUSTOMER_ID: DEFAULT_CUSTOMER_ID,
    getRequestedCustomerId: getRequestedCustomerId,
    getAvailableCustomerIds: getAvailableCustomerIds,
    loadTenantData: loadTenantData,
    applyTenantTheme: applyTenantTheme,
  };
})(window.ONLANG.tenant);
