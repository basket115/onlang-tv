// embed-view.js
//
// Kompakte Website-Einbettung: kleiner Senderkopf, großer Player,
// Programmübersicht und Themen-Ticker. Keine Partner, kein Vereinswechsel
// und keine weiteren Website-Bereiche. Player-/Playlist-/Werbelogik bleibt
// unverändert und wird weiterhin zentral durch main.js verdrahtet.

window.ONLANG = window.ONLANG || {};
window.ONLANG.views = window.ONLANG.views || {};

(function (ns) {
  'use strict';

  function render(container, data) {
    container.innerHTML =
      '<div class="tv-app tv-app--embed">' +
      '  <header class="tv-header tv-header--compact">' +
      '    <div class="tv-header-brand">' +
      '      <div class="tv-logo tv-logo--small"></div>' +
      '      <div class="tv-brand-text">' +
      '        <h1 class="tv-name tv-name--small"></h1>' +
      '        <p class="tv-tagline tv-tagline--embed"></p>' +
      '      </div>' +
      '    </div>' +
      '    <span class="tv-embed-live"><span></span>TV</span>' +
      '  </header>' +
      '  <main class="tv-main tv-main--embed">' +
      '    <div class="tv-player-col">' +
      '      <div class="tv-presenter-bar" hidden>' +
      '        <span class="tv-presenter-label"></span>' +
      '        <span class="tv-presenter-name"></span>' +
      '      </div>' +
      '      <div id="now-playing-container"></div>' +
      '      <div id="player-container"></div>' +
      '      <div class="tv-info-ticker tv-info-ticker--embed" role="region" aria-label="TV Informationen">' +
      '        <div class="tv-info-ticker-label"></div>' +
      '        <div class="tv-info-ticker-window">' +
      '          <div class="tv-info-ticker-track">' +
      '            <div class="tv-info-ticker-group"></div>' +
      '            <div class="tv-info-ticker-group" aria-hidden="true"></div>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '    </div>' +
      '    <aside id="playlist-container" class="tv-playlist-col"></aside>' +
      '  </main>' +
      '  <footer class="tv-footer tv-footer--embed">' +
      '    <strong>ONLANG TV – Präsentationsversion 1.0</strong>' +
      '    <span>© 2026 ONLANG</span>' +
      '  </footer>' +
      '</div>';

    ns.ViewHelpers.applyHeader(container, data);
    ns.ViewHelpers.applyPresenter(container, data);
    renderTicker(container, data);
    return ns.ViewHelpers.createModuleViews(container);
  }

  function renderTicker(container, data) {
    var label = container.querySelector('.tv-info-ticker-label');
    var groups = container.querySelectorAll('.tv-info-ticker-group');
    var tenantName = data.tenant.name || 'ONLANG TV';
    if (label) label.textContent = tenantName;

    var messages = ['Jetzt im Programm von ' + tenantName];
    (data.videos || []).forEach(function (item) {
      if (item && item.title) messages.push(item.title);
    });
    (data.categories || []).forEach(function (item) {
      if (item && item.label) messages.push(item.label);
    });
    messages.push('Automatischer Sendebetrieb', 'Werbespots zwischen den Beiträgen');

    Array.prototype.forEach.call(groups, function (group) {
      group.innerHTML = '';
      messages.forEach(function (message) {
        var text = document.createElement('span');
        text.textContent = message;
        group.appendChild(text);
        var separator = document.createElement('span');
        separator.setAttribute('aria-hidden', 'true');
        separator.textContent = '•';
        group.appendChild(separator);
      });
    });
  }

  ns.EmbedView = { render: render };
})(window.ONLANG.views);
