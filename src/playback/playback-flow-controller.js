// playback-flow-controller.js
//
// Die EINZIGE Ablaufsteuerung. Koordiniert Player, Playlist und
// Werbung. Ist das einzige Modul, das alle drei kennt — siehe
// docs/ARCHITECTURE.md, Abschnitt "Playback Flow Controller — einzige
// Ablaufsteuerung".
//
// Erlaubte Ablaufzustände (exakt wie vorgegeben):
//   IDLE, AD_READY, AD_PLAYING, CONTENT_READY, CONTENT_PLAYING,
//   PAUSED, FINISHED, ERROR
//
// Erlaubte Modi (getCurrentMode()):
//   ADVERTISEMENT, CONTENT, NONE
//
// Öffentliche API (exakt wie vorgegeben):
//   initialize(options)
//   play()
//   pause()
//   stop()
//   selectContent(index)
//   getState()
//   getCurrentMode()
//
// Steuerung ausschließlich über echte Player-Events (player.on('ended'),
// player.on('error')) — KEINE Timer, KEINE simulierten Events, KEINE
// direkte video.src-/video.play()-Manipulation. Siehe
// docs/ARCHITECTURE.md für die vollständige Begründung.
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
    ERROR: 'ERROR',
  });

  var MODES = Object.freeze({
    ADVERTISEMENT: 'ADVERTISEMENT',
    CONTENT: 'CONTENT',
    NONE: 'NONE',
  });

  function createPlaybackFlowController() {
    var player = null;
    var playlist = null;
    var advertising = null;

    var flowState = STATES.IDLE;
    var currentMode = MODES.NONE;
    // Welcher Playlist-Index nach dem NÄCHSTEN Spot geladen werden soll
    // (siehe startAdvertisement()/onPlayerEnded()).
    var pendingContentIndex = null;
    // true, wenn das aktuell geladene Medium (Spot oder Inhalt) bereits
    // zum Start angefordert wurde, aber das echte Player-Event 'play'
    // noch nicht eingetroffen ist (z. B. bei blockiertem Autoplay).
    var mediaStartPending = false;
    // true, sobald der Browser die automatische Wiedergabe abgelehnt hat
    // und genau eine Nutzeraktion zum Start fehlt. KEIN Fehlerzustand.
    var startBlocked = false;
    var destroyed = false;
    // true, sobald ein Sendebetrieb tatsaechlich angefordert wurde.
    //
    // Bugfix Demo 1.0: getNowPlayingInfo() richtete sich allein nach
    // currentMode. Ein lediglich GELADENER, aber nicht gestarteter
    // Inhalt wurde dadurch bereits als "JETZT LÄUFT" ausgewiesen,
    // obwohl nichts lief. Die Anzeige muss zum tatsaechlichen
    // Sendebetrieb passen (Zielbild Punkt 4).
    var programmeActive = false;

    var changeListeners = [];

    function notifyChange() {
      if (destroyed) return;
      // Kopie: ein Listener darf sich während der Benachrichtigung
      // abmelden, ohne die laufende Schleife zu beschädigen.
      var current = changeListeners.slice();
      for (var i = 0; i < current.length; i += 1) {
        current[i]();
      }
    }

    function setFlowState(next) {
      if (!Object.prototype.hasOwnProperty.call(STATES, next)) {
        throw new Error('[ONLANG Playback] Unbekannter Ablaufzustand: "' + next + '"');
      }
      flowState = next;
      notifyChange();
    }

    /**
     * Fordert die Wiedergabe des bereits geladenen Mediums an und merkt
     * sich, dass der echte "play"-Event noch aussteht.
     */
    function requestPlay() {
      if (destroyed) return;
      mediaStartPending = true;
      player.play();
    }

    /**
     * @param {{ player: object, playlist: object, advertising: object,
     *           contentItems: Array, advertisements: Array }} options
     */
    function initialize(options) {
      options = options || {};
      player = options.player;
      playlist = options.playlist;
      advertising = options.advertising;

      if (!player || !playlist || !advertising) {
        throw new Error('[ONLANG Playback] initialize() benötigt player, playlist und advertising.');
      }

      // Einzige Stelle im gesamten Projekt, die auf die echten
      // Player-Events "ended" und "error" reagiert und daraus den
      // Ablauf steuert (siehe Anweisung, Punkt 16: "genau eine
      // eindeutig verantwortliche Ablaufsteuerung").
      player.on('play', onPlayerPlay);
      player.on('ended', onPlayerEnded);
      player.on('error', onPlayerError);
      if (typeof player.onPlayBlocked === 'function') {
        player.onPlayBlocked(onPlayBlocked);
      }

      playlist.load(options.contentItems || []);
      advertising.load(options.advertisements || []);

      var firstItem = playlist.getCurrentItem();
      if (playlist.getStatus() === playlist.STATUSES.ERROR) {
        setFlowState(STATES.ERROR);
        return;
      }

      if (!firstItem) {
        // Leere Playlist: kein Sendebetrieb moeglich. Der Ablauf bleibt
        // im Leerlauf, playlist-ui.js zeigt den Leerzustand an. Es wird
        // bewusst KEIN Fehler gemeldet — die Daten sind gueltig, nur leer.
        setFlowState(STATES.IDLE);
        return;
      }

      // Bugfix Demo 1.0: Beim automatischen Start wurde bisher ZUERST
      // das Inhaltsvideo in das <video>-Element geladen und unmittelbar
      // danach der Spot — zwei load()-Aufrufe im selben Tick auf
      // dasselbe Element. Der abgebrochene erste Ladevorgang kann je
      // nach Browser ein zusätzliches Fehlerereignis auslösen und den
      // Ablauf sofort nach dem Start in ERROR versetzen. Beim Autostart
      // wird deshalb ausschließlich der Spot geladen.
      currentMode = MODES.CONTENT;
      if (options.autostart) {
        setFlowState(STATES.CONTENT_READY);
        pendingContentIndex = playlist.getCurrentIndex();
        startAdvertisement();
        return;
      }

      player.load({ source: firstItem.src });
      setFlowState(STATES.CONTENT_READY);
    }

    // ------------------------------------------------------------------
    // Interne Ablaufschritte
    // ------------------------------------------------------------------

    function startAdvertisement() {
      if (destroyed) return;
      programmeActive = true;
      advertising.prepare();

      if (!advertising.hasActiveAdvertisement()) {
        // Kein gültiger Spot konfiguriert -> direkt zum Inhalt
        // (Schritt 4 hat genau einen gültigen Spot; dieser Zweig ist
        // ein Sicherheitsnetz für den Fall leerer Werbedaten).
        var index = pendingContentIndex !== null ? pendingContentIndex : playlist.getCurrentIndex();
        pendingContentIndex = null;
        startContent(index);
        return;
      }

      if (advertising.getStatus() === advertising.STATUSES.ERROR) {
        currentMode = MODES.NONE;
        setFlowState(STATES.ERROR);
        return;
      }

      var ad = advertising.getActiveAdvertisement();
      currentMode = MODES.ADVERTISEMENT;
      setFlowState(STATES.AD_READY);

      player.load({ source: ad.src });
      requestPlay();
    }

    function startContent(index) {
      if (destroyed) return;
      programmeActive = true;
      playlist.select(index);

      if (playlist.getStatus() === playlist.STATUSES.ERROR) {
        currentMode = MODES.NONE;
        setFlowState(STATES.ERROR);
        return;
      }

      var item = playlist.getCurrentItem();
      if (!item) {
        currentMode = MODES.NONE;
        setFlowState(STATES.ERROR);
        return;
      }

      currentMode = MODES.CONTENT;
      setFlowState(STATES.CONTENT_READY);

      player.load({ source: item.src });
      requestPlay();
    }

    // ------------------------------------------------------------------
    // Reaktion auf echte Player-Events (Anweisung, Punkt 7-9, 16)
    // ------------------------------------------------------------------

    function onPlayerPlay() {
      if (destroyed) return;
      mediaStartPending = false;
      startBlocked = false;

      if (currentMode === MODES.ADVERTISEMENT) {
        advertising.setStatus(advertising.STATUSES.PLAYING);
        setFlowState(STATES.AD_PLAYING);
        return;
      }

      if (currentMode === MODES.CONTENT) {
        setFlowState(STATES.CONTENT_PLAYING);
      }
    }

    function onPlayerEnded() {
      if (destroyed) return;
      if (currentMode === MODES.ADVERTISEMENT) {
        // Spot beendet -> ausgewähltes Inhaltsvideo laden und
        // automatisch starten (Punkt 7 + 8).
        advertising.setStatus(advertising.STATUSES.FINISHED);
        var index = pendingContentIndex !== null ? pendingContentIndex : playlist.getCurrentIndex();
        pendingContentIndex = null;
        startContent(index);
        return;
      }

      if (currentMode === MODES.CONTENT) {
        if (playlist.hasNext()) {
          // Punkt 8: Inhaltsvideo beendet -> Spot -> nächstes Video.
          pendingContentIndex = playlist.getNextIndex();
          startAdvertisement();
        } else {
          // TV-Demo: Nach dem letzten Inhalt folgt wieder der Spot und
          // anschließend Video 1. So entsteht ein echter Endlos-Sendebetrieb:
          // Spot -> Video 1 -> Spot -> Video 2 -> Spot -> Video 3 -> Spot -> ...
          pendingContentIndex = 0;
          startAdvertisement();
        }
      }
    }

    function onPlayerError() {
      if (destroyed) return;
      if (currentMode === MODES.ADVERTISEMENT) {
        advertising.setStatus(advertising.STATUSES.ERROR);
      } else if (currentMode === MODES.CONTENT) {
        playlist.markError();
      }
      currentMode = MODES.NONE;
      setFlowState(STATES.ERROR);
    }

    /**
     * Der Browser hat die automatische Wiedergabe abgelehnt. Das Medium
     * ist geladen und gültig — es fehlt ausschließlich eine Nutzeraktion.
     * Der Ablaufzustand bleibt deshalb bewusst auf AD_READY bzw.
     * CONTENT_READY stehen und wird NICHT auf ERROR gesetzt.
     */
    function onPlayBlocked() {
      if (destroyed) return;
      startBlocked = true;
      mediaStartPending = true;
      notifyChange();
    }

    /**
     * Wird aus einer echten Nutzeraktion heraus aufgerufen (Klick auf die
     * Aktivierungsfläche). Startet das bereits geladene Medium erneut.
     */
    function resumeAfterBlock() {
      if (destroyed) return;
      startBlocked = false;
      requestPlay();
    }

    function isStartBlocked() {
      return startBlocked;
    }

    /**
     * Beendet diese Ablaufsteuerung endgültig. Danach löst kein
     * eintreffendes Player-Ereignis mehr einen Ablaufschritt aus.
     * Der Player selbst wird von main.js separat beendet.
     */
    function destroy() {
      if (destroyed) return;
      destroyed = true;
      changeListeners.length = 0;
      programmeActive = false;
      pendingContentIndex = null;
      mediaStartPending = false;
      startBlocked = false;
      currentMode = MODES.NONE;
      flowState = STATES.IDLE;
    }

    // ------------------------------------------------------------------
    // Öffentliche API
    // ------------------------------------------------------------------

    /**
     * Erster Play-Klick für ein Video: Spot zuerst (falls vorhanden),
     * danach automatisch der Inhalt (Punkt 7). Nach einer Pause: Setzt
     * exakt an derselben Stelle fort, ohne neu zu laden (Punkt 10).
     */
    function play() {
      if (destroyed) return;
      startBlocked = false;
      programmeActive = true;

      if (flowState === STATES.AD_READY) {
        requestPlay();
        return;
      }

      if (flowState === STATES.CONTENT_READY) {
        // CONTENT_READY kann zwei Bedeutungen haben:
        // 1) initial ausgewählter Inhalt -> zuerst Spot starten
        // 2) Inhalt nach Spot bereits geladen, aber Autoplay blockiert
        if (mediaStartPending) {
          player.play();
        } else {
          pendingContentIndex = playlist.getCurrentIndex();
          startAdvertisement();
        }
        return;
      }

      if (flowState === STATES.PAUSED) {
        player.play();
        setFlowState(currentMode === MODES.ADVERTISEMENT ? STATES.AD_PLAYING : STATES.CONTENT_PLAYING);
        return;
      }

      // AD_PLAYING, CONTENT_PLAYING, FINISHED, ERROR, IDLE, AD_READY:
      // play() hat hier bewusst keine Wirkung.
    }

    /**
     * Pausiert das aktuell laufende Medium (Spot oder Inhalt) über die
     * Player-API. Merkt sich den Modus für die Fortsetzung.
     */
    function pause() {
      if (flowState === STATES.AD_PLAYING || flowState === STATES.CONTENT_PLAYING) {
        player.pause();
        setFlowState(STATES.PAUSED);
      }
    }

    /**
     * Stoppt das aktuelle Medium (Punkt 11): Zeit auf 00:00, die
     * Auswahl bleibt bestehen, der Ablauf wird auf den Ausgangspunkt
     * VOR diesem Inhalt zurückgesetzt — der nächste Play-Klick beginnt
     * daher wieder mit dem Spot.
     */
    function stop() {
      player.stop();
      programmeActive = false;
      pendingContentIndex = null;
      mediaStartPending = false;

      var item = playlist.getCurrentItem();
      currentMode = item ? MODES.CONTENT : MODES.NONE;
      setFlowState(item ? STATES.CONTENT_READY : STATES.IDLE);
    }

    /**
     * Playlist-Klick (Punkt 12): aktuellen Ablauf stoppen, Index
     * setzen, Inhaltsvideo laden, KEINE automatische Wiedergabe.
     * @param {number} index
     */
    function selectContent(index) {
      player.stop();
      currentMode = MODES.NONE;
      programmeActive = false;
      pendingContentIndex = null;
      mediaStartPending = false;

      playlist.select(index);

      if (playlist.getStatus() === playlist.STATUSES.ERROR) {
        setFlowState(STATES.ERROR);
        return;
      }

      var item = playlist.getCurrentItem();
      if (item) {
        currentMode = MODES.CONTENT;
        player.load({ source: item.src });
      }
      setFlowState(STATES.CONTENT_READY);
    }

    function getState() {
      return flowState;
    }

    function getCurrentMode() {
      return currentMode;
    }

    /**
     * Liefert die aufbereitete Anzeige-Information für die
     * WERBUNG/JETZT-LÄUFT-Kennzeichnung (siehe advertising-ui.js).
     * Einzige Stelle, die dafür sowohl advertising als auch playlist
     * kennen darf.
     */
    function getNowPlayingInfo() {
      if (!programmeActive) {
        return { tag: '', title: '' };
      }
      if (currentMode === MODES.ADVERTISEMENT) {
        var ad = advertising.getActiveAdvertisement();
        return { tag: 'WERBUNG', title: ad && ad.title ? ad.title : 'ONLANG präsentiert' };
      }
      if (currentMode === MODES.CONTENT) {
        var item = playlist.getCurrentItem();
        return { tag: 'JETZT LÄUFT', title: item && item.title ? item.title : '' };
      }
      return { tag: '', title: '' };
    }


    /**
     * Liefert die nächsten beiden Programmschritte für die reine Anzeige.
     * Die Ablaufentscheidung bleibt vollständig in diesem Controller:
     * - während eines Inhalts folgt der Spot, danach das nächste Video
     * - während des Spots folgt das bereits vorgemerkte Inhaltsvideo
     */
    function getUpcomingInfo() {
      var ad;
      var nextIndex;
      var nextItem;

      if (!programmeActive) {
        return { nextTag: '', nextTitle: '', afterTag: '', afterTitle: '' };
      }

      if (currentMode === MODES.ADVERTISEMENT) {
        nextIndex = pendingContentIndex !== null ? pendingContentIndex : playlist.getCurrentIndex();
        nextItem = playlist.getItems()[nextIndex];
        return {
          nextTag: 'ALS NÄCHSTES',
          nextTitle: nextItem && nextItem.title ? nextItem.title : '',
          afterTag: '',
          afterTitle: '',
        };
      }

      if (currentMode === MODES.CONTENT) {
        ad = advertising.getActiveAdvertisement();
        nextIndex = playlist.hasNext() ? playlist.getNextIndex() : 0;
        nextItem = playlist.getItems()[nextIndex];
        return {
          nextTag: 'ALS NÄCHSTES',
          nextTitle: ad && ad.title ? ad.title : 'ONLANG Werbespot',
          afterTag: 'DANACH',
          afterTitle: nextItem && nextItem.title ? nextItem.title : '',
        };
      }

      return { nextTag: '', nextTitle: '', afterTag: '', afterTitle: '' };
    }

    return {
      initialize: initialize,
      play: play,
      pause: pause,
      stop: stop,
      selectContent: selectContent,
      getState: getState,
      getCurrentMode: getCurrentMode,
      isStartBlocked: isStartBlocked,
      resumeAfterBlock: resumeAfterBlock,
      destroy: destroy,
      getNowPlayingInfo: getNowPlayingInfo,
      getUpcomingInfo: getUpcomingInfo,
      onChange: function (fn) {
        changeListeners.push(fn);
      },
      STATES: STATES,
      MODES: MODES,

      // ------------------------------------------------------------
      // Lese-Fassade für playlist-ui.js (Schritt 3, UNVERÄNDERT).
      // playlist-ui.js kennt nach wie vor nur eine Handvoll einfacher
      // Methoden auf "controller" — main.js übergibt ihm ab Schritt 4
      // den PlaybackFlowController statt des PlaylistController direkt,
      // damit ein Playlist-Klick garantiert durch die Ablaufsteuerung
      // läuft (Punkt 12), OHNE dass playlist-ui.js selbst geändert
      // werden muss. "select" ist bewusst ein Alias auf selectContent().
      // ------------------------------------------------------------
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
      },
    };
  }

  ns.PlaybackFlowController = { createPlaybackFlowController: createPlaybackFlowController };
})(window.ONLANG.playback);
