// advertising-ui.js
//
// Zeigt AUSSCHLIESSLICH die Kennzeichnung
// "WERBUNG"/"JETZT LÄUFT" samt Titel an.
//
// Für HU001 / Darazsak werden die sichtbaren Texte ungarisch
// ausgegeben. Alle anderen Mandanten bleiben deutsch.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.advertising = window.ONLANG.advertising || {};

(function (ns) {
  'use strict';

  function isDarazsak() {
    var switcher = document.getElementById('tv-tenant-switcher');

    if (
      switcher &&
      String(switcher.value || '').toUpperCase() === 'HU001'
    ) {
      return true;
    }

    try {
      var params = new URLSearchParams(window.location.search);
      return String(params.get('kunde') || '').toUpperCase() === 'HU001';
    } catch (e) {
      return false;
    }
  }

  function getTexts() {
    if (isDarazsak()) {
      return {
        advertisement: 'HIRDETÉS',
        nowPlaying: 'MOST MŰSORON',
        next: 'KÖVETKEZIK',
        after: 'UTÁNA'
      };
    }

    return {
      advertisement: 'WERBUNG',
      nowPlaying: 'JETZT LÄUFT',
      next: 'ALS NÄCHSTES',
      after: 'DANACH'
    };
  }

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
      afterTitleEl: container.querySelector('.upcoming-after-title')
    };
  }

  /**
   * @param {ReturnType<typeof createAdvertisingView>} view
   * @param {ReturnType<window.ONLANG.playback.PlaybackFlowController.createPlaybackFlowController>} flowController
   */
  function wireAdvertisingView(view, flowController) {

    function render() {
      var t = getTexts();
      var info = flowController.getNowPlayingInfo();

      if (!info || !info.tag) {
        view.rootEl.hidden = true;
        return;
      }

      view.rootEl.hidden = false;

      var isAdvertisement =
        info.tag === 'WERBUNG' ||
        info.tag === 'HIRDETÉS';

      view.rootEl.classList.toggle(
        'now-playing-ad',
        isAdvertisement
      );

      view.rootEl.classList.toggle(
        'now-playing-content',
        !isAdvertisement
      );

      // Der Controller liefert intern weiterhin die deutschen Tags.
      // Nur die sichtbare Darstellung wird für HU001 übersetzt.
      if (isDarazsak()) {
        view.tagEl.textContent =
          info.tag === 'WERBUNG'
            ? t.advertisement
            : t.nowPlaying;
      } else {
        view.tagEl.textContent = info.tag;
      }

      view.titleEl.textContent =
        info.title || '';

      var upcoming =
        flowController.getUpcomingInfo
          ? flowController.getUpcomingInfo()
          : null;

      if (!upcoming || !upcoming.nextTitle) {
        view.upcomingEl.hidden = true;
        return;
      }

      view.upcomingEl.hidden = false;

      view.upcomingTagEl.textContent =
        isDarazsak()
          ? t.next
          : (upcoming.nextTag || t.next);

      view.upcomingTitleEl.textContent =
        upcoming.nextTitle;

      if (upcoming.afterTitle) {

        view.afterEl.hidden = false;

        view.afterTagEl.textContent =
          isDarazsak()
            ? t.after
            : (upcoming.afterTag || t.after);

        view.afterTitleEl.textContent =
          upcoming.afterTitle;

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
    wireAdvertisingView: wireAdvertisingView
  };

})(window.ONLANG.advertising);
