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

  // true = neutraler Demo-Sender. Nur dort bleiben die festen Demo-Inhalte.
  function isDemo() {
    var service =
      window.ONLANG.tenant &&
      window.ONLANG.tenant.TenantService;

    return !!service && service.isDemo();
  }

  function getTexts() {
    if (isHungarian()) {
      return {
        tvInfo: 'TV információk',
        footerVersion: 'ONLANG TV – Bemutató verzió 1.0',
        footerName: 'ONLANG TV',
        inProgram: 'A műsorban: ',
        automaticTicker: 'Automatikus műsorszórás',
        sponsorTicker: 'Szponzorhirdetések a műsorszámok között'
      };
    }

    return {
      tvInfo: 'TV Informationen',
      footerVersion: 'ONLANG TV – Präsentationsversion 1.0',
      footerName: 'ONLANG TV',
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
      '    <strong>' + (isDemo() ? t.footerVersion : t.footerName) + '</strong>' +
      '    <span>© ' + new Date().getFullYear() + ' ONLANG</span>' +
      '  </footer>' +
      '</div>';

    ns.ViewHelpers.applyHeader(container, data);
    ns.ViewHelpers.applyPresenter(container, data);
    renderTicker(container, data);
    setupEmbedAutoHeight(container);
    return ns.ViewHelpers.createModuleViews(container);
  }

  // Meldet der einbettenden Seite die Höhe des Inhalts (postMessage
  // "onlang-tv-resize"), damit sie ihr Fenster ohne eigenen Rollbalken
  // anpassen kann. Gemeldet wird bei jeder Größenänderung, auch beim
  // Kleinerwerden: Inhalt und Fensterbreite (ResizeObserver, resize),
  // Videowechsel und Programmliste (MutationObserver, loadedmetadata).
  function setupEmbedAutoHeight(container) {
    if (window.parent === window) return;

    var ENTPRELLEN_MS = 80;
    var lastHeight = 0;
    var timer = null;

    function sendHeight() {
      timer = null;
      var app = container.querySelector('.tv-app--embed');
      if (!app) return;

      // Höhe des Inhalts plus der Rand der Seite (body-padding).
      var body = window.getComputedStyle(document.body);
      var height = Math.ceil(
        app.getBoundingClientRect().height +
        (parseFloat(body.paddingTop) || 0) +
        (parseFloat(body.paddingBottom) || 0)
      );

      if (!height || height === lastHeight) return;
      lastHeight = height;
      window.parent.postMessage({
        type: 'onlang-tv-resize',
        height: height
      }, '*');
    }

    function scheduleHeight() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(sendHeight, ENTPRELLEN_MS);
    }

    sendHeight();

    var app = container.querySelector('.tv-app--embed');

    if (window.ResizeObserver && app) {
      new ResizeObserver(scheduleHeight).observe(app);
    }

    // Videowechsel, "Jetzt läuft" und Programmliste ändern den Inhalt.
    if (window.MutationObserver && app) {
      new MutationObserver(scheduleHeight).observe(app, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['hidden', 'class', 'style']
      });
    }

    window.addEventListener('load', scheduleHeight);
    window.addEventListener('resize', scheduleHeight);
    window.addEventListener('orientationchange', scheduleHeight);
    container.addEventListener('loadedmetadata', scheduleHeight, true);

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleHeight);
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
    // Feste Texte nur beim neutralen Demo-Sender; bei Vereinen stehen
    // im Laufband nur Sendername und Titel der Videos.
    if (isDemo()) {
      (data.categories || []).forEach(function (item) {
        if (item && item.label) messages.push(item.label);
      });
      messages.push(t.automaticTicker, t.sponsorTicker);
    }

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
