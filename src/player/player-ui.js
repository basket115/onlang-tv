// player-ui.js
//
// Playeransicht von ONLANG TV.
//
// Für HU001 / Darazsak werden die sichtbaren Player-Texte ungarisch
// ausgegeben. Alle anderen Mandanten behalten die deutsche Oberfläche.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;

    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);

    return (m < 10 ? '0' : '') + m +
      ':' +
      (s < 10 ? '0' : '') + s;
  }

  /**
   * Erkennt, ob aktuell Darazsak / HU001 aktiv ist.
   *
   * Die Mandantenauswahl wurde von FullView bereits aufgebaut,
   * bevor die Player-Module erzeugt werden.
   */
  function isDarazsak() {
    var switcher = document.getElementById('tv-tenant-switcher');

    if (switcher &&
        String(switcher.value || '').toUpperCase() === 'HU001') {
      return true;
    }

    var params;

    try {
      params = new URLSearchParams(window.location.search);
      return String(params.get('kunde') || '').toUpperCase() === 'HU001';
    } catch (e) {
      return false;
    }
  }

  function getTexts() {
    if (isDarazsak()) {
      return {
        status: 'Állapot:',
        time: 'Idő:',
        mode: 'Mód:',
        flow: 'Lejátszás:',
        play: 'Lejátszás',
        pause: 'Szünet',
        stop: 'Leállítás',

        advertisement: 'HIRDETÉS',
        content: 'TARTALOM'
      };
    }

    return {
      status: 'Status:',
      time: 'Zeit:',
      mode: 'Modus:',
      flow: 'Ablauf:',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',

      advertisement: 'WERBUNG',
      content: 'INHALT'
    };
  }

  /**
   * Baut ausschließlich das Grundgerüst der Playeransicht auf.
   *
   * @param {HTMLElement} container
   */
  function createPlayerView(container) {
    var t = getTexts();

    container.innerHTML =
      '<main class="player">' +

      '  <div class="player-window">' +
      '    <video class="player-video"></video>' +
      '    <p class="player-video-message" hidden></p>' +
      '  </div>' +

      '  <hr class="player-rule" />' +

      '  <p class="player-row">' +
      '    <span class="player-label">' + t.status + '</span> ' +
      '    <strong class="player-status">IDLE</strong>' +
      '  </p>' +

      '  <p class="player-row">' +
      '    <span class="player-label">' + t.time + '</span> ' +
      '    <strong class="player-time">00:00 / 00:00</strong>' +
      '  </p>' +

      '  <p class="player-row player-row-flow" hidden>' +
      '    <span class="player-label">' + t.mode + '</span> ' +
      '    <strong class="player-mode">—</strong>' +
      '  </p>' +

      '  <p class="player-row player-row-flow" hidden>' +
      '    <span class="player-label">' + t.flow + '</span> ' +
      '    <strong class="player-flow-state">—</strong>' +
      '  </p>' +

      '  <hr class="player-rule" />' +

      '  <div class="player-controls">' +
      '    <button type="button" class="player-btn" data-action="play">' +
             t.play +
      '    </button>' +

      '    <button type="button" class="player-btn" data-action="pause">' +
             t.pause +
      '    </button>' +

      '    <button type="button" class="player-btn" data-action="stop">' +
             t.stop +
      '    </button>' +
      '  </div>' +

      '</main>';

    var videoEl = container.querySelector('.player-video');

    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('preload', 'metadata');
    videoEl.controls = false;

    return {
      videoEl: videoEl,

      statusEl:
        container.querySelector('.player-status'),

      timeEl:
        container.querySelector('.player-time'),

      messageEl:
        container.querySelector('.player-video-message'),

      modeRowEl:
        container.querySelectorAll('.player-row-flow')[0],

      modeEl:
        container.querySelector('.player-mode'),

      flowStateRowEl:
        container.querySelectorAll('.player-row-flow')[1],

      flowStateEl:
        container.querySelector('.player-flow-state'),

      playBtn:
        container.querySelector('[data-action="play"]'),

      pauseBtn:
        container.querySelector('[data-action="pause"]'),

      stopBtn:
        container.querySelector('[data-action="stop"]')
    };
  }

  /**
   * Verknüpft Playeransicht und Controller.
   */
  function wirePlayerView(
    view,
    statusSource,
    actionTarget,
    flowController
  ) {

    var actions = actionTarget || statusSource;
    var t = getTexts();

    function updateStatus(currentState) {
      view.statusEl.textContent = currentState;

      if (currentState === statusSource.STATES.ERROR) {

        view.messageEl.hidden = false;
        view.messageEl.textContent =
          statusSource.getErrorMessage();

      } else {

        view.messageEl.hidden = true;
        view.messageEl.textContent = '';
      }
    }

    function updateTime() {
      view.timeEl.textContent =
        formatTime(statusSource.currentTime) +
        ' / ' +
        formatTime(statusSource.duration);
    }

    statusSource.onStateChange(updateStatus);
    statusSource.onTimeUpdate(updateTime);

    // Anfangszustand sofort anzeigen.
    updateStatus(statusSource.state);
    updateTime();

    if (flowController) {

      view.modeRowEl.hidden = false;
      view.flowStateRowEl.hidden = false;

      function updateFlow() {

        var mode =
          flowController.getCurrentMode();

        view.modeEl.textContent =
          mode === flowController.MODES.ADVERTISEMENT
            ? t.advertisement

            : mode === flowController.MODES.CONTENT
              ? t.content

              : '—';

        view.flowStateEl.textContent =
          flowController.getState();
      }

      flowController.onChange(updateFlow);
      updateFlow();
    }

    view.playBtn.addEventListener(
      'click',
      function () {
        actions.play();
      }
    );

    view.pauseBtn.addEventListener(
      'click',
      function () {
        actions.pause();
      }
    );

    view.stopBtn.addEventListener(
      'click',
      function () {
        actions.stop();
        updateTime();
      }
    );
  }

  ns.PlayerUI = {
    formatTime: formatTime,
    createPlayerView: createPlayerView,
    wirePlayerView: wirePlayerView
  };

})(window.ONLANG.player);
