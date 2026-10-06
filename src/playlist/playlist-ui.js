// playlist-ui.js
//
// Verantwortlich AUSSCHLIESSLICH für: Darstellung der Playlist,
// Klickverarbeitung, aktive Markierung, Anzeige von Titel/Kategorie/
// Dauer, Leerzustand, Fehlerzustand. KEINE Playerlogik in dieser Datei.
//
// Die sichtbaren Playlist-Texte folgen der Sprache des Vereins
// (kunden.sprache über TenantService.getLanguage()): hu = ungarisch,
// sonst deutsch.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.playlist = window.ONLANG.playlist || {};

(function (ns) {
  'use strict';

  function isHungarian() {
    var service =
      window.ONLANG.tenant &&
      window.ONLANG.tenant.TenantService;

    return !!service && service.getLanguage() === 'hu';
  }

  // true = TV gerade nicht erreichbar (statt: Sender hat noch keine Videos).
  function isUnavailable() {
    var service =
      window.ONLANG.tenant &&
      window.ONLANG.tenant.TenantService;

    return !!service && service.getState() === 'unavailable';
  }

  function getTexts() {
    if (isHungarian()) {
      return {
        title: 'Műsor',
        subtitle: 'Automatikus váltás hirdetéssel',
        subtitleNoAds: 'Automatikus váltás',
        typeVideo: 'Videó',
        typeAd: 'Reklám',
        auto: 'AUTO',
        running: 'MOST',
        empty: 'Még nincsenek videók.',
        unavailable: 'A TV jelenleg nem érhető el.',
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
      subtitleNoAds: 'Automatischer Wechsel',
      typeVideo: 'Video',
      typeAd: 'Werbespot',
      auto: 'AUTO',
      running: 'LÄUFT',
      empty: 'Noch keine Videos.',
      unavailable: 'TV gerade nicht erreichbar.',
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
      subtitleEl: container.querySelector('.playlist-subtitle'),
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

      // "mit Werbespot" nur, wenn wirklich ein Spot eingeplant ist.
      if (view.subtitleEl && controller.hasAdvertisement) {
        view.subtitleEl.textContent =
          controller.hasAdvertisement() ? t.subtitle : t.subtitleNoAds;
      }

      // Läuft gerade ein Werbespot, ist kein Video "dran".
      var adRunning =
        !!controller.getCurrentMode &&
        !!controller.MODES &&
        controller.getCurrentMode() === controller.MODES.ADVERTISEMENT;

      view.listEl.innerHTML = '';
      view.messageEl.hidden = true;
      view.messageEl.textContent = '';

      if (status === controller.STATUSES.EMPTY) {
        view.messageEl.hidden = false;
        view.messageEl.textContent =
          isUnavailable() ? t.unavailable : t.empty;
        return;
      }

      items.forEach(function (item, index) {
        var li = document.createElement('li');
        li.className = 'playlist-item';
        li.tabIndex = 0;

        var isCurrent = index === currentIndex && !adRunning;

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

        // Typ aus tv_inhalte in der Sprache des Vereins; andere
        // Kategorien (Demo-Sender) bleiben, wie sie sind.
        var typeLabels = {
          VIDEO: t.typeVideo,
          WERBESPOT: t.typeAd
        };

        var rawCategory =
          item && item.category
            ? item.category
            : '';

        var category =
          typeLabels[rawCategory] || rawCategory;

        // Dauer nur, wenn sie etwas anderes sagt als der Typ.
        var durationLabel =
          item &&
          item.durationLabel &&
          item.durationLabel !== rawCategory
            ? item.durationLabel
            : '';

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
          [category, durationLabel].filter(Boolean).join(' · ') || '—';

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
