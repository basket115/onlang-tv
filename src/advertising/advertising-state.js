// advertising-state.js
//
// Verwaltet AUSSCHLIESSLICH: status, aktueller Werbespot.
// Erlaubte Zustände: DISABLED, READY, PLAYING, FINISHED, ERROR — keine
// weiteren.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.advertising = window.ONLANG.advertising || {};

(function (ns) {
  'use strict';

  var STATUSES = Object.freeze({
    DISABLED: 'DISABLED',
    READY: 'READY',
    PLAYING: 'PLAYING',
    FINISHED: 'FINISHED',
    ERROR: 'ERROR',
  });

  function createAdvertisingState() {
    var status = STATUSES.DISABLED;
    var currentAdvertisement = null;

    function setStatus(next) {
      if (!Object.prototype.hasOwnProperty.call(STATUSES, next)) {
        throw new Error('[ONLANG Advertising] Unbekannter Status: "' + next + '"');
      }
      status = next;
    }

    function getStatus() {
      return status;
    }

    function setCurrentAdvertisement(advertisement) {
      currentAdvertisement = advertisement || null;
    }

    function getCurrentAdvertisement() {
      return currentAdvertisement;
    }

    function reset() {
      status = STATUSES.DISABLED;
      currentAdvertisement = null;
    }

    return {
      STATUSES: STATUSES,
      setStatus: setStatus,
      getStatus: getStatus,
      setCurrentAdvertisement: setCurrentAdvertisement,
      getCurrentAdvertisement: getCurrentAdvertisement,
      reset: reset,
    };
  }

  ns.AdvertisingState = {
    STATUSES: STATUSES,
    createAdvertisingState: createAdvertisingState,
  };
})(window.ONLANG.advertising);
