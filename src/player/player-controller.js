// player-controller.js
//
// Öffentliche API des ONLANG Media Players. Ist vollständig unabhängig
// von Playlist, Werbung, Studio, Google Sheets und BBK — siehe
// docs/ARCHITECTURE.md, Abschnitt "Media Player — Unabhängigkeit".
//
// Öffentliche API (Schritt 2, unverändert bestehen geblieben):
//   load(video)      Video laden
//   play()           Video starten
//   pause()           Pause
//   stop()            Stop (pause() + currentTime = 0)
//   currentTime       aktuelle Zeit (Getter-Property)
//   duration          Gesamtlänge (Getter-Property)
//   state             aktueller Status (Getter-Property, siehe player-state.js)
//
// Ergänzt in Schritt 3 (rein additiv, siehe docs/ARCHITECTURE.md):
//   getState()        wie "state", als aufrufbare Methode
//   getCurrentTime()  wie "currentTime", als aufrufbare Methode
//   getDuration()     wie "duration", als aufrufbare Methode
//   on(eventName, cb) Abo für die sechs erlaubten Roh-Events
//                     (loadedmetadata, play, pause, ended, error,
//                     timeupdate) — von der Playlist genutzt, um ohne
//                     direkten Video-Zugriff auf "ended"/"error" zu
//                     reagieren.
//
// Kein Autoplay, keine Werbung, keine Schleifen, keine Playlist, keine
// Timer, kein automatisches Nachladen — ausdrücklich nicht enthalten.
//
// Klassisches <script>, KEIN ES-Modul (siehe player-state.js für die
// Begründung).

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  /**
   * @param {HTMLVideoElement} videoEl
   */
  function createPlayerController(videoEl) {
    if (!videoEl) {
      throw new Error('[ONLANG Player] createPlayerController benötigt ein <video>-Element.');
    }

    var state = ns.PlayerState.createPlayerState();
    var STATES = state.STATES;
    var timeListeners = [];
    var eventBinding = null;

    // --- Generisches Event-Abo für externe Module (z.B. Playlist,
    //     siehe docs/ARCHITECTURE.md, Abschnitt "Media Player —
    //     Unabhängigkeit"). Rein additiv zu onStateChange/onTimeUpdate,
    //     ändert nichts an der bestehenden State-Logik. Erlaubt sind
    //     ausschließlich dieselben sechs Events wie in player-events.js.
    var rawEventListeners = {
      loadedmetadata: [],
      play: [],
      pause: [],
      ended: [],
      error: [],
      timeupdate: [],
    };

    function on(eventName, callback) {
      if (!Object.prototype.hasOwnProperty.call(rawEventListeners, eventName)) {
        throw new Error(
          '[ONLANG Player] on(): unbekanntes Event "' + eventName + '". Erlaubt: ' +
          Object.keys(rawEventListeners).join(', ')
        );
      }
      if (typeof callback !== 'function') return;
      rawEventListeners[eventName].push(callback);
    }

    function emit(eventName) {
      var list = rawEventListeners[eventName];
      for (var i = 0; i < list.length; i += 1) {
        list[i]();
      }
    }

    // --- Event-Handler: State-Übergänge entstehen AUSSCHLIESSLICH aus
    //     den sechs erlaubten echten Video-Events, nicht aus Timern
    //     oder sonstiger Zusatzlogik. ---

    function handleLoadedMetadata() {
      if (state.get() === STATES.LOADING) {
        state.set(STATES.READY);
      }
      notifyTime();
      emit('loadedmetadata');
    }

    function handlePlay() {
      state.set(STATES.PLAYING);
      emit('play');
    }

    function handlePause() {
      // Das "ended"-Event übernimmt den Endzustand eigenständig; ein
      // reines pause() (auch durch stop() ausgelöst) führt zu PAUSED.
      //
      // Bugfix (gefunden in Schritt 4): Browser feuern nach einem
      // fehlgeschlagenen Ladeversuch zusätzlich zum "error"-Event auch
      // ein "pause"-Event (video.paused wird true). Ohne diese Prüfung
      // würde das den bereits gesetzten ERROR-Status fälschlich wieder
      // auf PAUSED zurücksetzen.
      if (!videoEl.ended && !videoEl.error) {
        state.set(STATES.PAUSED);
      }
      emit('pause');
    }

    function handleEnded() {
      state.set(STATES.ENDED);
      emit('ended');
    }

    function handleError() {
      state.set(STATES.ERROR);
      emit('error');
    }

    function handleTimeUpdate() {
      notifyTime();
      emit('timeupdate');
    }

    function notifyTime() {
      for (var i = 0; i < timeListeners.length; i += 1) {
        timeListeners[i]();
      }
    }

    function ensureEventsBound() {
      if (eventBinding) return;
      eventBinding = ns.PlayerEvents.bindPlayerEvents(videoEl, {
        loadedmetadata: handleLoadedMetadata,
        play: handlePlay,
        pause: handlePause,
        ended: handleEnded,
        error: handleError,
        timeupdate: handleTimeUpdate,
      });
    }

    // --- Öffentliche API ---

    /**
     * Lädt ein Video. Nimmt entweder direkt einen Quellen-String oder
     * ein Objekt mit einem "source"-Feld entgegen (Vorbereitung für
     * spätere Playlist-Einträge, siehe docs/ROADMAP.md Phase 3 — hier
     * in Schritt 2 noch nicht genutzt).
     * @param {string | { source: string }} video
     */
    function load(video) {
      var src = typeof video === 'string' ? video : (video && video.source);

      ensureEventsBound();

      if (!src) {
        state.set(STATES.ERROR);
        return;
      }

      state.set(STATES.LOADING);
      videoEl.src = src;
      videoEl.load();
    }

    function play() {
      var playPromise = videoEl.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
          // Wiedergabe konnte nicht gestartet werden (z.B. keine gültige
          // Quelle geladen) -> ERROR, kein unbehandelter Promise-Fehler.
          state.set(STATES.ERROR);
        });
      }
    }

    function pause() {
      videoEl.pause();
    }

    /**
     * Stop: ausschließlich pause() + currentTime = 0. Keine Automatik,
     * kein Nachladen, kein Zurücksetzen der Quelle.
     */
    function stop() {
      videoEl.pause();
      videoEl.currentTime = 0;
      notifyTime();
    }

    /**
     * Liefert eine lesbare Fehlermeldung für den aktuellen Fehlerfall.
     * Wird von player-ui.js verwendet, um z.B. "Kein Testvideo
     * gefunden." anzuzeigen, ohne dass die UI die MediaError-Codes
     * selbst kennen muss.
     */
    function getErrorMessage() {
      var mediaError = videoEl.error;
      if (!mediaError) {
        return 'Video konnte nicht geladen werden.';
      }
      switch (mediaError.code) {
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED — deckt auch "Datei nicht gefunden" ab
          return 'Kein Testvideo gefunden.';
        case 3:
          return 'Video konnte nicht dekodiert werden.';
        case 2:
          return 'Netzwerkfehler beim Laden des Videos.';
        case 1:
          return 'Laden des Videos wurde abgebrochen.';
        default:
          return 'Unbekannter Fehler beim Laden des Videos.';
      }
    }

    return {
      load: load,
      play: play,
      pause: pause,
      stop: stop,
      get currentTime() {
        return videoEl.currentTime || 0;
      },
      get duration() {
        return isFinite(videoEl.duration) ? videoEl.duration : 0;
      },
      get state() {
        return state.get();
      },
      // Methoden-Varianten derselben Werte (siehe docs/ARCHITECTURE.md,
      // Abschnitt "Media Player — Öffentliche API ab Schritt 3"). Rein
      // additiv — die obigen Getter bleiben unverändert bestehen.
      getState: function () {
        return state.get();
      },
      getCurrentTime: function () {
        return videoEl.currentTime || 0;
      },
      getDuration: function () {
        return isFinite(videoEl.duration) ? videoEl.duration : 0;
      },
      onStateChange: state.onChange,
      onTimeUpdate: function (fn) {
        timeListeners.push(fn);
      },
      // Generisches Event-Abo für externe Module, siehe on()/emit() oben.
      on: on,
      getErrorMessage: getErrorMessage,
      STATES: STATES,
    };
  }

  ns.PlayerController = { createPlayerController: createPlayerController };
})(window.ONLANG.player);
