// player-ui.js
//
// Extrem einfache Playeransicht — keine Playlist, keine Werbung, keine
// Logos, keine Kategorien, keine Overlays. Nur: Titel, Videofenster,
// Status, Zeit, drei Buttons (Play/Pause/Stop).
//
// Klassisches <script>, KEIN ES-Modul (siehe player-state.js für die
// Begründung).

window.ONLANG = window.ONLANG || {};
window.ONLANG.player = window.ONLANG.player || {};

(function (ns) {
  'use strict';

  function formatTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) seconds = 0;
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }

  /**
   * Baut ausschließlich das Grundgerüst der Playeransicht auf und gibt
   * die relevanten Elementreferenzen zurück. Verknüpft noch KEINEN
   * Controller — das übernimmt wirePlayerView() separat, weil das
   * <video>-Element erst existieren muss, bevor ein Controller darauf
   * aufgebaut werden kann.
   *
   * @param {HTMLElement} container
   * @returns {{ videoEl: HTMLVideoElement, statusEl: HTMLElement,
   *             timeEl: HTMLElement, messageEl: HTMLElement,
   *             playBtn: HTMLElement, pauseBtn: HTMLElement,
   *             stopBtn: HTMLElement }}
   */
  function createPlayerView(container) {
    container.innerHTML =
      '<main class="player">' +
      '  <div class="player-window">' +
      '    <video class="player-video"></video>' +
      '    <p class="player-video-message" hidden></p>' +
      '  </div>' +
      '  <hr class="player-rule" />' +
      '  <p class="player-row"><span class="player-label">Status:</span> <strong class="player-status">IDLE</strong></p>' +
      '  <p class="player-row"><span class="player-label">Zeit:</span> <strong class="player-time">00:00 / 00:00</strong></p>' +
      '  <p class="player-row player-row-flow" hidden><span class="player-label">Modus:</span> <strong class="player-mode">—</strong></p>' +
      '  <p class="player-row player-row-flow" hidden><span class="player-label">Ablauf:</span> <strong class="player-flow-state">—</strong></p>' +
      '  <hr class="player-rule" />' +
      '  <div class="player-controls">' +
      '    <button type="button" class="player-btn" data-action="play">Play</button>' +
      '    <button type="button" class="player-btn" data-action="pause">Pause</button>' +
      '    <button type="button" class="player-btn" data-action="stop">Stop</button>' +
      '  </div>' +
      '</main>';

    var videoEl = container.querySelector('.player-video');
    videoEl.setAttribute('playsinline', '');
    videoEl.setAttribute('preload', 'metadata');
    videoEl.controls = false;

    return {
      videoEl: videoEl,
      statusEl: container.querySelector('.player-status'),
      timeEl: container.querySelector('.player-time'),
      messageEl: container.querySelector('.player-video-message'),
      modeRowEl: container.querySelectorAll('.player-row-flow')[0],
      modeEl: container.querySelector('.player-mode'),
      flowStateRowEl: container.querySelectorAll('.player-row-flow')[1],
      flowStateEl: container.querySelector('.player-flow-state'),
      playBtn: container.querySelector('[data-action="play"]'),
      pauseBtn: container.querySelector('[data-action="pause"]'),
      stopBtn: container.querySelector('[data-action="stop"]'),
    };
  }

  /**
   * Verknüpft eine per createPlayerView() gebaute Ansicht.
   *
   * Status- und Zeitanzeige (Punkt 14, "bleibt erhalten") werden immer
   * vom echten Player gespeist ("statusSource") — unabhängig davon, ob
   * gerade ein Werbespot oder ein Inhaltsvideo läuft, ist das der
   * einzige Ort, der den WIRKLICHEN Medienzustand kennt.
   *
   * Die Buttons rufen "actionTarget" auf. Ab Schritt 4 ist das der
   * PlaybackFlowController (damit "Play" ggf. zuerst den Spot startet
   * statt direkt den Player) — fehlt actionTarget, wird statusSource
   * verwendet (Schritt-2/3-Verhalten bleibt unverändert erhalten).
   *
   * Optional: flowController — falls übergeben, werden zusätzlich die
   * Zeilen "Modus:"/"Ablauf:" eingeblendet und aus dem tatsächlichen
   * Ablaufzustand gespeist (Punkt 14), niemals durch einen Timer.
   *
   * @param {ReturnType<typeof createPlayerView>} view
   * @param {ReturnType<ns.PlayerController.createPlayerController>} statusSource
   * @param {{ play: Function, pause: Function, stop: Function }} [actionTarget]
   * @param {ReturnType<window.ONLANG.playback.PlaybackFlowController.createPlaybackFlowController>} [flowController]
   */
  function wirePlayerView(view, statusSource, actionTarget, flowController) {
    var actions = actionTarget || statusSource;

    function updateStatus(currentState) {
      view.statusEl.textContent = currentState;

      if (currentState === statusSource.STATES.ERROR) {
        view.messageEl.hidden = false;
        view.messageEl.textContent = statusSource.getErrorMessage();
      } else {
        view.messageEl.hidden = true;
        view.messageEl.textContent = '';
      }
    }

    function updateTime() {
      view.timeEl.textContent = formatTime(statusSource.currentTime) + ' / ' + formatTime(statusSource.duration);
    }

    statusSource.onStateChange(updateStatus);
    statusSource.onTimeUpdate(updateTime);

    // Anfangszustand sofort anzeigen (nicht erst beim ersten Event).
    updateStatus(statusSource.state);
    updateTime();

    if (flowController) {
      view.modeRowEl.hidden = false;
      view.flowStateRowEl.hidden = false;

      function updateFlow() {
        var mode = flowController.getCurrentMode();
        view.modeEl.textContent = mode === flowController.MODES.ADVERTISEMENT ? 'WERBUNG'
          : mode === flowController.MODES.CONTENT ? 'INHALT'
          : '—';
        view.flowStateEl.textContent = flowController.getState();
      }

      flowController.onChange(updateFlow);
      updateFlow();
    }

    view.playBtn.addEventListener('click', function () {
      actions.play();
    });
    view.pauseBtn.addEventListener('click', function () {
      actions.pause();
    });
    view.stopBtn.addEventListener('click', function () {
      actions.stop();
      updateTime();
    });
  }

  ns.PlayerUI = {
    formatTime: formatTime,
    createPlayerView: createPlayerView,
    wirePlayerView: wirePlayerView,
  };
})(window.ONLANG.player);
