// player-controller.js
//
// Öffentliche API des ONLANG Media Players.
// Unabhängig von Playlist, Werbung, Studio, Google Sheets und BBK.
//
// Unterstützt:
//   - direkter String
//   - { source: '...' }
//   - { src: '...' }
//
// Für den automatischen TV-Betrieb wird das Video vor play()
// stumm geschaltet. Dadurch erlaubt Chrome auch automatische
// Medienwechsel Spot -> Video -> Spot.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

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

      if (typeof callback !== 'function') {
        return;
      }

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

      console.log(
        '[ONLANG Player] Metadata geladen:',
        videoEl.currentSrc
      );

      emit('loadedmetadata');
    }

    function handlePlay() {
      state.set(STATES.PLAYING);

      console.log(
        '[ONLANG Player] Wiedergabe läuft:',
        videoEl.currentSrc
      );

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

      console.log(
        '[ONLANG Player] Video beendet:',
        videoEl.currentSrc
      );

      emit('ended');
    }

    function handleError() {
      state.set(STATES.ERROR);

      console.error(
        '[ONLANG Player] Video-Fehler:',
        videoEl.currentSrc,
        videoEl.error
      );

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
      if (eventBinding) {
        return;
      }

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
    // VIDEOQUELLE
    // ============================================================

    function getVideoSource(video) {
      if (typeof video === 'string') {
        return video.trim();
      }

      if (!video || typeof video !== 'object') {
        return '';
      }

      if (
        typeof video.src === 'string' &&
        video.src.trim() !== ''
      ) {
        return video.src.trim();
      }

      if (
        typeof video.source === 'string' &&
        video.source.trim() !== ''
      ) {
        return video.source.trim();
      }

      return '';
    }


    // ============================================================
    // URL NORMALISIEREN
    // ============================================================

    function normaliseVideoSource(src) {
      if (!src) {
        return '';
      }

      try {
        if (/^https?:\/\//i.test(src)) {
          return src;
        }

        return new URL(
          src,
          window.location.href
        ).href;

      } catch (e) {
        return src;
      }
    }


    // ============================================================
    // LOAD
    // ============================================================

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

      // Alte Wiedergabe stoppen.
      videoEl.pause();

      // Alte Quelle entfernen.
      videoEl.removeAttribute('src');

      // Neue Quelle setzen.
      videoEl.src = src;

      // Browser auf Inline-Wiedergabe vorbereiten.
      videoEl.playsInline = true;

      videoEl.load();
    }


    // ============================================================
    // PLAY
    // ============================================================

    function play() {

      // ----------------------------------------------------------
      // WICHTIG FÜR CHROME:
      //
      // Automatische Folge-Wiedergabe funktioniert zuverlässig,
      // wenn das Video stumm ist.
      //
      // HU001 besitzt im Bootstrap:
      // mutedAutoplay: true
      //
      // Der bisherige Player hat diese Bedingung technisch
      // überhaupt nicht umgesetzt.
      // ----------------------------------------------------------

      videoEl.muted = true;
      videoEl.defaultMuted = true;

      console.log(
        '[ONLANG Player] Starte Wiedergabe:',
        videoEl.currentSrc || videoEl.src,
        'muted =',
        videoEl.muted
      );

      var playPromise;

      try {
        playPromise = videoEl.play();

      } catch (error) {
        console.error(
          '[ONLANG Player] play() Ausnahme:',
          error
        );

        state.set(STATES.ERROR);
        return;
      }

      if (
        playPromise &&
        typeof playPromise.then === 'function'
      ) {
        playPromise
          .then(function () {
            console.log(
              '[ONLANG Player] play() erfolgreich:',
              videoEl.currentSrc
            );
          })
          .catch(function (error) {
            console.error(
              '[ONLANG Player] Wiedergabe blockiert:',
              error.name,
              error.message
            );

            state.set(STATES.ERROR);
          });
      }
    }


    // ============================================================
    // PAUSE
    // ============================================================

    function pause() {
      videoEl.pause();
    }


    // ============================================================
    // STOP
    // ============================================================

    function stop() {
      videoEl.pause();

      try {
        videoEl.currentTime = 0;
      } catch (e) {
        // absichtlich leer
      }

      notifyTime();
    }


    // ============================================================
    // FEHLERMELDUNG
    // ============================================================

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


    // ============================================================
    // ÖFFENTLICHE API
    // ============================================================

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
    createPlayerController:
      createPlayerController
  };

})(window.ONLANG.player);
