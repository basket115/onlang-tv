// advertising-controller.js
//
// Das Werbemodul entscheidet NUR: ob ein aktiver Spot vorhanden ist,
// welcher Spot verwendet wird, ob die Daten gültig sind. Es startet
// KEIN Video selbst und kennt weder Player noch Playlist — siehe
// docs/ARCHITECTURE.md, Abschnitt "Werbemodul — Unabhängigkeit".
//
// Öffentliche API (exakt wie vorgegeben):
//   load(advertisements)
//   getActiveAdvertisement()
//   hasActiveAdvertisement()
//   prepare()
//   reset()
//   getStatus()
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.advertising = window.ONLANG.advertising || {};

(function (ns) {
  'use strict';

  function isValidAdvertisement(ad) {
    return !!ad &&
      typeof ad.src === 'string' && ad.src.trim() !== '' &&
      typeof ad.title === 'string' && ad.title.trim() !== '';
  }

  function createAdvertisingController() {
    var state = ns.AdvertisingState.createAdvertisingState();
    var STATUSES = state.STATUSES;
    var advertisements = [];

    function findActiveAdvertisement() {
      for (var i = 0; i < advertisements.length; i += 1) {
        if (advertisements[i] && advertisements[i].active) {
          return advertisements[i];
        }
      }
      return null;
    }

    /**
     * Lädt die Werbedaten und ermittelt den aktiven Spot (erster
     * Eintrag mit active === true). Prüft die Gültigkeit, startet
     * aber nichts.
     * @param {Array} newAdvertisements
     */
    function load(newAdvertisements) {
      advertisements = Array.isArray(newAdvertisements) ? newAdvertisements.slice() : [];
      var active = findActiveAdvertisement();

      if (!active) {
        state.setCurrentAdvertisement(null);
        state.setStatus(STATUSES.DISABLED);
        return;
      }

      state.setCurrentAdvertisement(active);
      state.setStatus(isValidAdvertisement(active) ? STATUSES.READY : STATUSES.ERROR);
    }

    function getActiveAdvertisement() {
      return state.getCurrentAdvertisement();
    }

    /**
     * @returns {boolean} true, wenn ein gültiger, aktiver Spot vorhanden
     *          ist, der abgespielt werden kann.
     */
    function hasActiveAdvertisement() {
      return state.getCurrentAdvertisement() !== null && state.getStatus() !== STATUSES.DISABLED && state.getStatus() !== STATUSES.ERROR;
    }

    /**
     * Bestätigt die Bereitschaft des aktuell aktiven Spots (reiner
     * Zustandswechsel, kein Video-/Player-Zugriff). Wird vom
     * PlaybackFlowController vor jedem Werbeeinsatz aufgerufen.
     */
    function prepare() {
      var active = state.getCurrentAdvertisement();
      if (!active) {
        state.setStatus(STATUSES.DISABLED);
        return;
      }
      state.setStatus(isValidAdvertisement(active) ? STATUSES.READY : STATUSES.ERROR);
    }

    function reset() {
      state.reset();
      load(advertisements);
    }

    function getStatus() {
      return state.getStatus();
    }

    return {
      load: load,
      getActiveAdvertisement: getActiveAdvertisement,
      hasActiveAdvertisement: hasActiveAdvertisement,
      prepare: prepare,
      reset: reset,
      getStatus: getStatus,
      // Zusätzlich benötigt (analog zur Erweiterung von
      // playlist-controller.js in Schritt 3): der PlaybackFlowController
      // ist die einzige Instanz, die tatsächliches Abspielen/Enden über
      // den Player mitbekommt, und muss den Werbestatus entsprechend
      // auf PLAYING/FINISHED nachführen können.
      setStatus: state.setStatus,
      STATUSES: STATUSES,
    };
  }

  ns.AdvertisingController = { createAdvertisingController: createAdvertisingController };
})(window.ONLANG.advertising);
