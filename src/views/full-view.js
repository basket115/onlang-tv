// full-view.js
//
// Vollständige ONLANG-TV-Oberfläche: Header (Logo/Slogan), Haupt-Player
// mit "Präsentiert von"-Sponsor, Playlist-Spalte ("Als Nächstes"),
// Themen-Ticker, Partner-Leiste.
//
// WICHTIG: Diese Datei enthält AUSSCHLIESSLICH Layout-Aufbau und reines
// Rendern von Tenant-DATEN (Header-Text, Themen-Ticker, Partner) — keine
// eigene Player-/Playlist-/Werbelogik. Die eigentliche Funktionalität
// kommt unverändert aus player-ui.js/playlist-ui.js/advertising-ui.js
// (siehe wireModules unten) sowie main.js (Controller-Erstellung,
// PlaybackFlowController). Siehe docs/ARCHITECTURE.md, Abschnitt
// "Full-/Embed-View — reine Kompositionsschicht".
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.views = window.ONLANG.views || {};

(function (ns) {
  'use strict';

  /**
   * @param {HTMLElement} container
   * @param {object} data - vollständiges validiertes Datenobjekt
   *        ({ tenant, settings, live, videos, categories, partners, advertisements })
   * @param {function(string): void} [onTenantChange] - wird aufgerufen,
   *        wenn der Nutzer im Dropdown einen anderen Verein wählt.
   *        main.js entscheidet, was dann passiert (siehe dort).
   * @returns {{ playerView: object, nowPlayingView: object, playlistView: object }}
   */
  function render(container, data, onTenantChange) {
    container.innerHTML =
      '<div class="tv-app">' +
      '  <header class="tv-header">' +
      '    <div class="tv-header-brand">' +
      '      <div class="tv-logo"></div>' +
      '      <div class="tv-brand-text">' +
      '        <h1 class="tv-name"></h1>' +
      '        <p class="tv-tagline"></p>' +
      '      </div>' +
      '    </div>' +
      '    <div class="tv-header-actions">' +
      '      <div class="tv-broadcast-panel" aria-label="Sendestatus">' +
      '        <div class="tv-broadcast-topline">' +
      '          <span class="tv-live-badge"><span class="tv-live-dot"></span>LIVE</span>' +
      '          <span class="tv-broadcast-channel"></span>' +
      '        </div>' +
      '        <div class="tv-broadcast-datetime">' +
      '          <span class="tv-broadcast-date"></span>' +
      '          <span class="tv-broadcast-time"></span>' +
      '        </div>' +
      '        <div class="tv-broadcast-operation"><span class="tv-operation-dot"></span>Automatischer Sendebetrieb</div>' +
      '      </div>' +
      '      <div class="tv-header-switcher">' +
      '        <label class="tv-switcher-label" for="tv-tenant-switcher">Verein</label>' +
      '        <select class="tv-tenant-switcher" id="tv-tenant-switcher" aria-label="Verein wechseln"></select>' +
      '      </div>' +
      '    </div>' +
      '  </header>' +
      '  <main class="tv-main">' +
      '    <div class="tv-player-col">' +
      '      <div class="tv-presenter-bar" hidden>' +
      '        <span class="tv-presenter-label"></span>' +
      '        <span class="tv-presenter-name"></span>' +
      '      </div>' +
      '      <div id="now-playing-container"></div>' +
      '      <div id="player-container"></div>' +
      '      <div class="tv-info-ticker" role="region" aria-label="TV Informationen">' +
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
      '  <section class="tv-partners">' +
      '    <h2 class="tv-section-title">Unsere Partner</h2>' +
      '    <div class="tv-partner-row"></div>' +
      '  </section>' +
      '  <footer class="tv-footer">' +
      '    <strong>ONLANG TV – Präsentationsversion 1.0</strong>' +
      '    <span>© 2026 ONLANG · Digitale Kommunikationsplattform für Vereine und Verbände</span>' +
      '  </footer>' +
      '</div>';

    ns.ViewHelpers.applyHeader(container, data);
    applyBroadcastBranding(container, data);
    renderTicker(container, data);
    initialiseBroadcastClock(container);
    ns.ViewHelpers.applyPresenter(container, data);
    ns.ViewHelpers.renderPartners(container, data);
    if (onTenantChange) {
      ns.ViewHelpers.renderTenantSwitcher(container, data.tenant.customerId, onTenantChange);
    }

    return ns.ViewHelpers.createModuleViews(container);
  }

  function applyBroadcastBranding(container, data) {
    var channelEl = container.querySelector('.tv-broadcast-channel');
    if (channelEl) channelEl.textContent = data.tenant.name || 'ONLANG TV';
  }

  function renderTicker(container, data) {
    var label = container.querySelector('.tv-info-ticker-label');
    var groups = container.querySelectorAll('.tv-info-ticker-group');
    if (label) label.textContent = data.tenant.name || 'ONLANG TV';

    var messages = [
      'Willkommen bei ' + (data.tenant.name || 'ONLANG TV') + ' – powered by ONLANG',
      'Automatischer Sendebetrieb',
      'Sponsorenwerbung zwischen den Beiträgen'
    ];

    (data.categories || []).forEach(function (item) {
      var categoryText = item.label || 'Thema';
      if (item.description) categoryText += ': ' + item.description;
      messages.push(categoryText);
    });

    (data.videos || []).forEach(function (item) {
      if (item && item.title) messages.push('Im Programm: ' + item.title);
    });

    messages.push('Highlights und Livestreams als nächste Ausbaustufe');

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

  function initialiseBroadcastClock(container) {
    var dateEl = container.querySelector('.tv-broadcast-date');
    var timeEl = container.querySelector('.tv-broadcast-time');
    if (!dateEl || !timeEl) return;

    function updateClock() {
      var now = new Date();
      dateEl.textContent = now.toLocaleDateString('de-DE', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
      timeEl.textContent = now.toLocaleTimeString('de-DE', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }) + ' Uhr';
    }

    updateClock();
    if (window.ONLANG_TV_CLOCK_TIMER) window.clearInterval(window.ONLANG_TV_CLOCK_TIMER);
    window.ONLANG_TV_CLOCK_TIMER = window.setInterval(updateClock, 1000);
  }

  ns.FullView = { render: render };
})(window.ONLANG.views);
