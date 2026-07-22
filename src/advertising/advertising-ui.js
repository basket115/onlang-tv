// advertising-ui.js
//
// Zeigt AUSSCHLIESSLICH die Kennzeichnung "WERBUNG"/"JETZT LÄUFT" samt
// Titel an (siehe Anweisung, Punkt 13). Kennt WEDER den Player noch die
// Playlist direkt — liest ausschließlich die bereits aufbereitete
// Anzeige-Information vom PlaybackFlowController
// (getNowPlayingInfo()/onChange()). So bleibt die Trennregel "Werbung
// kennt keine Playlist" auch auf UI-Ebene eingehalten.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.advertising = window.ONLANG.advertising || {};

(function (ns) {
  'use strict';

  function createAdvertisingView(container) {
    container.innerHTML =
      '<div class="now-playing" hidden>' +
      '  <div class="now-playing-current">' +
      '    <div class="now-playing-signal" aria-hidden="true">' +
      '      <span class="now-playing-dot"></span>' +
      '    </div>' +
      '    <div class="now-playing-copy">' +
      '      <span class="now-playing-tag"></span>' +
      '      <span class="now-playing-title"></span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="now-playing-upcoming">' +
      '    <div class="upcoming-primary">' +
      '      <span class="upcoming-icon" aria-hidden="true">▶</span>' +
      '      <span class="upcoming-copy">' +
      '        <span class="upcoming-tag"></span>' +
      '        <span class="upcoming-title"></span>' +
      '      </span>' +
      '    </div>' +
      '    <div class="upcoming-after" hidden>' +
      '      <span class="upcoming-after-tag"></span>' +
      '      <span class="upcoming-after-title"></span>' +
      '    </div>' +
      '  </div>' +
      '</div>';

    return {
      rootEl: container.querySelector('.now-playing'),
      tagEl: container.querySelector('.now-playing-tag'),
      titleEl: container.querySelector('.now-playing-title'),
      upcomingEl: container.querySelector('.now-playing-upcoming'),
      upcomingTagEl: container.querySelector('.upcoming-tag'),
      upcomingTitleEl: container.querySelector('.upcoming-title'),
      afterEl: container.querySelector('.upcoming-after'),
      afterTagEl: container.querySelector('.upcoming-after-tag'),
      afterTitleEl: container.querySelector('.upcoming-after-title'),
    };
  }

  /**
   * @param {ReturnType<typeof createAdvertisingView>} view
   * @param {ReturnType<window.ONLANG.playback.PlaybackFlowController.createPlaybackFlowController>} flowController
   */
  function wireAdvertisingView(view, flowController) {
    function render() {
      var info = flowController.getNowPlayingInfo();

      if (!info || !info.tag) {
        view.rootEl.hidden = true;
        return;
      }

      view.rootEl.hidden = false;
      view.rootEl.classList.toggle('now-playing-ad', info.tag === 'WERBUNG');
      view.rootEl.classList.toggle('now-playing-content', info.tag !== 'WERBUNG');
      view.tagEl.textContent = info.tag;
      view.titleEl.textContent = info.title || '';

      var upcoming = flowController.getUpcomingInfo ? flowController.getUpcomingInfo() : null;
      if (!upcoming || !upcoming.nextTitle) {
        view.upcomingEl.hidden = true;
        return;
      }

      view.upcomingEl.hidden = false;
      view.upcomingTagEl.textContent = upcoming.nextTag || 'ALS NÄCHSTES';
      view.upcomingTitleEl.textContent = upcoming.nextTitle;

      if (upcoming.afterTitle) {
        view.afterEl.hidden = false;
        view.afterTagEl.textContent = upcoming.afterTag || 'DANACH';
        view.afterTitleEl.textContent = upcoming.afterTitle;
      } else {
        view.afterEl.hidden = true;
        view.afterTagEl.textContent = '';
        view.afterTitleEl.textContent = '';
      }
    }

    flowController.onChange(render);
    render();
  }

  ns.AdvertisingUI = {
    createAdvertisingView: createAdvertisingView,
    wireAdvertisingView: wireAdvertisingView,
  };
})(window.ONLANG.advertising);
