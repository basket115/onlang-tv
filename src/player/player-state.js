// player-state.js
//
// Definiert die Zustandsmaschine des ONLANG Media Players.
// AUSSCHLIESSLICH diese sieben Zustände sind erlaubt — keine weiteren.
//
// Klassisches <script>, KEIN ES-Modul: läuft direkt über file://
// (siehe docs/ARCHITECTURE.md, Abschnitt "Kein Build-Schritt nötig").
// Alle Player-Dateien hängen sich an das gemeinsame Namespace-Objekt
// window.ONLANG.player an, um Reihenfolge-Abhängigkeiten sauber zu
// halten, ohne import/export zu benötigen.

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  var STATES = Object.freeze({
    IDLE: 'IDLE',
    LOADING: 'LOADING',
    READY: 'READY',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    ENDED: 'ENDED',
    ERROR: 'ERROR',
  });

  /**
   * Erstellt einen kleinen, in sich geschlossenen Zustandshalter mit
   * Änderungsbenachrichtigung. Kennt nur die sieben STATES oben —
   * ein Aufruf mit einem unbekannten Wert wirft bewusst einen Fehler,
   * damit sich niemals versehentlich ein achter Zustand einschleicht.
   */
  function createPlayerState() {
    var current = STATES.IDLE;
    var listeners = [];

    function get() {
      return current;
    }

    function set(next) {
      if (!Object.prototype.hasOwnProperty.call(STATES, next)) {
        throw new Error('[ONLANG Player] Unbekannter Status: "' + next + '"');
      }
      if (current === next) return;
      current = next;
      for (var i = 0; i < listeners.length; i += 1) {
        listeners[i](current);
      }
    }

    function onChange(fn) {
      listeners.push(fn);
    }

    return {
      get: get,
      set: set,
      onChange: onChange,
      STATES: STATES,
    };
  }

  ns.PlayerState = {
    STATES: STATES,
    createPlayerState: createPlayerState,
  };
})(window.ONLANG.player);
