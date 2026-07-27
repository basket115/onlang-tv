// i18n-service.js
//
// Zentraler, framework- und DOM-freier Übersetzungsdienst. Kennt weder
// Bootstrap noch Player, Playlist, Werbung oder Views — ausschließlich
// die aktuell gewählte Sprache und die Übersetzungstabelle aus
// translations.js. Kein Zugriff auf localStorage, keine URL-Parameter,
// keine sonstigen Seiteneffekte außer der intern gehaltenen aktuellen
// Sprache (siehe docs/ARCHITECTURE.md, Abschnitt "Mehrsprachigkeit").
//
// Unterstützte interne Werte: "DE" / "HU" / "EN". Ausgangssprache ist
// immer "DE".
//
// Öffentliche API:
//   setLanguage(language)      -> normalisiert und setzt die Sprache,
//                                  gibt den normalisierten Wert zurück
//   getLanguage()               -> aktuell aktiver, normalisierter Wert
//   translate(key) / t(key)     -> übersetzter Text, mit Fallback
//                                  gewählte Sprache -> DE -> Schlüssel
//   isSupported(language)       -> true für normalisierte Codes UND für
//                                  normalisierbare Aliasse (z.B. "de"),
//                                  aber NICHT für Werte, die nur wegen
//                                  des Sicherheits-Fallbacks auf "DE"
//                                  landen würden (z.B. "FR")
//   normalizeLanguage(language) -> "DE"/"HU"/"EN", ungültige oder leere
//                                  Werte fallen auf "DE" zurück
//   getLocale()                  -> additiv, z.B. "de-DE"/"hu-HU"/"en-GB"
//                                  (für spätere Datum-/Zeitformatierung)
//
// Klassisches <script>, KEIN ES-Modul — gleiches Namespace-Muster wie
// alle übrigen Module (window.ONLANG.<bereich>.<Modul>).

window.ONLANG = window.ONLANG || {};
window.ONLANG.i18n = window.ONLANG.i18n || {};

(function (ns) {
  'use strict';

  var SUPPORTED_LANGUAGES = ['DE', 'HU', 'EN'];
  var DEFAULT_LANGUAGE = 'DE';

  // Bekannte Aliasse -> normalisierter interner Wert. Groß-/
  // Kleinschreibung wird beim Nachschlagen ignoriert (siehe
  // normalizeLanguage()/isSupported() unten), Schlüssel hier deshalb
  // durchgängig klein geschrieben. "-"/"_" als Trenner werden beide
  // unterstützt (z.B. "de-DE" und "de_DE").
  var LANGUAGE_ALIASES = {
    de: 'DE',
    'de-de': 'DE',
    de_de: 'DE',
    deutsch: 'DE',
    german: 'DE',

    hu: 'HU',
    'hu-hu': 'HU',
    hu_hu: 'HU',
    magyar: 'HU',
    ungarisch: 'HU',
    hungarian: 'HU',

    en: 'EN',
    'en-gb': 'EN',
    'en-us': 'EN',
    en_gb: 'EN',
    en_us: 'EN',
    english: 'EN',
    englisch: 'EN',
  };

  var LOCALES = {
    DE: 'de-DE',
    HU: 'hu-HU',
    EN: 'en-GB',
  };

  var currentLanguage = DEFAULT_LANGUAGE;

  /**
   * Normalisiert einen beliebigen Sprachwert. Nicht-String-Werte, leere
   * Strings und unbekannte Werte fallen sicher auf "DE" zurück — eine
   * ungültige Sprache darf ONLANG TV nie am Start hindern.
   * @param {*} value
   * @returns {'DE'|'HU'|'EN'}
   */
  function normalizeLanguage(value) {
    if (typeof value !== 'string') return DEFAULT_LANGUAGE;

    var trimmed = value.trim();
    if (trimmed === '') return DEFAULT_LANGUAGE;

    var upper = trimmed.toUpperCase();
    if (SUPPORTED_LANGUAGES.indexOf(upper) !== -1) return upper;

    var aliasKey = trimmed.toLowerCase();
    if (Object.prototype.hasOwnProperty.call(LANGUAGE_ALIASES, aliasKey)) {
      return LANGUAGE_ALIASES[aliasKey];
    }

    return DEFAULT_LANGUAGE;
  }

  /**
   * Prüft, ob ein Wert entweder bereits ein normalisierter Code oder ein
   * bekannter, normalisierbarer Alias ist. Bewusst NICHT einfach
   * "normalizeLanguage(value) ist gültig", da normalizeLanguage() aus
   * Sicherheitsgründen JEDEN unbekannten Wert auf "DE" abbildet — sonst
   * würde z.B. isSupported("FR") fälschlich true liefern.
   * @param {*} value
   * @returns {boolean}
   */
  function isSupported(value) {
    if (typeof value !== 'string') return false;

    var trimmed = value.trim();
    if (trimmed === '') return false;

    var upper = trimmed.toUpperCase();
    if (SUPPORTED_LANGUAGES.indexOf(upper) !== -1) return true;

    return Object.prototype.hasOwnProperty.call(LANGUAGE_ALIASES, trimmed.toLowerCase());
  }

  /**
   * Setzt die aktive Sprache. Der übergebene Wert wird normalisiert —
   * ein ungültiger Wert setzt die Sprache auf "DE", wirft aber nie einen
   * Fehler.
   * @param {*} language
   * @returns {'DE'|'HU'|'EN'} der tatsächlich gesetzte, normalisierte Wert
   */
  function setLanguage(language) {
    currentLanguage = normalizeLanguage(language);
    return currentLanguage;
  }

  /**
   * @returns {'DE'|'HU'|'EN'} aktuell aktive, normalisierte Sprache
   */
  function getLanguage() {
    return currentLanguage;
  }

  /**
   * Liest einen verschachtelten Schlüssel ("bereich.name") aus einer
   * Sprachtabelle. Liefert undefined, wenn der Pfad nicht existiert oder
   * nicht auf einen String zeigt (z.B. auf ein Zwischenobjekt).
   * @param {object} table
   * @param {string[]} pathParts
   * @returns {string|undefined}
   */
  function lookup(table, pathParts) {
    var node = table;
    for (var i = 0; i < pathParts.length; i += 1) {
      if (node && typeof node === 'object' && Object.prototype.hasOwnProperty.call(node, pathParts[i])) {
        node = node[pathParts[i]];
      } else {
        return undefined;
      }
    }
    return typeof node === 'string' ? node : undefined;
  }

  /**
   * Übersetzt einen Schlüssel. Fallback-Reihenfolge: aktive Sprache ->
   * DE -> der Schlüssel selbst. Ein leerer oder nicht-String-Schlüssel
   * wird sicher behandelt (kein Fehler, unverändert zurückgegeben).
   * @param {string} key - z.B. "status.advertising"
   * @returns {string}
   */
  function translate(key) {
    if (typeof key !== 'string' || key === '') return key;

    var pathParts = key.split('.');
    var translations = ns.Translations.TRANSLATIONS;

    var direct = lookup(translations[currentLanguage], pathParts);
    if (direct !== undefined) return direct;

    if (currentLanguage !== DEFAULT_LANGUAGE) {
      var fallback = lookup(translations[DEFAULT_LANGUAGE], pathParts);
      if (fallback !== undefined) return fallback;
    }

    return key;
  }

  /**
   * Liefert das für Date/Intl-Formatierung passende Locale-Kürzel zur
   * aktuell aktiven Sprache (additiv, für eine spätere Anbindung der
   * Datum-/Uhrzeit-Anzeige).
   * @returns {string}
   */
  function getLocale() {
    return LOCALES[currentLanguage] || LOCALES[DEFAULT_LANGUAGE];
  }

  ns.I18nService = {
    setLanguage: setLanguage,
    getLanguage: getLanguage,
    translate: translate,
    t: translate,
    isSupported: isSupported,
    normalizeLanguage: normalizeLanguage,
    getLocale: getLocale,
    SUPPORTED_LANGUAGES: SUPPORTED_LANGUAGES.slice(),
    DEFAULT_LANGUAGE: DEFAULT_LANGUAGE,
  };
})(window.ONLANG.i18n);
