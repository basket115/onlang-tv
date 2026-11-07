// view-helpers.js
//
// Gemeinsame, reine Rendering-Hilfsfunktionen für full-view.js und
// embed-view.js. Ausschließlich Darstellung von Tenant-DATEN — keine
// Player-/Playlist-/Werbelogik.
//
// Alle Funktionen erwarten das VOLLSTÄNDIGE validierte Datenobjekt
// (siehe tenant-validator.js: { tenant, settings, live, videos,
// categories, partners, advertisements }), nicht nur den
// "tenant"-Teilbereich — Kategorien/Partner liegen auf oberster Ebene.
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};
window.ONLANG.views = window.ONLANG.views || {};

(function (ns) {
  'use strict';

  function applyHeader(container, data) {
    var tenant = data.tenant;
    var logoEl = container.querySelector('.tv-logo');
    var nameEl = container.querySelector('.tv-name');
    var taglineEl = container.querySelector('.tv-tagline');

    if (logoEl) renderLogoInto(logoEl, tenant.logoUrl, tenant.logoText || initials(tenant.name), tenant.name, true);
    if (nameEl) nameEl.textContent = tenant.name;
    if (taglineEl) taglineEl.textContent = tenant.tagline || '';
  }

  /**
   * Rendert ein echtes Logo-Bild, falls logoUrl gesetzt ist — sonst
   * fällt es sauber auf den bestehenden Text-Platzhalter zurück (kein
   * kaputtes Bild, falls eine Datei einmal fehlt: onerror entfernt das
   * <img> wieder und zeigt den Text-Fallback).
   * @param {HTMLElement} container - z.B. .tv-logo oder .tv-partner-logo
   * @param {string} logoUrl
   * @param {string} fallbackText
   * @param {string} altText
   * @param {boolean} zuschneiden - nur Vereinslogo oben links: leeren Rand
   *   (z. B. viel Weiß um das Logo) bei Cloudinary wegschneiden lassen.
   *   Website und App bleiben unverändert, sie bekommen das Original.
   */
  function renderLogoInto(container, logoUrl, fallbackText, altText, zuschneiden) {
    container.innerHTML = '';
    if (logoUrl) {
      var img = document.createElement('img');
      var zugeschnitten = zuschneiden ? zugeschnitteneLogoAdresse(logoUrl) : '';
      img.src = zugeschnitten || logoUrl;
      img.alt = altText || '';
      img.className = 'tv-logo-image' + (zugeschnitten ? ' tv-logo-image--zugeschnitten' : '');
      img.addEventListener('error', function () {
        // Zugeschnittene Fassung klappt nicht: einmal das Original versuchen.
        if (zugeschnitten) {
          zugeschnitten = '';
          img.className = 'tv-logo-image';
          img.src = logoUrl;
          return;
        }
        container.innerHTML = '<span class="tv-logo-text"></span>';
        container.querySelector('.tv-logo-text').textContent = fallbackText;
      });
      container.appendChild(img);
      return;
    }
    var span = document.createElement('span');
    span.className = 'tv-logo-text';
    span.textContent = fallbackText;
    container.appendChild(span);
  }

  // Cloudinary-Bild (…/image/upload/…): e_trim schneidet den gleichfarbigen
  // bzw. durchsichtigen Rand weg (Toleranz 10), c_limit,w_400 verkleinert
  // große Dateien (das Logo ist höchstens ca. 112 px groß). Sonst ''.
  var CLOUDINARY_UPLOAD = /^(https:\/\/res\.cloudinary\.com\/[a-z0-9_-]+\/image\/upload\/)(.+)$/i;
  function zugeschnitteneLogoAdresse(logoUrl) {
    var teile = CLOUDINARY_UPLOAD.exec(String(logoUrl || ''));
    if (!teile || /(^|[\/,])e_trim/.test(teile[2])) return '';
    return teile[1] + 'e_trim:10/c_limit,w_400/' + teile[2];
  }

  function applyPresenter(container, data) {
    var bar = container.querySelector('.tv-presenter-bar');
    if (!bar) return;
    var presenter = data.tenant.presenter;
    if (!presenter || (!presenter.name && !presenter.label)) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    var labelEl = bar.querySelector('.tv-presenter-label');
    var nameEl = bar.querySelector('.tv-presenter-name');
    if (labelEl) labelEl.textContent = presenter.label || '';
    if (nameEl) nameEl.textContent = presenter.name || '';
  }

  function renderCategories(container, data) {
    var grid = container.querySelector('.tv-category-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (data.categories || []).forEach(function (cat) {
      var card = document.createElement('div');
      card.className = 'tv-category-card';
      card.innerHTML =
        '<span class="tv-category-icon"></span>' +
        '<span class="tv-category-label"></span>' +
        '<span class="tv-category-desc"></span>';
      card.querySelector('.tv-category-icon').textContent = cat.icon || '';
      card.querySelector('.tv-category-label').textContent = cat.label || '';
      card.querySelector('.tv-category-desc').textContent = cat.description || '';
      grid.appendChild(card);
    });
  }

  function renderPartners(container, data) {
    var row = container.querySelector('.tv-partner-row');
    if (!row) return;
    row.innerHTML = '';

    // Ohne Partner bleibt der ganze Bereich weg (keine leere Überschrift).
    var section = container.querySelector('.tv-partners');
    if (section) section.hidden = (data.partners || []).length === 0;

    (data.partners || []).forEach(function (partner) {
      // Mit Link ist die ganze Karte anklickbar.
      var card = document.createElement(partner.url ? 'a' : 'div');
      card.className = 'tv-partner-card';
      if (partner.url) {
        card.href = partner.url;
        card.target = '_blank';
        card.rel = 'noopener';
      }
      card.innerHTML =
        '<span class="tv-partner-logo"></span>' +
        '<span class="tv-partner-text">' +
        '  <span class="tv-partner-name"></span>' +
        '  <span class="tv-partner-subtitle"></span>' +
        '</span>';
      var logoEl = card.querySelector('.tv-partner-logo');
      renderLogoInto(logoEl, partner.logoUrl, (partner.name || '?').charAt(0).toUpperCase(), partner.name);
      card.querySelector('.tv-partner-name').textContent = partner.name || '';
      card.querySelector('.tv-partner-subtitle').textContent = partner.subtitle || '';
      row.appendChild(card);
    });
  }

  function initials(name) {
    if (!name) return '?';
    var parts = String(name).trim().split(/\s+/);
    var letters = parts.slice(0, 2).map(function (p) { return p.charAt(0).toUpperCase(); });
    return letters.join('') || '?';
  }

  /**
   * Baut die drei bestehenden, unveränderten Modul-Ansichten
   * (Player/"Jetzt läuft"/Playlist) in die vom jeweiligen View bereits
   * angelegten Container-Elemente. Reine Komposition.
   * @param {HTMLElement} container
   */
  function createModuleViews(container) {
    var playerContainer = container.querySelector('#player-container');
    var nowPlayingContainer = container.querySelector('#now-playing-container');
    var playlistContainer = container.querySelector('#playlist-container');

    var playerView = window.ONLANG.player.PlayerUI.createPlayerView(playerContainer);
    var nowPlayingView = window.ONLANG.advertising.AdvertisingUI.createAdvertisingView(nowPlayingContainer);
    var playlistView = window.ONLANG.playlist.PlaylistUI.createPlaylistView(playlistContainer);

    return { playerView: playerView, nowPlayingView: nowPlayingView, playlistView: playlistView };
  }

  /**
   * Baut das Vereins-Schnellwechsler-Dropdown im Header. Listet alle
   * aktuell registrierten Mandanten-IDs auf (siehe tenant-service.js,
   * getAvailableCustomerIds()) — reine Anzeige/Ereignisweiterleitung,
   * main.js entscheidet, was beim Wechsel tatsächlich passiert.
   * @param {HTMLElement} container
   * @param {string} currentCustomerId
   * @param {function(string): void} onChange
   */
  function renderTenantSwitcher(container, currentCustomerId, onChange) {
    var select = container.querySelector('.tv-tenant-switcher');
    if (!select) return;

    var ids = window.ONLANG.tenant.TenantService.getAvailableCustomerIds();
    select.innerHTML = '';
    ids.forEach(function (id) {
      var option = document.createElement('option');
      var registryItem = window.ONLANG.tenantRegistry[id];
      option.value = id;
      option.textContent = registryItem && registryItem.tenant && registryItem.tenant.name
        ? registryItem.tenant.name
        : id;
      if (id === currentCustomerId) option.selected = true;
      select.appendChild(option);
    });

    select.addEventListener('change', function () {
      onChange(select.value);
    });
  }

  ns.ViewHelpers = {
    applyHeader: applyHeader,
    applyPresenter: applyPresenter,
    renderCategories: renderCategories,
    renderPartners: renderPartners,
    renderTenantSwitcher: renderTenantSwitcher,
    createModuleViews: createModuleViews,
  };
})(window.ONLANG.views);
