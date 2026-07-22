// playlist-state.js
//
// Verwaltet AUSSCHLIESSLICH: items, currentIndex, status.
// Erlaubte Zustände: EMPTY, READY, PLAYING, FINISHED, ERROR — keine
// weiteren.
//
// Klassisches <script>, KEIN ES-Modul (siehe player-state.js im
// Player-Modul für die Begründung).

window.ONLANG = window.ONLANG || {};
window.ONLANG.playlist = window.ONLANG.playlist || {};

(function (ns) {
  'use strict';

  var STATUSES = Object.freeze({
    EMPTY: 'EMPTY',
    READY: 'READY',
    PLAYING: 'PLAYING',
    FINISHED: 'FINISHED',
    ERROR: 'ERROR',
  });

  function createPlaylistState() {
    var items = [];
    var currentIndex = -1;
    var status = STATUSES.EMPTY;

    // --- Öffentliche Funktionen (exakt wie vorgegeben) ---

    function getItems() {
      return items.slice();
    }

    function getCurrentIndex() {
      return currentIndex;
    }

    function getCurrentItem() {
      if (currentIndex < 0 || currentIndex >= items.length) return null;
      return items[currentIndex];
    }

    function setCurrentIndex(index) {
      if (index < 0 || index >= items.length) {
        throw new Error('[ONLANG Playlist] setCurrentIndex(): Index außerhalb des gültigen Bereichs: ' + index);
      }
      currentIndex = index;
    }

    function setStatus(next) {
      if (!Object.prototype.hasOwnProperty.call(STATUSES, next)) {
        throw new Error('[ONLANG Playlist] Unbekannter Status: "' + next + '"');
      }
      status = next;
    }

    function getStatus() {
      return status;
    }

    function hasNext() {
      return currentIndex >= 0 && currentIndex < items.length - 1;
    }

    function getNextIndex() {
      return hasNext() ? currentIndex + 1 : -1;
    }

    function reset() {
      currentIndex = -1;
      status = items.length > 0 ? STATUSES.READY : STATUSES.EMPTY;
    }

    // --- Zusätzlich benötigt, um items überhaupt befüllen zu können
    //     (nicht Teil der vorgegebenen Lese-/Steuer-API, aber
    //     notwendige Voraussetzung dafür). Wird ausschließlich von
    //     playlist-controller.js aufgerufen. ---
    function setItems(newItems) {
      items = Array.isArray(newItems) ? newItems.slice() : [];
      currentIndex = -1;
      status = items.length > 0 ? STATUSES.READY : STATUSES.EMPTY;
    }

    return {
      STATUSES: STATUSES,
      setItems: setItems,
      getItems: getItems,
      getCurrentIndex: getCurrentIndex,
      getCurrentItem: getCurrentItem,
      setCurrentIndex: setCurrentIndex,
      setStatus: setStatus,
      getStatus: getStatus,
      hasNext: hasNext,
      getNextIndex: getNextIndex,
      reset: reset,
    };
  }

  ns.PlaylistState = {
    STATUSES: STATUSES,
    createPlaylistState: createPlaylistState,
  };
})(window.ONLANG.playlist);
