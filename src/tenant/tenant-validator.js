// tenant-validator.js
//
// Prüft und bereinigt einen rohen Mandanten-Datensatz. Wirft NIE einen
// Fehler — fehlende oder ungültige Felder werden mit neutralen
// Standardwerten aus tenant-schema.js ergänzt, und jede Korrektur wird
// als Klartext-Hinweis in "warnings" zurückgegeben. Keine externe
// Validierungsbibliothek nötig.
//
// Ab Phase 5 klassisches <script> (kein ES-Modul mehr). Validiert
// zusätzlich zu den seit Schritt 1 bestehenden Feldern (unverändert:
// tenant.theme.{accent,background,surface,text}) die neuen, optionalen
// Branding-Felder sowie die Item-Struktur von videos/categories/
// partners/advertisements (siehe docs/DATA_MODEL.md).

window.ONLANG = window.ONLANG || {};
window.ONLANG.tenant = window.ONLANG.tenant || {};

(function (ns) {
  'use strict';

  var DEFAULT_TENANT_SCHEMA = ns.TenantSchema.DEFAULT_TENANT_SCHEMA;
  var VALID_ADVERTISING_MODES = ns.TenantSchema.VALID_ADVERTISING_MODES;
  var VALID_VIEW_MODES = ns.TenantSchema.VALID_VIEW_MODES;

  /**
   * @param {unknown} rawInput
   * @returns {{ data: object, warnings: string[] }}
   */
  function validateTenantData(rawInput) {
    var warnings = [];
    var raw = isPlainObject(rawInput) ? rawInput : {};

    if (!isPlainObject(rawInput)) {
      warnings.push('Eingabedaten waren kein gültiges Objekt — vollständiger Standard-Datensatz wird verwendet.');
    }

    var data = {
      tenant: validateTenantBlock(raw.tenant, warnings),
      settings: validateSettingsBlock(raw.settings, warnings),
      live: validateLiveBlock(raw.live, warnings),
      videos: validateVideoItems(raw.videos, warnings),
      categories: validateCategoryItems(raw.categories, warnings),
      partners: validatePartnerItems(raw.partners, warnings),
      advertisements: validateAdvertisementItems(raw.advertisements, warnings),
    };

    return { data: data, warnings: warnings };
  }

  function validateTenantBlock(input, warnings) {
    var fallback = DEFAULT_TENANT_SCHEMA.tenant;
    var t = isPlainObject(input) ? input : {};
    if (!isPlainObject(input)) {
      warnings.push('Feld "tenant" fehlte oder war ungültig — Standardwerte verwendet.');
    }

    var customerId = nonEmptyString(t.customerId, fallback.customerId, 'tenant.customerId', warnings);
    var name = nonEmptyString(t.name, fallback.name, 'tenant.name', warnings);
    var tagline = typeof t.tagline === 'string' ? t.tagline : fallback.tagline;
    var logoUrl = typeof t.logoUrl === 'string' ? t.logoUrl : fallback.logoUrl;
    var logoText = typeof t.logoText === 'string' ? t.logoText : fallback.logoText;

    var themeInput = isPlainObject(t.theme) ? t.theme : {};
    if (!isPlainObject(t.theme)) {
      warnings.push('Feld "tenant.theme" fehlte oder war ungültig — Standardfarben verwendet.');
    }
    var theme = {
      accent: typeof themeInput.accent === 'string' ? themeInput.accent : fallback.theme.accent,
      background: typeof themeInput.background === 'string' ? themeInput.background : fallback.theme.background,
      surface: typeof themeInput.surface === 'string' ? themeInput.surface : fallback.theme.surface,
      text: typeof themeInput.text === 'string' ? themeInput.text : fallback.theme.text,
    };

    // NEU (Phase 5, optional, additiv): Präsentiert-von-Sponsor.
    var presenterInput = isPlainObject(t.presenter) ? t.presenter : {};
    var presenter = {
      label: typeof presenterInput.label === 'string' ? presenterInput.label : fallback.presenter.label,
      name: typeof presenterInput.name === 'string' ? presenterInput.name : fallback.presenter.name,
      logoUrl: typeof presenterInput.logoUrl === 'string' ? presenterInput.logoUrl : fallback.presenter.logoUrl,
    };

    return { customerId: customerId, name: name, tagline: tagline, logoUrl: logoUrl, logoText: logoText, theme: theme, presenter: presenter };
  }

  function validateSettingsBlock(input, warnings) {
    var fallback = DEFAULT_TENANT_SCHEMA.settings;
    if (!isPlainObject(input)) {
      warnings.push('Feld "settings" fehlte oder war ungültig — Standardwerte verwendet.');
      return copy(fallback);
    }

    var defaultView = VALID_VIEW_MODES.indexOf(input.defaultView) !== -1 ? input.defaultView : fallback.defaultView;
    if (input.defaultView !== undefined && VALID_VIEW_MODES.indexOf(input.defaultView) === -1) {
      warnings.push('Feld "settings.defaultView" hatte einen ungültigen Wert ("' + input.defaultView + '") — Standardwert "' + fallback.defaultView + '" verwendet.');
    }

    var advertisingMode = VALID_ADVERTISING_MODES.indexOf(input.advertisingMode) !== -1 ? input.advertisingMode : fallback.advertisingMode;
    if (input.advertisingMode !== undefined && VALID_ADVERTISING_MODES.indexOf(input.advertisingMode) === -1) {
      warnings.push('Feld "settings.advertisingMode" hatte einen ungültigen Wert ("' + input.advertisingMode + '") — Standardwert "' + fallback.advertisingMode + '" verwendet.');
    }

    return {
      defaultView: defaultView,
      autoplay: booleanOrDefault(input.autoplay, fallback.autoplay),
      mutedAutoplay: booleanOrDefault(input.mutedAutoplay, fallback.mutedAutoplay),
      loopPlaylist: booleanOrDefault(input.loopPlaylist, fallback.loopPlaylist),
      advertisingMode: advertisingMode,
    };
  }

  function validateLiveBlock(input, warnings) {
    var fallback = DEFAULT_TENANT_SCHEMA.live;
    if (!isPlainObject(input)) {
      warnings.push('Feld "live" fehlte oder war ungültig — Standardwerte verwendet.');
      return copy(fallback);
    }
    return {
      enabled: booleanOrDefault(input.enabled, fallback.enabled),
      title: typeof input.title === 'string' ? input.title : fallback.title,
      date: typeof input.date === 'string' ? input.date : fallback.date,
      time: typeof input.time === 'string' ? input.time : fallback.time,
    };
  }

  // --- Item-Validierung (Phase 5, neu) -----------------------------
  // Ungültige EINZELNE Einträge werden übersprungen (mit Hinweis),
  // nicht die ganze Liste verworfen — "kein JS-Abbruch, restliche
  // Anwendung bleibt bedienbar" (bereits bewährtes Prinzip aus Schritt 3).

  function validateVideoItems(value, warnings) {
    var items = validateArrayField(value, 'videos', warnings);
    var result = [];
    items.forEach(function (item, index) {
      if (!isPlainObject(item) || !nonEmptyStringSilent(item.src) || !nonEmptyStringSilent(item.title)) {
        warnings.push('Eintrag videos[' + index + '] ungültig (title/src fehlen) — übersprungen.');
        return;
      }
      result.push({
        id: typeof item.id === 'string' ? item.id : 'video-' + index,
        title: item.title,
        description: typeof item.description === 'string' ? item.description : '',
        category: typeof item.category === 'string' ? item.category : '',
        durationLabel: typeof item.durationLabel === 'string' ? item.durationLabel : '--:--',
        src: item.src,
        badge: typeof item.badge === 'string' ? item.badge : null,
      });
    });
    return result;
  }

  function validateCategoryItems(value, warnings) {
    var items = validateArrayField(value, 'categories', warnings);
    var result = [];
    items.forEach(function (item, index) {
      if (!isPlainObject(item) || !nonEmptyStringSilent(item.label)) {
        warnings.push('Eintrag categories[' + index + '] ungültig (label fehlt) — übersprungen.');
        return;
      }
      result.push({
        id: typeof item.id === 'string' ? item.id : 'category-' + index,
        icon: typeof item.icon === 'string' ? item.icon : '',
        label: item.label,
        description: typeof item.description === 'string' ? item.description : '',
      });
    });
    return result;
  }

  function validatePartnerItems(value, warnings) {
    var items = validateArrayField(value, 'partners', warnings);
    var result = [];
    items.forEach(function (item, index) {
      if (!isPlainObject(item) || !nonEmptyStringSilent(item.name)) {
        warnings.push('Eintrag partners[' + index + '] ungültig (name fehlt) — übersprungen.');
        return;
      }
      result.push({
        id: typeof item.id === 'string' ? item.id : 'partner-' + index,
        name: item.name,
        logoUrl: typeof item.logoUrl === 'string' ? item.logoUrl : '',
        subtitle: typeof item.subtitle === 'string' ? item.subtitle : '',
      });
    });
    return result;
  }

  function validateAdvertisementItems(value, warnings) {
    var items = validateArrayField(value, 'advertisements', warnings);
    var result = [];
    items.forEach(function (item, index) {
      if (!isPlainObject(item) || !nonEmptyStringSilent(item.src) || !nonEmptyStringSilent(item.title)) {
        warnings.push('Eintrag advertisements[' + index + '] ungültig (title/src fehlen) — übersprungen.');
        return;
      }
      result.push({
        id: typeof item.id === 'string' ? item.id : 'ad-' + index,
        title: item.title,
        sponsor: typeof item.sponsor === 'string' ? item.sponsor : '',
        durationLabel: typeof item.durationLabel === 'string' ? item.durationLabel : '--:--',
        src: item.src,
        active: booleanOrDefault(item.active, false),
      });
    });
    return result;
  }

  function validateArrayField(value, fieldName, warnings) {
    if (Array.isArray(value)) return value;
    if (value !== undefined) {
      warnings.push('Feld "' + fieldName + '" war kein Array — leeres Array verwendet.');
    }
    return [];
  }

  function nonEmptyString(value, fallbackValue, fieldName, warnings) {
    if (typeof value === 'string' && value.trim() !== '') return value.trim();
    warnings.push('Feld "' + fieldName + '" fehlte oder war leer — Standardwert "' + fallbackValue + '" verwendet.');
    return fallbackValue;
  }

  function nonEmptyStringSilent(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function booleanOrDefault(value, fallbackValue) {
    return typeof value === 'boolean' ? value : fallbackValue;
  }

  function isPlainObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }

  function copy(obj) {
    var result = {};
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) result[key] = obj[key];
    }
    return result;
  }

  ns.TenantValidator = { validateTenantData: validateTenantData };
})(window.ONLANG.tenant);
