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

  function isHungarian() {
    var service =
      window.ONLANG.tenant &&
      window.ONLANG.tenant.TenantService;

    return !!service && service.getLanguage() === 'hu';
  }

  function getTexts() {
    if (isHungarian()) {
      return {
        tvInfo: 'TV információk',
        footerVersion: 'ONLANG TV – Bemutató verzió 1.0',
        inProgram: 'A műsorban: ',
        automaticTicker: 'Automatikus műsorszórás',
        sponsorTicker: 'Szponzorhirdetések a műsorszámok között'
      };
    }

    return {
      tvInfo: 'TV Informationen',
      footerVersion: 'ONLANG TV – Präsentationsversion 1.0',
      inProgram: 'Jetzt im Programm von ',
      automaticTicker: 'Automatischer Sendebetrieb',
      sponsorTicker: 'Werbespots zwischen den Beiträgen'
    };
  }

  function render(container, data) {
    var t = getTexts();

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
      '      <div class="tv-info-ticker tv-info-ticker--embed" role="region" aria-label="' + t.tvInfo + '">' +
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
      '    <strong>' + t.footerVersion + '</strong>' +
      '    <span>© 2026 ONLANG</span>' +
      '  </footer>' +
      '</div>';

    ns.ViewHelpers.applyHeader(container, data);
    ns.ViewHelpers.applyPresenter(container, data);
    renderTicker(container, data);
    setupEmbedAutoHeight(container);
    return ns.ViewHelpers.createModuleViews(container);
  }

  function setupEmbedAutoHeight(container) {
    if (window.parent === window) return;

    var lastHeight = 0;
    var sendHeight = function () {
      var app = container.querySelector('.tv-app--embed');
      if (!app) return;
      var height = Math.ceil(app.getBoundingClientRect().height);
      if (!height || height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({
        type: 'onlang-tv-resize',
        height: height
      }, '*');
    };

    sendHeight();

    if (window.ResizeObserver) {
      var observer = new ResizeObserver(sendHeight);
      observer.observe(container);
      observer.observe(document.documentElement);
    } else {
      window.addEventListener('load', sendHeight);
      window.addEventListener('resize', sendHeight);
    }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(sendHeight);
    }
  }

  function renderTicker(container, data) {
    var label = container.querySelector('.tv-info-ticker-label');
    var groups = container.querySelectorAll('.tv-info-ticker-group');
    var tenantName = data.tenant.name || 'ONLANG TV';
    if (label) label.textContent = tenantName;

    var t = getTexts();
    var messages = [t.inProgram + tenantName];
    (data.videos || []).forEach(function (item) {
      if (item && item.title) messages.push(item.title);
    });
    (data.categories || []).forEach(function (item) {
      if (item && item.label) messages.push(item.label);
    });
    messages.push(t.automaticTicker, t.sponsorTicker);

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
