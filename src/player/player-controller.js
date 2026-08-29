// player-controller.js
//
// Öffentliche API des ONLANG Media Players.
// Vollständig unabhängig von Playlist, Werbung, Studio, Google Sheets
// und BBK.
//
// Unterstützt Videoquellen als:
//   - direkter String
//   - { source: '...' }
//   - { src: '...' }
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  /**
   * @param {HTMLVideoElement} videoEl
   */
  function createPlayerController(videoEl) {
    if (!videoEl) {
      throw new Error(
        '[ONLANG Player] createPlayerController benötigt ein <video>-Element.'
      );
    }

    var state = ns.PlayerState.createPlayerState();
    var STATES = state.STATES;
    var timeListeners = [];
    var eventBinding = null;

    var rawEventListeners = {
      loadedmetadata: [],
      play: [],
      pause: [],
      ended: [],
      error: [],
      timeupdate: []
    };

    function on(eventName, callback) {
      if (!Object.prototype.hasOwnProperty.call(rawEventListeners, eventName)) {
        throw new Error(
          '[ONLANG Player] on(): unbekanntes Event "' +
          eventName +
          '". Erlaubt: ' +
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

    // ============================================================
    // VIDEO-EVENTS
    // ============================================================

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
        timeupdate: handleTimeUpdate
      });
    }


    // ============================================================
    // QUELLE ERMITTELN
    // ============================================================

    function getVideoSource(video) {
      if (typeof video === 'string') {
        return video.trim();
      }

      if (!video || typeof video !== 'object') {
        return '';
      }

      // Neue Bootstrap-Struktur
      if (typeof video.src === 'string' && video.src.trim() !== '') {
        return video.src.trim();
      }

      // Alte Player-/Playlist-Struktur
      if (typeof video.source === 'string' && video.source.trim() !== '') {
        return video.source.trim();
      }

      return '';
    }


    // ============================================================
    // URL NORMALISIEREN
    // ============================================================

    function normaliseVideoSource(src) {
      if (!src) return '';

      try {
        // Absolute URLs bleiben unverändert.
        if (/^https?:\/\//i.test(src)) {
          return src;
        }

        // Relative URL sauber gegen die aktuelle Website auflösen.
        return new URL(src, window.location.href).href;

      } catch (e) {
        return src;
      }
    }


    // ============================================================
    // ÖFFENTLICHE API
    // ============================================================

    /**
     * Lädt ein Video.
     *
     * Unterstützt:
     *   load('https://...')
     *   load({ source: '...' })
     *   load({ src: '...' })
     */
    function load(video) {
      ensureEventsBound();

      var rawSrc = getVideoSource(video);
      var src = normaliseVideoSource(rawSrc);

      if (!src) {
        console.error(
          '[ONLANG Player] Keine Videoquelle gefunden:',
          video
        );

        state.set(STATES.ERROR);
        return;
      }

      console.log(
        '[ONLANG Player] Lade Video:',
        src
      );

      state.set(STATES.LOADING);

      // Alte Quelle sauber entfernen.
      videoEl.pause();
      videoEl.removeAttribute('src');

      // Neue Quelle setzen.
      videoEl.src = src;

      videoEl.load();
    }


    function play() {
      var playPromise = videoEl.play();

      if (
        playPromise &&
        typeof playPromise.catch === 'function'
      ) {
        playPromise.catch(function (error) {
          console.warn(
            '[ONLANG Player] Wiedergabe konnte nicht gestartet werden:',
            error
          );

          state.set(STATES.ERROR);
        });
      }
    }


    function pause() {
      videoEl.pause();
    }


    /**
     * Stop = Pause + zurück auf Anfang.
     */
    function stop() {
      videoEl.pause();

      try {
        videoEl.currentTime = 0;
      } catch (e) {
        // Kein Fehler nach außen.
      }

      notifyTime();
    }


    /**
     * Liefert eine lesbare Fehlermeldung.
     */
    function getErrorMessage() {
      var mediaError = videoEl.error;

      if (!mediaError) {
        return 'Video konnte nicht geladen werden.';
      }

      switch (mediaError.code) {

        case 4:
          return 'Videoquelle wurde nicht gefunden oder wird nicht unterstützt.';

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
        return isFinite(videoEl.duration)
          ? videoEl.duration
          : 0;
      },

      get state() {
        return state.get();
      },

      getState: function () {
        return state.get();
      },

      getCurrentTime: function () {
        return videoEl.currentTime || 0;
      },

      getDuration: function () {
        return isFinite(videoEl.duration)
          ? videoEl.duration
          : 0;
      },

      onStateChange: state.onChange,

      onTimeUpdate: function (fn) {
        if (typeof fn === 'function') {
          timeListeners.push(fn);
        }
      },

      on: on,

      getErrorMessage: getErrorMessage,

      STATES: STATES
    };
  }


  ns.PlayerController = {
    createPlayerController: createPlayerController
  };

})(window.ONLANG.player);
