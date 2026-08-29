// playlist-ui.js
//
// Verantwortlich AUSSCHLIESSLICH für: Darstellung der Playlist,
// Klickverarbeitung, aktive Markierung, Anzeige von Titel/Kategorie/
// Dauer, Leerzustand, Fehlerzustand. KEINE Playerlogik in dieser Datei.
//
// Für HU001 / Darazsak werden die sichtbaren Playlist-Texte ungarisch
// ausgegeben. Alle anderen Mandanten behalten die deutsche Oberfläche.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.playlist = window.ONLANG.playlist || {};

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
        title: 'Műsor',
        subtitle: 'Automatikus váltás hirdetéssel',
        auto: 'AUTO',
        running: 'MOST',
        empty: 'Nincs lejátszási lista.',
        unknownVideo: 'Ismeretlen videó',
        errorPrefix: 'Hiba ennél: „',
        errorFallback: 'ez a bejegyzés',
        errorSuffix: '”: A videót nem sikerült betölteni.',
        finished: 'A műsor véget ért.'
      };
    }

    return {
      title: 'Programm',
      subtitle: 'Automatischer Wechsel mit Werbespot',
      auto: 'AUTO',
      running: 'LÄUFT',
      empty: 'Keine Playlist-Einträge vorhanden.',
      unknownVideo: 'Unbekanntes Video',
      errorPrefix: 'Fehler bei „',
      errorFallback: 'diesem Eintrag',
      errorSuffix: '": Video konnte nicht geladen werden.',
      finished: 'Playlist beendet.'
    };
  }

  /**
   * Baut das Grundgerüst der Playlist-Ansicht auf.
   * @param {HTMLElement} container
   */
  function createPlaylistView(container) {
    var t = getTexts();

    container.innerHTML =
      '<section class="playlist">' +
      '  <div class="playlist-header">' +
      '    <div>' +
      '      <h2 class="playlist-title">' + t.title + '</h2>' +
      '      <p class="playlist-subtitle">' + t.subtitle + '</p>' +
      '    </div>' +
      '    <span class="playlist-auto-badge">' + t.auto + '</span>' +
      '  </div>' +
      '  <ol class="playlist-list"></ol>' +
      '  <p class="playlist-message" hidden></p>' +
      '</section>';

    return {
      listEl: container.querySelector('.playlist-list'),
      messageEl: container.querySelector('.playlist-message')
    };
  }

  /**
   * Verknüpft die Ansicht mit einem PlaylistController.
   */
  function wirePlaylistView(view, controller) {
    function render() {
      var t = getTexts();
      var items = controller.getItems();
      var currentIndex = controller.getCurrentIndex();
      var status = controller.getStatus();

      view.listEl.innerHTML = '';
      view.messageEl.hidden = true;
      view.messageEl.textContent = '';

      if (status === controller.STATUSES.EMPTY) {
        view.messageEl.hidden = false;
        view.messageEl.textContent = t.empty;
        return;
      }

      items.forEach(function (item, index) {
        var li = document.createElement('li');
        li.className = 'playlist-item';
        li.tabIndex = 0;

        var isCurrent = index === currentIndex;

        if (isCurrent) {
          li.classList.add('active');
        }

        if (
          isCurrent &&
          status === controller.STATUSES.ERROR
        ) {
          li.classList.add('error');
        }

        var title =
          item && item.title
            ? item.title
            : t.unknownVideo;

        var category =
          item && item.category
            ? item.category
            : '—';

        var durationLabel =
          item && item.durationLabel
            ? item.durationLabel
            : '--:--';

        li.innerHTML =
          '<span class="playlist-item-number"></span>' +
          '<span class="playlist-item-body">' +
          '  <span class="playlist-item-heading">' +
          '    <span class="playlist-item-title"></span>' +
          '    <span class="playlist-item-live">' + t.running + '</span>' +
          '  </span>' +
          '  <span class="playlist-item-meta"></span>' +
          '</span>';

        li.querySelector('.playlist-item-number').textContent =
          (index + 1) + '.';

        li.querySelector('.playlist-item-title').textContent =
          title;

        li.querySelector('.playlist-item-meta').textContent =
          category + ' · ' + durationLabel;

        function activate() {
          controller.select(index);
        }

        li.addEventListener('click', activate);

        li.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            activate();
          }
        });

        view.listEl.appendChild(li);
      });

      if (status === controller.STATUSES.ERROR) {
        var errorItem = controller.getCurrentItem();

        view.messageEl.hidden = false;
        view.messageEl.textContent =
          t.errorPrefix +
          (
            errorItem && errorItem.title
              ? errorItem.title
              : t.errorFallback
          ) +
          t.errorSuffix;

      } else if (status === controller.STATUSES.FINISHED) {

        view.messageEl.hidden = false;
        view.messageEl.textContent = t.finished;
      }
    }

    controller.onChange(render);
    render();
  }

  ns.PlaylistUI = {
    createPlaylistView: createPlaylistView,
    wirePlaylistView: wirePlaylistView
  };

})(window.ONLANG.playlist);
