// main.js
//
// Einstiegspunkt von ONLANG TV.
//
// Verantwortlich für GENAU EINEN Sendebetrieb ("Session") zur Zeit:
// Mandant laden -> Ansicht rendern -> Player/Playlist/Werbung/Ablauf
// verdrahten -> automatisch starten. Ein Kundenwechsel beendet die
// vorherige Session vollständig, bevor die neue aufgebaut wird.
//
// Klassisches <script>, KEIN ES-Modul: läuft direkt über file://.

(function () {
  'use strict';

  var appEl;

  // Die aktuell aktive Session. Enthält alles, was beendet werden muss,
  // bevor eine neue Session starten darf.
  var currentSession = null;

  // Laufende Nummer jedes bootstrap()-Aufrufs. Nur das Ergebnis des
  // ZULETZT gestarteten Aufrufs darf die Ansicht aufbauen.
  //
  // Bugfix Demo 1.0: loadTenantData() ist asynchron. Bei zwei schnell
  // aufeinanderfolgenden Kundenwechseln konnte die langsamere Antwort
  // nach der schnelleren eintreffen und den bereits aufgebauten neuen
  // Mandanten wieder überschreiben — inklusive eines zweiten, parallel
  // laufenden Players.
  var bootstrapToken = 0;

  document.addEventListener('DOMContentLoaded', function () {
    appEl = document.getElementById('app');
    if (!appEl) return;

    var tenantNs = window.ONLANG.tenant;
    bootstrap(tenantNs.TenantService.getRequestedCustomerId());
  });

  // ------------------------------------------------------------------
  // Session-Lebenszyklus
  // ------------------------------------------------------------------

  /**
   * Beendet die laufende Session vollständig.
   *
   * Zwingend notwendig, weil ein reines Überschreiben von #app.innerHTML
   * das alte <video>-Element zwar aus dem DOM entfernt, die Wiedergabe
   * aber NICHT beendet: ein losgelöstes <video> spielt im Browser weiter
   * und bleibt hörbar. Zusätzlich blieben Ablaufsteuerung, Event-Abos
   * und der Sekundentakt der Kopfzeile aktiv.
   */
  function endCurrentSession() {
    if (!currentSession) return;

    var session = currentSession;
    currentSession = null;

    session.disposers.forEach(function (dispose) {
      try {
        dispose();
      } catch (error) {
        console.error('[ONLANG TV] Fehler beim Beenden der Session:', error);
      }
    });

    // Reihenfolge ist wichtig: erst die Ablaufsteuerung stilllegen,
    // damit ein letztes Player-Ereignis keinen neuen Ablaufschritt mehr
    // auslöst, danach den Player selbst beenden.
    if (session.flow) session.flow.destroy();
    if (session.player) session.player.destroy();
  }

  /**
   * Lädt einen Mandanten, wendet sein Branding an, rendert die passende
   * Ansicht (Full/Embed), verdrahtet Player, Playlist und Werbung und
   * startet den automatischen Sendebetrieb.
   *
   * @param {string} requestedCustomerId
   */
  function bootstrap(requestedCustomerId) {
    var token = (bootstrapToken += 1);
    var tenantNs = window.ONLANG.tenant;

    // Sofort beenden — nicht erst, wenn die Daten eintreffen. Sonst
    // liefe der alte Mandant während des gesamten Ladevorgangs weiter.
    endCurrentSession();

    tenantNs.TenantService.loadTenantData(requestedCustomerId)
      .then(function (result) {
        if (token !== bootstrapToken) return; // veraltete Antwort verwerfen
        buildSession(result);
      })
      .catch(function (error) {
        if (token !== bootstrapToken) return;
        console.error('[ONLANG TV] Mandant konnte nicht geladen werden:', error);
        showFatalError(
          'Dieser Vereinskanal konnte nicht geladen werden.',
          'Kunden-ID: ' + String(requestedCustomerId)
        );
      });
  }

  /**
   * Baut aus einem geladenen Mandantendatensatz die vollständige,
   * laufende Session auf.
   * @param {object} result - Rückgabe von TenantService.loadTenantData()
   */
  function buildSession(result) {
    var tenantNs = window.ONLANG.tenant;
    var playerNs = window.ONLANG.player;
    var playlistNs = window.ONLANG.playlist;
    var advertisingNs = window.ONLANG.advertising;
    var playbackNs = window.ONLANG.playback;
    var runtimeConfig = window.ONLANG.config.RuntimeConfig.getRuntimeConfig();

    var data = result.data;
    var tenant = data.tenant;
    var disposers = [];

    if (result.warnings.length > 0) {
      console.warn('[ONLANG TV] ' + result.warnings.length + ' Validierungshinweis(e):', result.warnings);
    }

    tenantNs.TenantService.applyTenantTheme(tenant.theme);
    applyTenantClass(tenant.customerId);

    var modus = runtimeConfig.modus || data.settings.defaultView;
    var isEmbed = modus === 'embed';
    var view = isEmbed ? window.ONLANG.views.EmbedView : window.ONLANG.views.FullView;

    // Der Vereins-Schnellwechsler bleibt bewusst der Vollansicht
    // vorbehalten (siehe docs/ARCHITECTURE.md).
    var onTenantChange = isEmbed ? undefined : handleTenantSwitch;
    var viewRefs = view.render(appEl, data, onTenantChange);

    // Der Sekundentakt der Kopfzeile gehört zur Session und wird mit
    // ihr beendet.
    disposers.push(function () {
      if (window.ONLANG_TV_CLOCK_TIMER) {
        window.clearInterval(window.ONLANG_TV_CLOCK_TIMER);
        window.ONLANG_TV_CLOCK_TIMER = null;
      }
    });

    if (result.usedFallback) {
      showNotice(
        'Unbekannte Kunden-ID „' + result.requestedCustomerId + '“ — es wird der Kanal „' +
        (tenant.name || result.loadedCustomerId) + '“ angezeigt.'
      );
    }

    var videoEl = viewRefs.playerView.videoEl;
    var autoplayWanted = !!(data.settings && data.settings.autoplay);
    var wantsMuted = !data.settings || data.settings.mutedAutoplay !== false;

    if (autoplayWanted) {
      // Browser erlauben automatisches Abspielen zuverlässig nur stumm.
      videoEl.muted = wantsMuted;
      videoEl.autoplay = true;
      videoEl.playsInline = true;
    }

    var player = playerNs.PlayerController.createPlayerController(videoEl);
    var playlist = playlistNs.PlaylistController.createPlaylistController();
    var advertising = advertisingNs.AdvertisingController.createAdvertisingController();
    var flow = playbackNs.PlaybackFlowController.createPlaybackFlowController();

    currentSession = { player: player, flow: flow, disposers: disposers };

    flow.initialize({
      player: player,
      playlist: playlist,
      advertising: advertising,
      contentItems: data.videos || [],
      advertisements: data.advertisements || [],
      // Beim Autostart lädt die Ablaufsteuerung direkt den Spot, statt
      // zuerst das Inhaltsvideo und unmittelbar danach den Spot in
      // dasselbe <video>-Element zu laden.
      autostart: autoplayWanted,
    });

    playerNs.PlayerUI.wirePlayerView(viewRefs.playerView, player, flow, flow);
    advertisingNs.AdvertisingUI.wireAdvertisingView(viewRefs.nowPlayingView, flow);
    playlistNs.PlaylistUI.wirePlaylistView(viewRefs.playlistView, flow);

    wireActivation(viewRefs.playerView, videoEl, flow, wantsMuted, disposers);
  }

  /**
   * Verdrahtet die Aktivierungsfläche für den Fall, dass der Browser die
   * automatische Wiedergabe blockiert, sowie das einmalige Aktivieren
   * des Tons beim ersten Klick.
   */
  function wireActivation(playerView, videoEl, flow, wantsMuted, disposers) {
    var activateBtn = playerView.activateBtn;

    if (activateBtn) {
      var onActivate = function () {
        videoEl.muted = false;
        flow.resumeAfterBlock();
      };
      activateBtn.addEventListener('click', onActivate);
      disposers.push(function () {
        activateBtn.removeEventListener('click', onActivate);
      });

      var updateActivation = function () {
        var blocked = typeof flow.isStartBlocked === 'function' && flow.isStartBlocked();
        activateBtn.hidden = !blocked;
      };
      flow.onChange(updateActivation);
      updateActivation();
    }

    if (!wantsMuted) return;

    // Erster Klick irgendwo in ONLANG TV schaltet den Ton frei. Der
    // Listener meldet sich selbst ab UND wird zusätzlich beim
    // Session-Ende entfernt (er hängt an #app, das den Kundenwechsel
    // überlebt).
    var enableSoundOnce = function () {
      videoEl.muted = false;
      appEl.removeEventListener('click', enableSoundOnce);
    };
    appEl.addEventListener('click', enableSoundOnce);
    disposers.push(function () {
      appEl.removeEventListener('click', enableSoundOnce);
    });
  }

  // ------------------------------------------------------------------
  // Branding und Hinweise
  // ------------------------------------------------------------------

  /**
   * Setzt die Mandanten-Präsentationsklasse am <body>.
   *
   * Entfernt zuvor ALLE vorhandenen tenant-*-Klassen. Eine feste Liste
   * hätte bei jedem neuen Mandanten erweitert werden müssen und ließ
   * beim Kundenwechsel Reste des vorherigen Vereins stehen.
   *
   * @param {string} customerId
   */
  function applyTenantClass(customerId) {
    var classes = Array.prototype.slice.call(document.body.classList);
    classes.forEach(function (name) {
      if (name.indexOf('tenant-') === 0) {
        document.body.classList.remove(name);
      }
    });

    var slug = String(customerId || 'default').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    document.body.classList.add('tenant-' + slug);
  }

  function showNotice(text) {
    var el = ensureBanner('tv-notice');
    el.textContent = text;
    el.hidden = false;
  }

  function showFatalError(headline, detail) {
    endCurrentSession();
    appEl.innerHTML = '';
    var box = document.createElement('div');
    box.className = 'tv-fatal';
    var h = document.createElement('strong');
    h.textContent = headline;
    var p = document.createElement('span');
    p.textContent = detail || '';
    box.appendChild(h);
    box.appendChild(p);
    appEl.appendChild(box);
  }

  function ensureBanner(className) {
    var existing = document.querySelector('.' + className);
    if (existing) return existing;
    var el = document.createElement('div');
    el.className = className;
    el.setAttribute('role', 'status');
    document.body.insertBefore(el, document.body.firstChild);
    return el;
  }

  // ------------------------------------------------------------------
  // Kundenwechsel
  // ------------------------------------------------------------------

  /**
   * Wird vom Vereins-Schnellwechsler aufgerufen. Aktualisiert die
   * ?kunde=-URL per pushState (Adresse/Reload/Teilen bleiben korrekt)
   * und baut die Session mit dem neuen Mandanten neu auf.
   * @param {string} selectedCustomerId
   */
  function handleTenantSwitch(selectedCustomerId) {
    var tenantNs = window.ONLANG.tenant;
    var publicId = tenantNs.TenantService.getPublicCustomerId(selectedCustomerId);

    var url = new URL(window.location.href);
    url.searchParams.set('kunde', publicId);
    url.searchParams.delete('tenant'); // Kanonisch immer "kunde" führen
    window.history.pushState({ kunde: publicId }, '', url);

    var notice = document.querySelector('.tv-notice');
    if (notice) notice.hidden = true;

    bootstrap(publicId);
  }

  // Browser-Zurück/Vor-Navigation ebenfalls unterstützen (ohne Neuladen).
  window.addEventListener('popstate', function () {
    if (!appEl) return;
    var tenantNs = window.ONLANG.tenant;
    bootstrap(tenantNs.TenantService.getRequestedCustomerId());
  });
})();
