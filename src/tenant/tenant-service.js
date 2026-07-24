// tenant-service.js
//
// Verantwortlich für:
// - Kunden-ID aus der URL lesen
// - Bootstrap-Daten über die Netlify Function laden
// - Bootstrap-Antwort in das bestehende ONLANG-TV-Datenformat umwandeln
// - Daten über TenantValidator validieren
// - bei API-Fehlern auf lokale Demo-Daten zurückfallen
// - Theme des geladenen Mandanten anwenden
//
// WICHTIG:
// Diese Datei bleibt die EINZIGE Stelle, die weiß, woher
// Mandantendaten kommen.
//
// main.js, Views, Player, Playlist und Werbung bleiben dadurch
// unabhängig von der Datenquelle.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.tenant =
  window.ONLANG.tenant || {};

window.ONLANG.tenantRegistry =
  window.ONLANG.tenantRegistry || {};

(function (ns) {
  'use strict';

  var DEFAULT_CUSTOMER_ID =
    'DEFAULT';

  var BOOTSTRAP_API_URL =
    '/.netlify/functions/tv-bootstrap';


  /**
   * Liest die Kunden-ID aus der URL.
   *
   * Unterstützt:
   * ?kunde=V006
   * ?tenant=V006
   *
   * @param {Location} [location]
   * @returns {string}
   */
  function getRequestedCustomerId(location) {
    location =
      location || window.location;

    var params =
      new URLSearchParams(
        location.search
      );

    var kunde =
      params.get('kunde');

    if (
      kunde &&
      kunde.trim() !== ''
    ) {
      return kunde.trim();
    }

    var tenantAlias =
      params.get('tenant');

    if (
      tenantAlias &&
      tenantAlias.trim() !== ''
    ) {
      return tenantAlias.trim();
    }

    return DEFAULT_CUSTOMER_ID;
  }


  /**
   * Liefert alle lokal registrierten Kunden-IDs.
   *
   * Die lokale Registry bleibt als Fallback und für den bisherigen
   * Schnellwechsler erhalten.
   *
   * @returns {string[]}
   */
  function getAvailableCustomerIds() {
    return Object.keys(
      ns.tenantRegistryRef()
    );
  }


  /**
   * Lädt die Mandantendaten.
   *
   * Ablauf:
   *
   * 1. Bootstrap API versuchen
   * 2. Antwort adaptieren
   * 3. Daten validieren
   * 4. Bei Fehler lokale Registry verwenden
   *
   * @param {string} requestedCustomerId
   * @returns {Promise<object>}
   */
  function loadTenantData(
    requestedCustomerId
  ) {
    var requestedId =
      normalizeCustomerId(
        requestedCustomerId
      );

    /*
     * Unter file:// ist ein Fetch auf eine Netlify Function nicht
     * sinnvoll möglich.
     *
     * Deshalb wird beim lokalen Öffnen direkt die bisherige
     * Demo-Registry verwendet.
     */
    if (
      window.location &&
      window.location.protocol === 'file:'
    ) {
      return Promise.resolve(
        loadFromLocalRegistry(
          requestedId,
          'Lokaler file://-Betrieb — Bootstrap API wurde nicht aufgerufen.'
        )
      );
    }

    return loadFromBootstrapApi(
      requestedId
    ).catch(function (error) {
      var message =
        error &&
        error.message
          ? error.message
          : String(error);

      console.warn(
        '[ONLANG TV] Bootstrap API nicht verfügbar — lokaler Fallback wird verwendet.',
        error
      );

      return loadFromLocalRegistry(
        requestedId,
        'Bootstrap API konnte nicht geladen werden: ' +
          message
      );
    });
  }


  /**
   * Lädt Daten über die Netlify Function.
   *
   * @param {string} requestedId
   * @returns {Promise<object>}
   */
  function loadFromBootstrapApi(
    requestedId
  ) {
    var url =
      BOOTSTRAP_API_URL +
      '?kunde=' +
      encodeURIComponent(
        requestedId
      );

    console.info(
      '[ONLANG TV] Lade Bootstrap:',
      url
    );

    return fetch(
      url,
      {
        method: 'GET',
        headers: {
          Accept:
            'application/json'
        },
        cache:
          'no-store'
      }
    )
      .then(function (response) {
        if (!response.ok) {
          throw new Error(
            'HTTP ' +
              response.status
          );
        }

        return response.json();
      })
      .then(function (bootstrapResult) {
        if (
          !bootstrapResult ||
          bootstrapResult.success !== true
        ) {
          var apiMessage =
            getBootstrapErrorMessage(
              bootstrapResult
            );

          throw new Error(
            apiMessage
          );
        }

        var raw =
          adaptBootstrapResult(
            bootstrapResult
          );

        var validated =
          ns.TenantValidator
            .validateTenantData(
              raw
            );

        var apiWarnings =
          Array.isArray(
            bootstrapResult.warnings
          )
            ? bootstrapResult.warnings
            : [];

        return {
          requestedCustomerId:
            getBootstrapRequestedCustomerId(
              bootstrapResult,
              requestedId
            ),

          loadedCustomerId:
            getBootstrapLoadedCustomerId(
              bootstrapResult,
              raw,
              requestedId
            ),

          usedFallback:
            getBootstrapFallbackUsed(
              bootstrapResult
            ),

          data:
            validated.data,

          warnings:
            apiWarnings.concat(
              validated.warnings
            ),

          loadError:
            null,

          dataSource:
            'bootstrap-api'
        };
      });
  }


  /**
   * Wandelt die öffentliche Bootstrap-Struktur in das Format um,
   * das der bestehende TenantValidator und main.js erwarten.
   *
   * Bootstrap:
   *
   * {
   *   tenant,
   *   settings,
   *   playlist: { videos },
   *   advertising: { items },
   *   live
   * }
   *
   * Intern:
   *
   * {
   *   tenant,
   *   settings,
   *   videos,
   *   advertisements,
   *   live,
   *   categories,
   *   partners
   * }
   *
   * @param {object} bootstrapResult
   * @returns {object}
   */
  function adaptBootstrapResult(
    bootstrapResult
  ) {
    var playlist =
      isPlainObject(
        bootstrapResult.playlist
      )
        ? bootstrapResult.playlist
        : {};

    var advertising =
      isPlainObject(
        bootstrapResult.advertising
      )
        ? bootstrapResult.advertising
        : {};

    return {
      tenant:
        isPlainObject(
          bootstrapResult.tenant
        )
          ? bootstrapResult.tenant
          : {},

      settings:
        isPlainObject(
          bootstrapResult.settings
        )
          ? bootstrapResult.settings
          : {},

      live:
        isPlainObject(
          bootstrapResult.live
        )
          ? bootstrapResult.live
          : {},

      videos:
        Array.isArray(
          playlist.videos
        )
          ? playlist.videos
          : [],

      advertisements:
        Array.isArray(
          advertising.items
        )
          ? advertising.items
          : [],

      categories: [],
      partners: []
    };
  }


  /**
   * Lokaler Fallback auf die bisherige Registry.
   *
   * @param {string} requestedId
   * @param {string|null} previousError
   * @returns {object}
   */
  function loadFromLocalRegistry(
    requestedId,
    previousError
  ) {
    var loadedId =
      requestedId;

    var raw =
      lookupTenantRaw(
        requestedId
      );

    var loadError =
      previousError || null;

    if (raw === null) {
      var notFoundMessage =
        'Kein lokaler Datensatz gefunden für Kunden-ID "' +
        requestedId +
        '".';

      loadError =
        loadError
          ? loadError +
            ' | ' +
            notFoundMessage
          : notFoundMessage;

      loadedId =
        DEFAULT_CUSTOMER_ID;

      raw =
        lookupTenantRaw(
          DEFAULT_CUSTOMER_ID
        );

      if (raw === null) {
        loadError +=
          ' Zusätzlich konnte auch der lokale Standard-Datensatz "' +
          DEFAULT_CUSTOMER_ID +
          '" nicht gefunden werden.';
      }
    }

    var validated =
      ns.TenantValidator
        .validateTenantData(
          raw
        );

    return {
      requestedCustomerId:
        requestedId,

      loadedCustomerId:
        loadedId,

      usedFallback:
        loadedId !==
        requestedId,

      data:
        validated.data,

      warnings:
        validated.warnings,

      loadError:
        loadError,

      dataSource:
        'local-registry'
    };
  }


  /**
   * Sucht einen Mandanten in der lokalen Registry.
   *
   * Erst exakt, danach case-insensitiv.
   *
   * @param {string} customerId
   * @returns {object|null}
   */
  function lookupTenantRaw(customerId) {
    var registry =
      ns.tenantRegistryRef();

    if (
      Object.prototype
        .hasOwnProperty
        .call(
          registry,
          customerId
        )
    ) {
      return registry[
        customerId
      ];
    }

    var lowerTarget =
      String(
        customerId
      ).toLowerCase();

    for (var key in registry) {
      if (
        Object.prototype
          .hasOwnProperty
          .call(
            registry,
            key
          ) &&
        key.toLowerCase() ===
          lowerTarget
      ) {
        return registry[
          key
        ];
      }
    }

    return null;
  }


  /**
   * Ermittelt die angeforderte Kunden-ID aus der Bootstrap-Metastruktur.
   */
  function getBootstrapRequestedCustomerId(
    bootstrapResult,
    fallbackId
  ) {
    if (
      isPlainObject(
        bootstrapResult.meta
      ) &&
      typeof bootstrapResult
        .meta
        .requestedCustomerId ===
        'string' &&
      bootstrapResult
        .meta
        .requestedCustomerId
        .trim() !== ''
    ) {
      return bootstrapResult
        .meta
        .requestedCustomerId
        .trim();
    }

    return fallbackId;
  }


  /**
   * Ermittelt die tatsächlich geladene Kunden-ID.
   */
  function getBootstrapLoadedCustomerId(
    bootstrapResult,
    raw,
    fallbackId
  ) {
    if (
      isPlainObject(
        bootstrapResult.meta
      ) &&
      typeof bootstrapResult
        .meta
        .loadedCustomerId ===
        'string' &&
      bootstrapResult
        .meta
        .loadedCustomerId
        .trim() !== ''
    ) {
      return bootstrapResult
        .meta
        .loadedCustomerId
        .trim();
    }

    if (
      raw &&
      raw.tenant &&
      typeof raw
        .tenant
        .customerId ===
        'string' &&
      raw
        .tenant
        .customerId
        .trim() !== ''
    ) {
      return raw
        .tenant
        .customerId
        .trim();
    }

    return fallbackId;
  }


  /**
   * Liest das Fallback-Kennzeichen der Bootstrap API.
   */
  function getBootstrapFallbackUsed(
    bootstrapResult
  ) {
    return !!(
      isPlainObject(
        bootstrapResult.meta
      ) &&
      bootstrapResult
        .meta
        .fallbackUsed ===
        true
    );
  }


  /**
   * Baut eine verständliche Fehlermeldung aus einer Fehlerantwort.
   */
  function getBootstrapErrorMessage(
    bootstrapResult
  ) {
    if (
      bootstrapResult &&
      isPlainObject(
        bootstrapResult.error
      )
    ) {
      var code =
        typeof bootstrapResult
          .error
          .code ===
          'string'
          ? bootstrapResult
            .error
            .code
          : 'BOOTSTRAP_ERROR';

      var message =
        typeof bootstrapResult
          .error
          .message ===
          'string'
          ? bootstrapResult
            .error
            .message
          : 'Bootstrap API meldete einen Fehler.';

      return (
        code +
        ': ' +
        message
      );
    }

    return (
      'Bootstrap API lieferte keine erfolgreiche Antwort.'
    );
  }


  /**
   * Prüft, ob ein Wert ein einfaches JavaScript-Objekt ist.
   *
   * @param {*} value
   * @returns {boolean}
   */
  function isPlainObject(value) {
    return (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value)
    );
  }


  /**
   * Normalisiert eine Kunden-ID.
   */
  function normalizeCustomerId(value) {
    if (
      typeof value === 'string' &&
      value.trim() !== ''
    ) {
      return value.trim();
    }

    return DEFAULT_CUSTOMER_ID;
  }


  /**
   * Überträgt das Tenant-Theme auf die CSS-Variablen.
   *
   * @param {object} theme
   */
  function applyTenantTheme(theme) {
    if (!theme) {
      return;
    }

    var root =
      document.documentElement;

    if (theme.accent) {
      root.style.setProperty(
        '--tv-accent',
        theme.accent
      );
    }

    if (theme.background) {
      root.style.setProperty(
        '--tv-bg',
        theme.background
      );
    }

    if (theme.surface) {
      root.style.setProperty(
        '--tv-surface',
        theme.surface
      );
    }

    if (theme.text) {
      root.style.setProperty(
        '--tv-text',
        theme.text
      );
    }
  }


  /**
   * Liefert die lokale Demo-Registry.
   */
  ns.tenantRegistryRef =
    function () {
      return window.ONLANG
        .tenantRegistry;
    };


  ns.TenantService = {
    DEFAULT_CUSTOMER_ID:
      DEFAULT_CUSTOMER_ID,

    BOOTSTRAP_API_URL:
      BOOTSTRAP_API_URL,

    getRequestedCustomerId:
      getRequestedCustomerId,

    getAvailableCustomerIds:
      getAvailableCustomerIds,

    loadTenantData:
      loadTenantData,

    applyTenantTheme:
      applyTenantTheme
  };

})(window.ONLANG.tenant);
