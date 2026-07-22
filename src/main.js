// main.js
//
// Einstiegspunkt ab Phase 5, erweitert um den Vereins-Schnellwechsler
// (Punkt 3 der aktuellen Anweisung). Die komplette Lade-/Render-/
// Verdrahtungs-Logik steckt in bootstrap(customerId), damit sie sowohl
// beim ersten Seitenaufruf als auch beim Wechsel über das Dropdown
// (ohne vollständiges Neuladen der Seite) verwendet werden kann.
//
// Klassisches <script>, KEIN ES-Modul: läuft direkt über file://.

(function () {
  'use strict';

  var appEl;

  document.addEventListener('DOMContentLoaded', function () {
    appEl = document.getElementById('app');
    if (!appEl) return;

    var tenantNs = window.ONLANG.tenant;
    var requestedCustomerId = tenantNs.TenantService.getRequestedCustomerId();
    bootstrap(requestedCustomerId);
  });

  /**
   * Lädt einen Mandanten, wendet sein Theme an, rendert die passende
   * Ansicht (Full/Embed) und verdrahtet Player, Playlist und Werbung
   * neu — exakt wie in Schritt 4, nur dass contentItems/advertisements
   * seit Phase 5 aus dem Tenant-Objekt kommen. #app wird dabei
   * vollständig neu aufgebaut (innerHTML), das alte <video>-Element
   * wird dadurch automatisch aus dem DOM entfernt und stoppt jede
   * laufende Wiedergabe — kein manuelles Aufräumen nötig.
   * @param {string} requestedCustomerId
   */
  function bootstrap(requestedCustomerId) {
    var tenantNs = window.ONLANG.tenant;
    var runtimeConfig = window.ONLANG.config.RuntimeConfig.getRuntimeConfig();

    tenantNs.TenantService.loadTenantData(requestedCustomerId).then(function (result) {
      var tenant = result.data.tenant;

      if (result.usedFallback) {
        console.info('[ONLANG TV] Kunden-ID "' + result.requestedCustomerId + '" nicht gefunden — Fallback auf "' + result.loadedCustomerId + '".');
      }
      if (result.warnings.length > 0) {
        console.warn('[ONLANG TV] ' + result.warnings.length + ' Validierungshinweis(e):', result.warnings);
      }

      // Die Medien der Demo frühzeitig in den Browser-Cache laden.
      // Dadurch ist die Quelle beim automatischen Wechsel Spot -> Video
      // bzw. Video -> Spot in der Regel bereits verfügbar und der sichtbare
      // Lade-Moment wird deutlich reduziert. Die eigentliche Wiedergabe
      // bleibt weiterhin ausschließlich Aufgabe des Players/Playback-Flows.
      preloadDemoMedia(result.data);

      // Theme aus tenant.theme (unverändert seit Schritt 1: accent/
      // background/surface/text) auf :root anwenden.
      tenantNs.TenantService.applyTenantTheme(tenant.theme);

      // Tenant-spezifische Präsentationsklasse: BBK bleibt unverändert,
      // Scorpions erhält das helle Rot-Weiß-Design.
      document.body.classList.remove('tenant-bbk-duesseldorf', 'tenant-scorpions-sggierath', 'tenant-default');
      document.body.classList.add('tenant-' + String(tenant.customerId || 'default').replace(/[^a-z0-9-]/gi, '-').toLowerCase());

      // Ansichtsmodus: URL (?modus=) hat Vorrang, sonst
      // tenant.settings.defaultView.
      var modus = runtimeConfig.modus || result.data.settings.defaultView;
      var isEmbed = modus === 'embed';
      var view = isEmbed ? window.ONLANG.views.EmbedView : window.ONLANG.views.FullView;

      // Vereins-Schnellwechsler nur in der Vollansicht (siehe
      // docs/ARCHITECTURE.md — Embed bleibt bewusst das Minimum für
      // die spätere iframe-Einbindung, ohne Zusatzbedienelemente).
      var onTenantChange = isEmbed ? undefined : handleTenantSwitch;
      var viewRefs = view.render(appEl, result.data, onTenantChange);

      // --- Ab hier unverändert seit Schritt 4 ---
      var playerNs = window.ONLANG.player;
      var playlistNs = window.ONLANG.playlist;
      var advertisingNs = window.ONLANG.advertising;
      var playbackNs = window.ONLANG.playback;

      // Browser erlauben automatisches Abspielen zuverlässig nur stumm.
      // Nach dem ersten Klick irgendwo auf ONLANG TV wird der Ton aktiviert.
      var videoEl = viewRefs.playerView.videoEl;
      if (result.data.settings && result.data.settings.autoplay) {
        videoEl.muted = result.data.settings.mutedAutoplay !== false;
        videoEl.autoplay = true;
        videoEl.playsInline = true;

        if (videoEl.muted) {
          appEl.addEventListener('click', function enableSoundOnce() {
            videoEl.muted = false;
            appEl.removeEventListener('click', enableSoundOnce);
          });
        }
      }

      var player = playerNs.PlayerController.createPlayerController(videoEl);
      var playlist = playlistNs.PlaylistController.createPlaylistController();
      var advertising = advertisingNs.AdvertisingController.createAdvertisingController();

      var flow = playbackNs.PlaybackFlowController.createPlaybackFlowController();
      flow.initialize({
        player: player,
        playlist: playlist,
        advertising: advertising,
        contentItems: result.data.videos || [],
        advertisements: result.data.advertisements || [],
      });

      // TV-Modus: Beim Öffnen beginnt sofort der Spot, danach laufen alle
      // Inhalte automatisch weiter. Falls der Browser Autoplay blockiert,
      // genügt ein Klick auf Play.
      if (result.data.settings && result.data.settings.autoplay) {
        flow.play();
      }

      playerNs.PlayerUI.wirePlayerView(viewRefs.playerView, player, flow, flow);
      advertisingNs.AdvertisingUI.wireAdvertisingView(viewRefs.nowPlayingView, flow);
      playlistNs.PlaylistUI.wirePlaylistView(viewRefs.playlistView, flow);
    });
  }


  /**
   * Lädt die lokalen MP4-Quellen der aktuell gewählten Demo im Hintergrund
   * vor. Es wird weder abgespielt noch eine Ablaufentscheidung getroffen.
   * Doppelte Quellen werden nur einmal angelegt.
   * @param {{ videos?: Array, advertisements?: Array }} data
   */
  function preloadDemoMedia(data) {
    var sources = [];
    var seen = {};
    var entries = (data && data.advertisements ? data.advertisements : [])
      .concat(data && data.videos ? data.videos : []);

    entries.forEach(function (entry) {
      var src = entry && entry.src ? String(entry.src) : '';
      if (!src || seen[src]) return;
      seen[src] = true;
      sources.push(src);
    });

    sources.forEach(function (src) {
      var preloadEl = document.createElement('video');
      preloadEl.preload = 'auto';
      preloadEl.muted = true;
      preloadEl.playsInline = true;
      preloadEl.src = src;
      preloadEl.setAttribute('aria-hidden', 'true');
      preloadEl.style.display = 'none';
      document.body.appendChild(preloadEl);
      preloadEl.load();
    });
  }

  /**
   * Wird vom Vereins-Schnellwechsler-Dropdown aufgerufen (siehe
   * view-helpers.js, renderTenantSwitcher()). Aktualisiert die
   * ?kunde=-URL (per pushState, damit Adresse/Reload/Teilen weiterhin
   * korrekt funktionieren, aber OHNE die Seite neu zu laden) und baut
   * die Ansicht mit dem neuen Mandanten neu auf.
   * @param {string} selectedCustomerId
   */
  function handleTenantSwitch(selectedCustomerId) {
    var url = new URL(window.location.href);
    url.searchParams.set('kunde', selectedCustomerId);
    url.searchParams.delete('tenant'); // Kanonisch immer "kunde" in der URL führen
    window.history.pushState({ kunde: selectedCustomerId }, '', url);

    bootstrap(selectedCustomerId);
  }

  // Browser-Zurück/Vor-Navigation ebenfalls unterstützen (ohne
  // Neuladen), falls der Nutzer nach einem Dropdown-Wechsel die
  // Zurück-Taste verwendet.
  window.addEventListener('popstate', function () {
    if (!appEl) return;
    var tenantNs = window.ONLANG.tenant;
    bootstrap(tenantNs.TenantService.getRequestedCustomerId());
  });
})();
