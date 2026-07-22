// playlist-ui.js
//
// Verantwortlich AUSSCHLIESSLICH für: Darstellung der Playlist,
// Klickverarbeitung, aktive Markierung, Anzeige von Titel/Kategorie/
// Dauer, Leerzustand, Fehlerzustand. KEINE Playerlogik in dieser Datei.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.playlist = window.ONLANG.playlist || {};

(function (ns) {
  'use strict';

  /**
   * Baut das Grundgerüst der Playlist-Ansicht auf.
   * @param {HTMLElement} container
   */
  function createPlaylistView(container) {
    container.innerHTML =
      '<section class="playlist">' +
      '  <div class="playlist-header">' +
      '    <div>' +
      '      <h2 class="playlist-title">Programm</h2>' +
      '      <p class="playlist-subtitle">Automatischer Wechsel mit Werbespot</p>' +
      '    </div>' +
      '    <span class="playlist-auto-badge">AUTO</span>' +
      '  </div>' +
      '  <ol class="playlist-list"></ol>' +
      '  <p class="playlist-message" hidden></p>' +
      '</section>';

    return {
      listEl: container.querySelector('.playlist-list'),
      messageEl: container.querySelector('.playlist-message'),
    };
  }

  /**
   * Verknüpft die Ansicht mit einem PlaylistController: Klicks -> select(),
   * Controller-Änderungen -> Neurendern.
   * @param {ReturnType<typeof createPlaylistView>} view
   * @param {ReturnType<ns.PlaylistController.createPlaylistController>} controller
   */
  function wirePlaylistView(view, controller) {
    function render() {
      var items = controller.getItems();
      var currentIndex = controller.getCurrentIndex();
      var status = controller.getStatus();

      view.listEl.innerHTML = '';
      view.messageEl.hidden = true;
      view.messageEl.textContent = '';

      if (status === controller.STATUSES.EMPTY) {
        view.messageEl.hidden = false;
        view.messageEl.textContent = 'Keine Playlist-Einträge vorhanden.';
        return;
      }

      items.forEach(function (item, index) {
        var li = document.createElement('li');
        li.className = 'playlist-item';
        li.tabIndex = 0;

        var isCurrent = index === currentIndex;
        if (isCurrent) li.classList.add('active');
        if (isCurrent && status === controller.STATUSES.ERROR) {
          li.classList.add('error');
        }

        var title = item && item.title ? item.title : 'Unbekanntes Video';
        var category = item && item.category ? item.category : '—';
        var durationLabel = item && item.durationLabel ? item.durationLabel : '--:--';

        li.innerHTML =
          '<span class="playlist-item-number"></span>' +
          '<span class="playlist-item-body">' +
          '  <span class="playlist-item-heading">' +
          '    <span class="playlist-item-title"></span>' +
          '    <span class="playlist-item-live">LÄUFT</span>' +
          '  </span>' +
          '  <span class="playlist-item-meta"></span>' +
          '</span>';

        li.querySelector('.playlist-item-number').textContent = (index + 1) + '.';
        li.querySelector('.playlist-item-title').textContent = title;
        li.querySelector('.playlist-item-meta').textContent = category + ' · ' + durationLabel;

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
          'Fehler bei „' + (errorItem && errorItem.title ? errorItem.title : 'diesem Eintrag') +
          '": Video konnte nicht geladen werden.';
      } else if (status === controller.STATUSES.FINISHED) {
        view.messageEl.hidden = false;
        view.messageEl.textContent = 'Playlist beendet.';
      }
    }

    controller.onChange(render);
    render();
  }

  ns.PlaylistUI = {
    createPlaylistView: createPlaylistView,
    wirePlaylistView: wirePlaylistView,
  };
})(window.ONLANG.playlist);
