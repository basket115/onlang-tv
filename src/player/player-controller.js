// player-controller.js
//
// Öffentliche API des ONLANG Media Players.
// Unabhängig von Playlist, Werbung, Studio, Google Sheets und BBK.
//
// Unterstützt zwei Wiedergabe-Engines hinter derselben API:
//   - 'video'   : natives <video>-Element (lokale/Cloudinary-MP4-Dateien)
//   - 'youtube' : YouTube IFrame Player API (normale YouTube-Links,
//                 z. B. https://youtu.be/ID oder youtube.com/watch?v=ID)
//
// Die Engine wird in load() automatisch anhand der URL gewählt. Beide
// Engines feuern dieselben Ereignisse (loadedmetadata, play, ended,
// error, timeupdate), sodass der Ablauf (playback-flow-controller.js:
// Werbung -> Inhalt -> Werbung -> nächster Inhalt) UNVERÄNDERT bleibt.
//
// Quellen:
//   - direkter String
//   - { source: '...' }
//   - { src: '...' }
//
// Für den automatischen TV-Betrieb wird das Medium vor play() stumm
// geschaltet. Dadurch erlaubt Chrome auch automatische Medienwechsel
// Spot -> Video -> Spot. Nach dem ersten Klick wird der Ton aktiviert.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  // ============================================================
  // YOUTUBE-HILFEN (modulweit, einmalig)
  // ============================================================

  var ytApiPromise = null;

  // Lädt die YouTube IFrame Player API genau einmal.
  function loadYouTubeApi() {
    if (window.YT && window.YT.Player) {
      return Promise.resolve();
    }

    if (ytApiPromise) {
      return ytApiPromise;
    }

    ytApiPromise = new Promise(function (resolve) {
      var previous = window.onYouTubeIframeAPIReady;

      window.onYouTubeIframeAPIReady = function () {
        if (typeof previous === 'function') {
          try { previous(); } catch (e) {}
        }
        resolve();
      };

      var tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    });

    return ytApiPromise;
  }

  // Extrahiert die Video-ID aus einer normalen YouTube-URL.
  function extractYouTubeId(url) {
    var match = String(url || '').match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/
    );

    return match ? match[1] : '';
  }

  function isYouTubeUrl(url) {
    return extractYouTubeId(url) !== '';
  }


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

    // ----------------------------------------------------------
    // ENGINE-ZUSTAND
    // 'video'  = natives <video>, 'youtube' = YouTube IFrame API
    // ----------------------------------------------------------
    var engine = 'video';

    var ytPlayer = null;
    var ytReady = false;
    var ytContainer = null;
    var ytMount = null;
    var ytCurrentId = null;
    var ytLastError = '';
    var ytTimeTimer = null;

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
    // NATIVE VIDEO-EVENTS (nur wirksam, wenn engine === 'video')
    // ============================================================

    function handleLoadedMetadata() {
      if (engine !== 'video') return;

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
      if (engine !== 'video') return;

      state.set(STATES.PLAYING);

      console.log(
        '[ONLANG Player] Wiedergabe läuft:',
        videoEl.currentSrc
      );

      emit('play');
    }

    function handlePause() {
      if (engine !== 'video') return;

      if (!videoEl.ended && !videoEl.error) {
        state.set(STATES.PAUSED);
      }

      emit('pause');
    }

    function handleEnded() {
      if (engine !== 'video') return;

      state.set(STATES.ENDED);

      console.log(
        '[ONLANG Player] Video beendet:',
        videoEl.currentSrc
      );

      emit('ended');
    }

    function handleError() {
      if (engine !== 'video') return;

      state.set(STATES.ERROR);

      console.error(
        '[ONLANG Player] Video-Fehler:',
        videoEl.currentSrc,
        videoEl.error
      );

      emit('error');
    }

    function handleTimeUpdate() {
      if (engine !== 'video') return;

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
    // YOUTUBE-ENGINE
    // ============================================================

    // Baut einmalig die YouTube-Bühne direkt neben dem <video> auf.
    function ensureYouTubeStage() {
      if (ytContainer) return;

      var stage = videoEl.parentNode; // .player-window

      ytContainer = document.createElement('div');
      ytContainer.className = 'player-youtube';
      ytContainer.setAttribute('aria-hidden', 'true');
      ytContainer.style.cssText =
        'display:none;width:100%;aspect-ratio:16/9;max-height:100%;background:#000;';

      ytMount = document.createElement('div');
      ytMount.style.cssText = 'width:100%;height:100%;';
      ytContainer.appendChild(ytMount);

      if (stage) {
        if (videoEl.nextSibling) {
          stage.insertBefore(ytContainer, videoEl.nextSibling);
        } else {
          stage.appendChild(ytContainer);
        }
      }
    }

    // Schaltet zwischen nativer und YouTube-Ansicht um.
    function showEngine(next) {
      engine = next;

      if (next === 'youtube') {
        ensureYouTubeStage();

        try { videoEl.pause(); } catch (e) {}
        videoEl.style.display = 'none';

        if (ytContainer) {
          ytContainer.style.display = 'block';
          ytContainer.setAttribute('aria-hidden', 'false');
        }
      } else {
        if (ytContainer) {
          ytContainer.style.display = 'none';
          ytContainer.setAttribute('aria-hidden', 'true');
        }

        stopYtTime();

        if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
          try { ytPlayer.pauseVideo(); } catch (e) {}
        }

        videoEl.style.display = '';
      }
    }

    function startYtTime() {
      stopYtTime();

      ytTimeTimer = window.setInterval(function () {
        if (engine === 'youtube') {
          notifyTime();
          emit('timeupdate');
        }
      }, 500);
    }

    function stopYtTime() {
      if (ytTimeTimer) {
        window.clearInterval(ytTimeTimer);
        ytTimeTimer = null;
      }
    }

    function loadYouTube(src) {
      ytCurrentId = extractYouTubeId(src);
      ytLastError = '';

      showEngine('youtube');
      state.set(STATES.LOADING);

      console.log('[ONLANG Player] Lade YouTube:', ytCurrentId);

      loadYouTubeApi().then(function () {
        if (!ytPlayer) {
          ytPlayer = new YT.Player(ytMount, {
            width: '100%',
            height: '100%',
            playerVars: {
              autoplay: 0,
              controls: 0,
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              mute: 1,
              fs: 0,
              iv_load_policy: 3,
              disablekb: 1
            },
            events: {
              onReady: function () {
                ytReady = true;
                try { ytPlayer.mute(); } catch (e) {}

                if (ytCurrentId && engine === 'youtube') {
                  try { ytPlayer.cueVideoById(ytCurrentId); } catch (e) {}
                }
              },
              onStateChange: onYtStateChange,
              onError: onYtError
            }
          });
        } else if (ytReady) {
          try {
            ytPlayer.mute();
            ytPlayer.cueVideoById(ytCurrentId);
          } catch (e) {}
        }
        // Falls ytPlayer existiert, aber noch nicht ready ist, übernimmt
        // onReady das Cueing anhand von ytCurrentId.
      }).catch(function () {
        onYtError();
      });
    }

    // Video ist geladen/vorbereitet -> wie loadedmetadata beim <video>.
    function onYtCued() {
      if (engine !== 'youtube') return;

      if (state.get() === STATES.LOADING) {
        state.set(STATES.READY);
      }

      notifyTime();
      emit('loadedmetadata');
    }

    function onYtStateChange(ev) {
      if (engine !== 'youtube' || !window.YT || !window.YT.PlayerState) return;

      var S = window.YT.PlayerState;

      if (ev.data === S.CUED) {
        onYtCued();
      } else if (ev.data === S.PLAYING) {
        state.set(STATES.PLAYING);
        startYtTime();
        emit('play');
      } else if (ev.data === S.ENDED) {
        stopYtTime();
        state.set(STATES.ENDED);
        emit('ended');
      }
    }

    function onYtError() {
      if (engine !== 'youtube') return;

      ytLastError = 'YouTube-Video konnte nicht geladen werden.';
      stopYtTime();
      state.set(STATES.ERROR);

      console.error('[ONLANG Player] YouTube-Fehler:', ytCurrentId);

      emit('error');
    }

    function ytTime() {
      try {
        return (ytPlayer && ytPlayer.getCurrentTime)
          ? (ytPlayer.getCurrentTime() || 0)
          : 0;
      } catch (e) {
        return 0;
      }
    }

    function ytDuration() {
      try {
        return (ytPlayer && ytPlayer.getDuration)
          ? (ytPlayer.getDuration() || 0)
          : 0;
      } catch (e) {
        return 0;
      }
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

      // YouTube-Link -> YouTube-Engine.
      if (isYouTubeUrl(src)) {
        loadYouTube(src);
        return;
      }

      // Direkte Datei (MP4/Cloudinary) -> native <video>-Engine.
      showEngine('video');

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
      // YOUTUBE-ENGINE
      // ----------------------------------------------------------
      if (engine === 'youtube') {
        if (ytPlayer && ytReady) {
          try {
            ytPlayer.mute();
            ytPlayer.playVideo();
          } catch (e) {
            console.error('[ONLANG Player] YouTube play() Ausnahme:', e);
            state.set(STATES.ERROR);
          }
        }
        return;
      }

      // ----------------------------------------------------------
      // WICHTIG FÜR CHROME:
      //
      // Automatische Folge-Wiedergabe funktioniert zuverlässig,
      // wenn das Video stumm ist.
      //
      // HU001 besitzt im Bootstrap:
      // mutedAutoplay: true
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
      if (engine === 'youtube') {
        if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') {
          try { ytPlayer.pauseVideo(); } catch (e) {}
        }
        return;
      }

      videoEl.pause();
    }


    // ============================================================
    // STOP
    // ============================================================

    function stop() {
      if (engine === 'youtube') {
        if (ytPlayer && typeof ytPlayer.stopVideo === 'function') {
          try { ytPlayer.stopVideo(); } catch (e) {}
        }
        stopYtTime();
        notifyTime();
        return;
      }

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
      if (engine === 'youtube') {
        return ytLastError || 'YouTube-Video konnte nicht geladen werden.';
      }

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
    // TON NACH ERSTEM KLICK AKTIVIEREN (beide Engines)
    // ============================================================

    document.addEventListener('click', function () {
      try { videoEl.muted = false; } catch (e) {}
      try {
        if (ytPlayer && typeof ytPlayer.unMute === 'function') {
          ytPlayer.unMute();
        }
      } catch (e) {}
    });


    // ============================================================
    // ZEIT-/DAUER-HELFER (engine-neutral)
    // ============================================================

    function currentTimeValue() {
      return engine === 'youtube'
        ? ytTime()
        : (videoEl.currentTime || 0);
    }

    function durationValue() {
      if (engine === 'youtube') {
        return ytDuration();
      }

      return isFinite(videoEl.duration)
        ? videoEl.duration
        : 0;
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
        return currentTimeValue();
      },

      get duration() {
        return durationValue();
      },

      get state() {
        return state.get();
      },

      getState: function () {
        return state.get();
      },

      getCurrentTime: function () {
        return currentTimeValue();
      },

      getDuration: function () {
        return durationValue();
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
