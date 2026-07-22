// playlist-controller.js
//
// Steuert AUSSCHLIESSLICH den Playlist-Zustand (Auswahl, Gültigkeit,
// Fehler). Verwaltet ab Schritt 4 KEINE Player-Kopplung mehr — die
// Playlist kennt weder den Player noch die Werbung. Das tatsächliche
// Laden/Starten von Videos übernimmt ausschließlich
// src/playback/playback-flow-controller.js über die öffentlichen APIs
// von Player und Playlist. Siehe docs/ARCHITECTURE.md, Abschnitt
// "Playlist — Unabhängigkeit" (aktualisiert für Schritt 4).
//
// Öffentliche API (Kern wie in Schritt 3 vorgegeben):
//   load(items)
//   select(index)
//   reset()
//   getCurrentItem()
//   getCurrentIndex()
//
// Geändert in Schritt 4: playSelected()/playNext() entfallen, da sie
// in Schritt 3 direkt den Player aufriefen — das widerspricht der neuen
// Architekturregel ("nur der PlaybackFlowController kennt den Player").
// Diese Verantwortung liegt jetzt vollständig beim Flow-Controller.
// Zusätzlich ergänzt: hasNext(), getNextIndex(), finish(), markError()
// — werden vom Flow-Controller benötigt, um den Ablauf zu steuern, ohne
// dass die Playlist selbst etwas vom Player weiß.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.playlist = window.ONLANG.playlist || {};

(function (ns) {
  'use strict';

  function createPlaylistController() {
    var state = ns.PlaylistState.createPlaylistState();
    var STATUSES = state.STATUSES;
    var changeListeners = [];

    function notifyChange() {
      for (var i = 0; i < changeListeners.length; i += 1) {
        changeListeners[i]();
      }
    }

    function isValidItem(item) {
      return !!item &&
        typeof item.src === 'string' && item.src.trim() !== '' &&
        typeof item.title === 'string' && item.title.trim() !== '';
    }

    /**
     * Lädt eine neue Playlist und wählt automatisch den ersten Eintrag
     * aus (nur Zustand/Validierung — KEIN Player-Zugriff).
     * @param {Array} items
     */
    function load(items) {
      state.setItems(items);

      if (state.getItems().length === 0) {
        state.setStatus(STATUSES.EMPTY);
        notifyChange();
        return;
      }

      select(0);
    }

    /**
     * Wählt einen Playlist-Eintrag aus und validiert ihn. Lädt NICHTS
     * in einen Player — das übernimmt der PlaybackFlowController im
     * Anschluss über die Player-API.
     * @param {number} index
     */
    function select(index) {
      var items = state.getItems();
      if (index < 0 || index >= items.length) return;

      var item = items[index];
      state.setCurrentIndex(index);
      state.setStatus(isValidItem(item) ? STATUSES.READY : STATUSES.ERROR);
      notifyChange();
    }

    /**
     * Markiert den aktuell ausgewählten Eintrag als fehlerhaft, ohne
     * die Auswahl zu ändern (z.B. wenn der Player beim Laden einer an
     * sich gültig aussehenden Quelle ein echtes "error"-Event meldet).
     */
    function markError() {
      state.setStatus(STATUSES.ERROR);
      notifyChange();
    }

    /**
     * Markiert die Playlist als vollständig abgespielt (nach dem
     * letzten Inhaltsvideo). Ändert die Auswahl NICHT — kein Sprung zu
     * Video 1.
     */
    function finish() {
      state.setStatus(STATUSES.FINISHED);
      notifyChange();
    }

    function reset() {
      state.reset();
      notifyChange();
    }

    return {
      load: load,
      select: select,
      reset: reset,
      finish: finish,
      markError: markError,
      getCurrentItem: state.getCurrentItem,
      getCurrentIndex: state.getCurrentIndex,
      hasNext: state.hasNext,
      getNextIndex: state.getNextIndex,
      // Zusätzliche Lesezugriffe (bereits seit Schritt 3), notwendig
      // für playlist-ui.js:
      getItems: state.getItems,
      getStatus: state.getStatus,
      STATUSES: STATUSES,
      onChange: function (fn) {
        changeListeners.push(fn);
      },
    };
  }

  ns.PlaylistController = { createPlaylistController: createPlaylistController };
})(window.ONLANG.playlist);
