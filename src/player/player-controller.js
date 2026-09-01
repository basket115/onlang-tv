// player-controller.js
//
// ONLANG TV Player Controller
// Unterstützt:
//   - direkte MP4/WebM-Quellen über <video>
//   - YouTube-URLs über YouTube IFrame API
//
// Die öffentliche Player-API bleibt unverändert:
// load(), play(), pause(), stop(), currentTime, duration,
// state, getState(), getCurrentTime(), getDuration(),
// onStateChange(), onTimeUpdate(), on(), getErrorMessage()
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
    var rawEventListeners = {
      loadedmetadata: [],
      play: [],
      pause: [],
      ended: [],
      error: [],
      timeupdate: []
    };

    var ytPlayer = null;
    var ytContainer = null;
    var ytReadyPromise = null;
    var ytPlayPending = false;
    var currentIsYouTube = false;
    var currentYouTubeId = '';
    var loadToken = 0;
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

      if (typeof callback === 'function') {
        rawEventListeners[eventName].push(callback);
      }
    }

    function emit(eventName) {
      var list = rawEventListeners[eventName] || [];

      for (var i = 0; i < list.length; i += 1) {
        try {
          list[i]();
        } catch (error) {
          console.error(
            '[ONLANG Player] Listener-Fehler:',
            error
          );
        }
      }
    }

    function notifyTime() {
      for (var i = 0; i < timeListeners.length; i += 1) {
        try {
          timeListeners[i]();
        } catch (error) {
          console.error(
            '[ONLANG Player] Time-Listener-Fehler:',
            error
          );
        }
      }

      emit('timeupdate');
    }

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

      } catch (error) {
        return src;
      }
    }

    function getYouTubeId(src) {
      if (!src) {
        return '';
      }

      try {
        var url = new URL(src);

        if (
          url.hostname === 'youtu.be' ||
          url.hostname === 'www.youtu.be'
        ) {
          return url.pathname
            .replace(/^\/+/, '')
            .split('/')[0];
        }

        if (
          url.hostname === 'youtube.com' ||
          url.hostname === 'www.youtube.com' ||
          url.hostname === 'm.youtube.com'
        ) {
          if (url.pathname === '/watch') {
            return url.searchParams.get('v') || '';
          }

          if (url.pathname.indexOf('/shorts/') === 0) {
            return url.pathname.split('/')[2] || '';
          }

          if (url.pathname.indexOf('/embed/') === 0) {
            return url.pathname.split('/')[2] || '';
          }
        }

      } catch (error) {
        return '';
      }

      return '';
    }

    function startYouTubeTimeUpdates() {
      stopYouTubeTimeUpdates();

      ytTimeTimer = window.setInterval(function () {
        if (
          !ytPlayer ||
          typeof ytPlayer.getCurrentTime !== 'function'
        ) {
          return;
        }

        notifyTime();

      }, 250);
    }

    function stopYouTubeTimeUpdates() {
      if (ytTimeTimer) {
        window.clearInterval(ytTimeTimer);
        ytTimeTimer = null;
      }
    }

    function destroyYouTubePlayer() {
      stopYouTubeTimeUpdates();

      if (ytPlayer) {
        try {
          ytPlayer.stopVideo();
        } catch (e) {}

        try {
          ytPlayer.destroy();
        } catch (e) {}
      }

      ytPlayer = null;

      if (
        ytContainer &&
        ytContainer.parentNode
      ) {
        ytContainer.parentNode.removeChild(
          ytContainer
        );
      }

      ytContainer = null;
      currentYouTubeId = '';
      currentIsYouTube = false;
      ytPlayPending = false;

      videoEl.style.display = '';
    }

    function ensureYouTubeApi() {
      if (
        window.YT &&
        window.YT.Player
      ) {
        return Promise.resolve();
      }

      if (ytReadyPromise) {
        return ytReadyPromise;
      }

      ytReadyPromise = new Promise(
        function (resolve, reject) {

          var timeout = window.setTimeout(
            function () {
              reject(
                new Error(
                  'YouTube IFrame API Timeout.'
                )
              );
            },
            15000
          );

          var previousReady =
            window.onYouTubeIframeAPIReady;

          window.onYouTubeIframeAPIReady =
            function () {

              if (
                typeof previousReady ===
                'function'
              ) {
                try {
                  previousReady();
                } catch (e) {}
              }

              window.clearTimeout(timeout);
              resolve();
            };

          var existing =
            document.querySelector(
              'script[src="https://www.youtube.com/iframe_api"]'
            );

          if (!existing) {

            var script =
              document.createElement(
                'script'
              );

            script.src =
              'https://www.youtube.com/iframe_api';

            script.async = true;

            script.onerror =
              function () {

                window.clearTimeout(
                  timeout
                );

                reject(
                  new Error(
                    'YouTube IFrame API konnte nicht geladen werden.'
                  )
                );
              };

            document.head.appendChild(
              script
            );
          }
        }
      );

      return ytReadyPromise;
    }

    function handleYouTubeState(event) {
      if (!ytPlayer) {
        return;
      }

      switch (event.data) {

        case 1:
          // PLAYING

          state.set(
            STATES.PLAYING
          );

          startYouTubeTimeUpdates();

          emit('play');

          break;


        case 2:
          // PAUSED

          state.set(
            STATES.PAUSED
          );

          stopYouTubeTimeUpdates();

          emit('pause');

          break;


        case 0:
          // ENDED

          state.set(
            STATES.ENDED
          );

          stopYouTubeTimeUpdates();

          notifyTime();

          console.log(
            '[ONLANG Player] YouTube Video beendet:',
            currentYouTubeId
          );

          emit('ended');

          break;


        case 3:
          // BUFFERING
          break;


        case 5:
          // CUED

          if (
            state.get() ===
            STATES.LOADING
          ) {

            state.set(
              STATES.READY
            );

            notifyTime();

            emit(
              'loadedmetadata'
            );
          }

          if (ytPlayPending) {

            ytPlayPending = false;

            ytPlayer.mute();

            ytPlayer.playVideo();
          }

          break;
      }
    }

    function handleYouTubeError(event) {

      console.error(
        '[ONLANG Player] YouTube-Fehler:',
        event && event.data
      );

      stopYouTubeTimeUpdates();

      state.set(
        STATES.ERROR
      );

      emit('error');
    }

    function createYouTubePlayer(
      videoId,
      token
    ) {

      ensureYouTubeApi()

        .then(function () {

          if (token !== loadToken) {
            return;
          }

          ytContainer =
            document.createElement(
              'div'
            );

          ytContainer.className =
            'player-youtube';

          ytContainer.style.position =
            'absolute';

          ytContainer.style.inset =
            '0';

          ytContainer.style.width =
            '100%';

          ytContainer.style.height =
            '100%';

          ytContainer.style.background =
            '#000';

          var parent =
            videoEl.parentElement;

          if (!parent) {
            throw new Error(
              'YouTube Player Container nicht gefunden.'
            );
          }

          parent.style.position =
            'relative';

          parent.appendChild(
            ytContainer
          );

          videoEl.style.display =
            'none';

          ytPlayer =
            new window.YT.Player(
              ytContainer,
              {
                videoId: videoId,

                width: '100%',
                height: '100%',

                playerVars: {
                  autoplay: 0,
                  controls: 0,
                  rel: 0,
                  playsinline: 1,
                  modestbranding: 1,
                  enablejsapi: 1,
                  origin:
                    window.location.origin
                },

                events: {

                  onReady: function () {

                    if (
                      token !==
                        loadToken ||
                      !ytPlayer
                    ) {
                      return;
                    }

                    ytPlayer.mute();

                    state.set(
                      STATES.READY
                    );

                    notifyTime();

                    emit(
                      'loadedmetadata'
                    );

                    if (
                      ytPlayPending
                    ) {

                      ytPlayPending =
                        false;

                      ytPlayer.playVideo();
                    }
                  },

                  onStateChange:
                    handleYouTubeState,

                  onError:
                    handleYouTubeError
                }
              }
            );

        })

        .catch(function (error) {

          if (token !== loadToken) {
            return;
          }

          console.error(
            '[ONLANG Player] YouTube API Fehler:',
            error
          );

          state.set(
            STATES.ERROR
          );

          emit('error');
        });
    }

    function handleNativeLoadedMetadata() {

      if (currentIsYouTube) {
        return;
      }

      if (
        state.get() ===
        STATES.LOADING
      ) {

        state.set(
          STATES.READY
        );
      }

      notifyTime();

      emit(
        'loadedmetadata'
      );
    }

    function handleNativePlay() {

      if (currentIsYouTube) {
        return;
      }

      state.set(
        STATES.PLAYING
      );

      emit('play');
    }

    function handleNativePause() {

      if (currentIsYouTube) {
        return;
      }

      if (
        !videoEl.ended &&
        !videoEl.error
      ) {

        state.set(
          STATES.PAUSED
        );
      }

      emit('pause');
    }

    function handleNativeEnded() {

      if (currentIsYouTube) {
        return;
      }

      state.set(
        STATES.ENDED
      );

      notifyTime();

      emit('ended');
    }

    function handleNativeError() {

      if (currentIsYouTube) {
        return;
      }

      state.set(
        STATES.ERROR
      );

      console.error(
        '[ONLANG Player] Video-Fehler:',
        videoEl.currentSrc,
        videoEl.error
      );

      emit('error');
    }

    function handleNativeTimeUpdate() {

      if (currentIsYouTube) {
        return;
      }

      notifyTime();
    }

    videoEl.addEventListener(
      'loadedmetadata',
      handleNativeLoadedMetadata
    );

    videoEl.addEventListener(
      'play',
      handleNativePlay
    );

    videoEl.addEventListener(
      'pause',
      handleNativePause
    );

    videoEl.addEventListener(
      'ended',
      handleNativeEnded
    );

    videoEl.addEventListener(
      'error',
      handleNativeError
    );

    videoEl.addEventListener(
      'timeupdate',
      handleNativeTimeUpdate
    );

    function load(video) {

      var rawSrc =
        getVideoSource(video);

      var src =
        normaliseVideoSource(
          rawSrc
        );

      if (!src) {

        state.set(
          STATES.ERROR
        );

        emit('error');

        return;
      }

      loadToken += 1;

      var token =
        loadToken;

      console.log(
        '[ONLANG Player] Lade Video:',
        src
      );

      destroyYouTubePlayer();

      state.set(
        STATES.LOADING
      );

      var youtubeId =
        getYouTubeId(src);

      if (youtubeId) {

        currentIsYouTube =
          true;

        currentYouTubeId =
          youtubeId;

        console.log(
          '[ONLANG Player] YouTube-Quelle erkannt:',
          youtubeId
        );

        createYouTubePlayer(
          youtubeId,
          token
        );

        return;
      }

      currentIsYouTube =
        false;

      videoEl.style.display =
        '';

      videoEl.muted =
        true;

      videoEl.defaultMuted =
        true;

      videoEl.playsInline =
        true;

      videoEl.removeAttribute(
        'src'
      );

      videoEl.src =
        src;

      videoEl.load();
    }

    function play() {

      if (currentIsYouTube) {

        if (!ytPlayer) {

          ytPlayPending =
            true;

          return;
        }

        try {

          ytPlayer.mute();

          ytPlayer.playVideo();

        } catch (error) {

          console.error(
            '[ONLANG Player] YouTube play() Fehler:',
            error
          );

          state.set(
            STATES.ERROR
          );

          emit('error');
        }

        return;
      }

      videoEl.muted =
        true;

      videoEl.defaultMuted =
        true;

      var promise;

      try {

        promise =
          videoEl.play();

      } catch (error) {

        state.set(
          STATES.ERROR
        );

        emit('error');

        return;
      }

      if (
        promise &&
        typeof promise.catch ===
          'function'
      ) {

        promise.catch(
          function (error) {

            console.error(
              '[ONLANG Player] Wiedergabe blockiert:',
              error.name,
              error.message
            );

            state.set(
              STATES.ERROR
            );

            emit('error');
          }
        );
      }
    }

    function pause() {

      if (currentIsYouTube) {

        if (ytPlayer) {
          ytPlayer.pauseVideo();
        }

        return;
      }

      videoEl.pause();
    }

    function stop() {

      if (currentIsYouTube) {

        if (ytPlayer) {

          try {

            ytPlayer.stopVideo();

            ytPlayer.seekTo(
              0,
              true
            );

          } catch (e) {}
        }

        stopYouTubeTimeUpdates();

        notifyTime();

        return;
      }

      videoEl.pause();

      try {

        videoEl.currentTime =
          0;

      } catch (e) {}

      notifyTime();
    }

    function getCurrentTime() {

      if (
        currentIsYouTube &&
        ytPlayer &&
        typeof ytPlayer.getCurrentTime ===
          'function'
      ) {

        return (
          ytPlayer.getCurrentTime() ||
          0
        );
      }

      return (
        videoEl.currentTime ||
        0
      );
    }

    function getDuration() {

      if (
        currentIsYouTube &&
        ytPlayer &&
        typeof ytPlayer.getDuration ===
          'function'
      ) {

        return (
          ytPlayer.getDuration() ||
          0
        );
      }

      return isFinite(
        videoEl.duration
      )
        ? videoEl.duration
        : 0;
    }

    function getErrorMessage() {

      if (currentIsYouTube) {

        return (
          'YouTube-Video konnte nicht geladen werden.'
        );
      }

      var mediaError =
        videoEl.error;

      if (!mediaError) {

        return (
          'Video konnte nicht geladen werden.'
        );
      }

      switch (
        mediaError.code
      ) {

        case 4:
          return (
            'Videoquelle wurde nicht gefunden oder wird nicht unterstützt.'
          );

        case 3:
          return (
            'Video konnte nicht dekodiert werden.'
          );

        case 2:
          return (
            'Netzwerkfehler beim Laden des Videos.'
          );

        case 1:
          return (
            'Laden des Videos wurde abgebrochen.'
          );

        default:
          return (
            'Unbekannter Fehler beim Laden des Videos.'
          );
      }
    }

    return {

      load: load,

      play: play,

      pause: pause,

      stop: stop,

      get currentTime() {
        return getCurrentTime();
      },

      get duration() {
        return getDuration();
      },

      get state() {
        return state.get();
      },

      getState:
        function () {
          return state.get();
        },

      getCurrentTime:
        getCurrentTime,

      getDuration:
        getDuration,

      onStateChange:
        state.onChange,

      onTimeUpdate:
        function (fn) {

          if (
            typeof fn ===
            'function'
          ) {
            timeListeners.push(
              fn
            );
          }
        },

      on: on,

      getErrorMessage:
        getErrorMessage,

      STATES: STATES
    };
  }

  ns.PlayerController = {

    createPlayerController:
      createPlayerController

  };

})(window.ONLANG.player);
