// player-events.js
//
// Bindet AUSSCHLIESSLICH die sechs erlaubten nativen <video>-Events an
// bereitgestellte Handler: loadedmetadata, play, pause, ended, error,
// timeupdate. Keine weiteren Events werden verarbeitet.
//
// Klassisches <script>, KEIN ES-Modul (siehe player-state.js für die
// Begründung).

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  var ALLOWED_EVENTS = ['loadedmetadata', 'play', 'pause', 'ended', 'error', 'timeupdate'];

  /**
   * @param {HTMLVideoElement} videoEl
   * @param {Object<string, Function>} handlers - Schlüssel müssen aus
   *        ALLOWED_EVENTS stammen, alles andere wird ignoriert.
   * @returns {{ unbind: Function, ALLOWED_EVENTS: string[] }}
   */
  function bindPlayerEvents(videoEl, handlers) {
    var bound = {};

    ALLOWED_EVENTS.forEach(function (name) {
      var handler = handlers && handlers[name];
      if (typeof handler !== 'function') return;
      bound[name] = handler;
      videoEl.addEventListener(name, handler);
    });

    function unbind() {
      ALLOWED_EVENTS.forEach(function (name) {
        if (bound[name]) {
          videoEl.removeEventListener(name, bound[name]);
        }
      });
    }

    return { unbind: unbind, ALLOWED_EVENTS: ALLOWED_EVENTS };
  }

  ns.PlayerEvents = {
    ALLOWED_EVENTS: ALLOWED_EVENTS,
    bindPlayerEvents: bindPlayerEvents,
  };
})(window.ONLANG.player);
