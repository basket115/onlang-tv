// playback-flow-controller.js
//
// EINZIGE Ablaufsteuerung für:
// Werbung -> Inhalt -> Werbung -> nächster Inhalt -> ...
//
// WICHTIG:
// Medien werden nach einem Quellenwechsel NICHT mehr sofort abgespielt.
// Zuerst wird auf das echte Player-Event "loadedmetadata" gewartet.
// Das macht insbesondere Chrome bei Spot -> Video -> Spot stabiler.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.playback = window.ONLANG.playback || {};

(function (ns) {
  'use strict';

  var STATES = Object.freeze({
    IDLE: 'IDLE',
    AD_READY: 'AD_READY',
    AD_PLAYING: 'AD_PLAYING',
    CONTENT_READY: 'CONTENT_READY',
    CONTENT_PLAYING: 'CONTENT_PLAYING',
    PAUSED: 'PAUSED',
    FINISHED: 'FINISHED',
    ERROR: 'ERROR'
  });

  var MODES = Object.freeze({
    ADVERTISEMENT: 'ADVERTISEMENT',
    CONTENT: 'CONTENT',
    NONE: 'NONE'
  });

  function createPlaybackFlowController() {
    var player = null;
    var playlist = null;
    var advertising = null;

    var flowState = STATES.IDLE;
    var currentMode = MODES.NONE;

    // Welcher Inhalt nach dem nächsten Spot gestartet wird.
    var pendingContentIndex = null;

    // true = aktuelle Quelle wurde geladen und soll automatisch
    // starten, sobald loadedmetadata eintrifft.
    var mediaStartPending = false;

    var changeListeners = [];

    function notifyChange() {
      for (var i = 0; i < changeListeners.length; i += 1) {
        changeListeners[i]();
      }
    }

    function setFlowState(next) {
      if (!Object.prototype.hasOwnProperty.call(STATES, next)) {
        throw new Error(
          '[ONLANG Playback] Unbekannter Ablaufzustand: "' + next + '"'
        );
      }

      flowState = next;
      notifyChange();
    }

    // ============================================================
    // INITIALISIERUNG
    // ============================================================

    function initialize(options) {
      options = options || {};

      player = options.player;
      playlist = options.playlist;
      advertising = options.advertising;

      if (!player || !playlist || !advertising) {
        throw new Error(
          '[ONLANG Playback] initialize() benötigt player, playlist und advertising.'
        );
      }

      // Echte Player-Ereignisse.
      player.on('loadedmetadata', onPlayerLoadedMetadata);
      player.on('play', onPlayerPlay);
      player.on('ended', onPlayerEnded);
      player.on('error', onPlayerError);

      playlist.load(options.contentItems || []);
      advertising.load(options.advertisements || []);

      var firstItem = playlist.getCurrentItem();

      if (playlist.getStatus() === playlist.STATUSES.ERROR) {
        setFlowState(STATES.ERROR);
        return;
      }

      if (firstItem) {
        currentMode = MODES.CONTENT;

        // Nur laden, nicht automatisch starten.
        player.load({ source: firstItem.src });

        mediaStartPending = false;
        setFlowState(STATES.CONTENT_READY);
      } else {
        currentMode = MODES.NONE;
        setFlowState(STATES.IDLE);
      }
    }

    // ============================================================
    // WERBUNG STARTEN
    // ============================================================

    function startAdvertisement() {
      advertising.prepare();

      if (!advertising.hasActiveAdvertisement()) {
        var index =
          pendingContentIndex !== null
            ? pendingContentIndex
            : playlist.getCurrentIndex();

        pendingContentIndex = null;
        startContent(index);
        return;
      }

      if (
        advertising.getStatus() ===
        advertising.STATUSES.ERROR
      ) {
        currentMode = MODES.NONE;
        mediaStartPending = false;
        setFlowState(STATES.ERROR);
        return;
      }

      var ad = advertising.getActiveAdvertisement();

      currentMode = MODES.ADVERTISEMENT;
      mediaStartPending = true;

      setFlowState(STATES.AD_READY);

      console.log(
        '[ONLANG Playback] Spot laden:',
        ad && ad.src ? ad.src : ''
      );

      player.load({
        source: ad.src
      });

      // KEIN player.play() hier.
      // Start erfolgt erst in onPlayerLoadedMetadata().
    }

    // ============================================================
    // INHALT STARTEN
    // ============================================================

    function startContent(index) {
      playlist.select(index);

      if (
        playlist.getStatus() ===
        playlist.STATUSES.ERROR
      ) {
        currentMode = MODES.NONE;
        mediaStartPending = false;
        setFlowState(STATES.ERROR);
        return;
      }

      var item = playlist.getCurrentItem();

      if (!item) {
        currentMode = MODES.NONE;
        mediaStartPending = false;
        setFlowState(STATES.ERROR);
        return;
      }

      currentMode = MODES.CONTENT;
      mediaStartPending = true;

      setFlowState(STATES.CONTENT_READY);

      console.log(
        '[ONLANG Playback] Inhalt laden:',
        item.src
      );

      player.load({
        source: item.src
      });

      // KEIN player.play() hier.
      // Start erfolgt erst nach loadedmetadata.
    }

    // ============================================================
    // PLAYER-EVENTS
    // ============================================================

    function onPlayerLoadedMetadata() {
      console.log(
        '[ONLANG Playback] Medium bereit:',
        currentMode
      );

      if (!mediaStartPending) {
        return;
      }

      // Flag VOR play() zurücksetzen.
      // Verhindert mehrfaches Starten bei weiteren Metadata-Events.
      mediaStartPending = false;

      player.play();
    }

    function onPlayerPlay() {
      mediaStartPending = false;

      if (currentMode === MODES.ADVERTISEMENT) {
        advertising.setStatus(
          advertising.STATUSES.PLAYING
        );

        setFlowState(STATES.AD_PLAYING);
        return;
      }

      if (currentMode === MODES.CONTENT) {
        setFlowState(STATES.CONTENT_PLAYING);
      }
    }

    function onPlayerEnded() {
      console.log(
        '[ONLANG Playback] Medium beendet:',
        currentMode
      );

      // ----------------------------------------------------------
      // SPOT BEENDET -> vorgemerkten Inhalt starten
      // ----------------------------------------------------------

      if (currentMode === MODES.ADVERTISEMENT) {
        advertising.setStatus(
          advertising.STATUSES.FINISHED
        );

        var index =
          pendingContentIndex !== null
            ? pendingContentIndex
            : playlist.getCurrentIndex();

        pendingContentIndex = null;

        console.log(
          '[ONLANG Playback] Spot beendet -> Inhalt',
          index
        );

        startContent(index);
        return;
      }

      // ----------------------------------------------------------
      // INHALT BEENDET -> Spot -> nächster Inhalt
      // ----------------------------------------------------------

      if (currentMode === MODES.CONTENT) {
        if (playlist.hasNext()) {
          pendingContentIndex =
            playlist.getNextIndex();

          console.log(
            '[ONLANG Playback] Inhalt beendet -> Spot -> Inhalt',
            pendingContentIndex
          );

          startAdvertisement();
          return;
        }

        // Letztes Video:
        // Spot -> danach wieder Video 1.
        pendingContentIndex = 0;

        console.log(
          '[ONLANG Playback] Letztes Video beendet -> Spot -> Video 1'
        );

        startAdvertisement();
      }
    }

    function onPlayerError() {
      console.error(
        '[ONLANG Playback] Player-Fehler im Modus:',
        currentMode
      );

      mediaStartPending = false;

      if (currentMode === MODES.ADVERTISEMENT) {
        advertising.setStatus(
          advertising.STATUSES.ERROR
        );
      } else if (currentMode === MODES.CONTENT) {
        playlist.markError();
      }

      currentMode = MODES.NONE;
      setFlowState(STATES.ERROR);
    }

    // ============================================================
    // ÖFFENTLICHE STEUERUNG
    // ============================================================

    function play() {
      // ----------------------------------------------------------
      // Initialer Start:
      // Content ist vorbereitet -> zuerst Werbung
      // ----------------------------------------------------------

      if (flowState === STATES.CONTENT_READY) {
        if (mediaStartPending) {
          // Quelle wurde bereits geladen und wartet nur auf Benutzer-
          // Freigabe bzw. erneutes Play.
          player.play();
        } else {
          pendingContentIndex =
            playlist.getCurrentIndex();

          startAdvertisement();
        }

        return;
      }

      // Spot wurde bereits geladen.
      if (flowState === STATES.AD_READY) {
        if (mediaStartPending) {
          // Normalerweise übernimmt loadedmetadata den Start.
          // Bei einem manuellen Klick darf ebenfalls gestartet werden.
          mediaStartPending = false;
        }

        player.play();
        return;
      }

      // Pause fortsetzen.
      if (flowState === STATES.PAUSED) {
        player.play();
        return;
      }
    }

    function pause() {
      if (
        flowState === STATES.AD_PLAYING ||
        flowState === STATES.CONTENT_PLAYING
      ) {
        player.pause();
        setFlowState(STATES.PAUSED);
      }
    }

    function stop() {
      player.stop();

      pendingContentIndex = null;
      mediaStartPending = false;

      var item = playlist.getCurrentItem();

      currentMode =
        item ? MODES.CONTENT : MODES.NONE;

      setFlowState(
        item
          ? STATES.CONTENT_READY
          : STATES.IDLE
      );
    }

    function selectContent(index) {
      player.stop();

      currentMode = MODES.NONE;
      pendingContentIndex = null;
      mediaStartPending = false;

      playlist.select(index);

      if (
        playlist.getStatus() ===
        playlist.STATUSES.ERROR
      ) {
        setFlowState(STATES.ERROR);
        return;
      }

      var item = playlist.getCurrentItem();

      if (item) {
        currentMode = MODES.CONTENT;

        player.load({
          source: item.src
        });
      }

      setFlowState(STATES.CONTENT_READY);
    }

    function getState() {
      return flowState;
    }

    function getCurrentMode() {
      return currentMode;
    }

    // ============================================================
    // UI-INFORMATIONEN
    // ============================================================

    function getNowPlayingInfo() {
      if (currentMode === MODES.ADVERTISEMENT) {
        var ad =
          advertising.getActiveAdvertisement();

        return {
          tag: 'WERBUNG',
          title:
            ad && ad.title
              ? ad.title
              : 'ONLANG präsentiert'
        };
      }

      if (currentMode === MODES.CONTENT) {
        var item = playlist.getCurrentItem();

        return {
          tag: 'JETZT LÄUFT',
          title:
            item && item.title
              ? item.title
              : ''
        };
      }

      return {
        tag: '',
        title: ''
      };
    }

    function getUpcomingInfo() {
      var ad;
      var nextIndex;
      var nextItem;

      if (currentMode === MODES.ADVERTISEMENT) {
        nextIndex =
          pendingContentIndex !== null
            ? pendingContentIndex
            : playlist.getCurrentIndex();

        nextItem =
          playlist.getItems()[nextIndex];

        return {
          nextTag: 'ALS NÄCHSTES',
          nextTitle:
            nextItem && nextItem.title
              ? nextItem.title
              : '',
          afterTag: '',
          afterTitle: ''
        };
      }

      if (currentMode === MODES.CONTENT) {
        ad =
          advertising.getActiveAdvertisement();

        nextIndex =
          playlist.hasNext()
            ? playlist.getNextIndex()
            : 0;

        nextItem =
          playlist.getItems()[nextIndex];

        return {
          nextTag: 'ALS NÄCHSTES',
          nextTitle:
            ad && ad.title
              ? ad.title
              : 'ONLANG Werbespot',

          afterTag: 'DANACH',

          afterTitle:
            nextItem && nextItem.title
              ? nextItem.title
              : ''
        };
      }

      return {
        nextTag: '',
        nextTitle: '',
        afterTag: '',
        afterTitle: ''
      };
    }

    // ============================================================
    // ÖFFENTLICHE API
    // ============================================================

    return {
      initialize: initialize,
      play: play,
      pause: pause,
      stop: stop,
      selectContent: selectContent,

      getState: getState,
      getCurrentMode: getCurrentMode,

      getNowPlayingInfo: getNowPlayingInfo,
      getUpcomingInfo: getUpcomingInfo,

      onChange: function (fn) {
        if (typeof fn === 'function') {
          changeListeners.push(fn);
        }
      },

      STATES: STATES,
      MODES: MODES,

      // Playlist-Fassade für playlist-ui.js
      select: selectContent,

      getItems: function () {
        return playlist.getItems();
      },

      getCurrentIndex: function () {
        return playlist.getCurrentIndex();
      },

      getCurrentItem: function () {
        return playlist.getCurrentItem();
      },

      getStatus: function () {
        return playlist.getStatus();
      },

      get STATUSES() {
        return playlist.STATUSES;
      }
    };
  }

  ns.PlaybackFlowController = {
    createPlaybackFlowController:
      createPlaybackFlowController
  };

})(window.ONLANG.playback);
