// full-view.js
//
// Vollständige ONLANG-TV-Oberfläche: Header (Logo/Slogan), Haupt-Player
// mit "Präsentiert von"-Sponsor, Playlist-Spalte ("Als Nächstes"),
// Themen-Ticker, Partner-Leiste.
//
// WICHTIG: Diese Datei enthält AUSSCHLIESSLICH Layout-Aufbau und reines
// Rendern von Tenant-DATEN (Header-Text, Themen-Ticker, Partner) — keine
// eigene Player-/Playlist-/Werbelogik.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.views = window.ONLANG.views || {};

(function (ns) {
  'use strict';

  function isDarazsak(data) {
    return !!(
      data &&
      data.tenant &&
      String(data.tenant.customerId || '').toUpperCase() === 'HU001'
    );
  }

  function getTexts(data) {
    if (isDarazsak(data)) {
      return {
        broadcastAria: 'Adás állapota',
        live: 'ÉLŐ',
        automaticOperation: 'Automatikus műsorszórás',
        club: 'Egyesület',
        switchClub: 'Egyesület váltása',
        tvInfo: 'TV információk',
        partners: 'Partnereink',
        footerVersion: 'ONLANG TV – Bemutató verzió 1.0',
        footerText: '© 2026 ONLANG · Digitális kommunikációs platform egyesületeknek és szövetségeknek',
        welcomePrefix: 'Üdvözöljük a ',
        welcomeSuffix: ' csatornán – powered by ONLANG',
        automaticTicker: 'Automatikus műsorszórás',
        sponsorTicker: 'Szponzorhirdetések a műsorszámok között',
        topicFallback: 'Téma',
        inProgram: 'A műsorban: ',
        future: 'Kiemelt videók és élő közvetítések hamarosan'
      };
    }

    return {
      broadcastAria: 'Sendestatus',
      live: 'LIVE',
      automaticOperation: 'Automatischer Sendebetrieb',
      club: 'Verein',
      switchClub: 'Verein wechseln',
      tvInfo: 'TV Informationen',
      partners: 'Unsere Partner',
      footerVersion: 'ONLANG TV – Präsentationsversion 1.0',
      footerText: '© 2026 ONLANG · Digitale Kommunikationsplattform für Vereine und Verbände',
      welcomePrefix: 'Willkommen bei ',
      welcomeSuffix: ' – powered by ONLANG',
      automaticTicker: 'Automatischer Sendebetrieb',
      sponsorTicker: 'Sponsorenwerbung zwischen den Beiträgen',
      topicFallback: 'Thema',
      inProgram: 'Im Programm: ',
      future: 'Highlights und Livestreams als nächste Ausbaustufe'
    };
  }

  /**
   * @param {HTMLElement} container
   * @param {object} data
   * @param {function(string): void} [onTenantChange]
   * @returns {{ playerView: object, nowPlayingView: object, playlistView: object }}
   */
  function render(container, data, onTenantChange) {
    var t = getTexts(data);

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
      '      <div class="tv-broadcast-panel" aria-label="' + escapeHtml(t.broadcastAria) + '">' +
      '        <div class="tv-broadcast-topline">' +
      '          <span class="tv-live-badge"><span class="tv-live-dot"></span>' + escapeHtml(t.live) + '</span>' +
      '          <span class="tv-broadcast-channel"></span>' +
      '        </div>' +
      '        <div class="tv-broadcast-datetime">' +
      '          <span class="tv-broadcast-date"></span>' +
      '          <span class="tv-broadcast-time"></span>' +
      '        </div>' +
      '        <div class="tv-broadcast-operation"><span class="tv-operation-dot"></span>' + escapeHtml(t.automaticOperation) + '</div>' +
      '      </div>' +
      '      <div class="tv-header-switcher">' +
      '        <label class="tv-switcher-label" for="tv-tenant-switcher">' + escapeHtml(t.club) + '</label>' +
      '        <select class="tv-tenant-switcher" id="tv-tenant-switcher" aria-label="' + escapeHtml(t.switchClub) + '"></select>' +
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
      '      <div class="tv-info-ticker" role="region" aria-label="' + escapeHtml(t.tvInfo) + '">' +
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
      '    <h2 class="tv-section-title">' + escapeHtml(t.partners) + '</h2>' +
      '    <div class="tv-partner-row"></div>' +
      '  </section>' +
      '  <footer class="tv-footer">' +
      '    <strong>' + escapeHtml(t.footerVersion) + '</strong>' +
      '    <span>' + escapeHtml(t.footerText) + '</span>' +
      '  </footer>' +
      '</div>';

    ns.ViewHelpers.applyHeader(container, data);

    // Darazsak: Logo etwas präsenter darstellen.
    if (isDarazsak(data)) {
      var logoEl = container.querySelector('.tv-logo');
      if (logoEl) {
        logoEl.style.width = '58px';
        logoEl.style.height = '58px';
        logoEl.style.minWidth = '58px';
        logoEl.style.backgroundSize = 'contain';
        logoEl.style.backgroundRepeat = 'no-repeat';
        logoEl.style.backgroundPosition = 'center';
      }
    }

    applyBroadcastBranding(container, data);
    renderTicker(container, data);
    initialiseBroadcastClock(container, data);
    ns.ViewHelpers.applyPresenter(container, data);
    ns.ViewHelpers.renderPartners(container, data);

    if (onTenantChange) {
      ns.ViewHelpers.renderTenantSwitcher(
        container,
        data.tenant.customerId,
        onTenantChange
      );
    }

    return ns.ViewHelpers.createModuleViews(container);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function applyBroadcastBranding(container, data) {
    var channelEl = container.querySelector('.tv-broadcast-channel');
    if (channelEl) {
      channelEl.textContent = data.tenant.name || 'ONLANG TV';
    }
  }

  function renderTicker(container, data) {
    var t = getTexts(data);
    var label = container.querySelector('.tv-info-ticker-label');
    var groups = container.querySelectorAll('.tv-info-ticker-group');

    if (label) {
      label.textContent = data.tenant.name || 'ONLANG TV';
    }

    var messages = [
      t.welcomePrefix + (data.tenant.name || 'ONLANG TV') + t.welcomeSuffix,
      t.automaticTicker,
      t.sponsorTicker
    ];

    (data.categories || []).forEach(function (item) {
      var categoryText = item.label || t.topicFallback;
      if (item.description) {
        categoryText += ': ' + item.description;
      }
      messages.push(categoryText);
    });

    (data.videos || []).forEach(function (item) {
      if (item && item.title) {
        messages.push(t.inProgram + item.title);
      }
    });

    messages.push(t.future);

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

  function initialiseBroadcastClock(container, data) {
    var dateEl = container.querySelector('.tv-broadcast-date');
    var timeEl = container.querySelector('.tv-broadcast-time');

    if (!dateEl || !timeEl) return;

    var hu = isDarazsak(data);

    function updateClock() {
      var now = new Date();

      dateEl.textContent = now.toLocaleDateString(
        hu ? 'hu-HU' : 'de-DE',
        {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        }
      );

      timeEl.textContent = now.toLocaleTimeString(
        hu ? 'hu-HU' : 'de-DE',
        {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }
      ) + (hu ? '' : ' Uhr');
    }

    updateClock();

    if (window.ONLANG_TV_CLOCK_TIMER) {
      window.clearInterval(window.ONLANG_TV_CLOCK_TIMER);
    }

    window.ONLANG_TV_CLOCK_TIMER =
      window.setInterval(updateClock, 1000);
  }

  ns.FullView = {
    render: render
  };

})(window.ONLANG.views);
