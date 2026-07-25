// playback-demo.test.js
//
// Integrationstests für ONLANG TV Demo 1.0. Getestet wird die komplette
// Anwendung so, wie index.html sie im Browser lädt — inklusive main.js,
// Views, Player, Playlist, Werbung und Ablaufsteuerung. Ersetzt ist
// ausschließlich die Medienwiedergabe (siehe tests/harness.js).
//
// Abgedeckt sind die Punkte der Definition of Done aus dem Arbeitsauftrag.

import { createApp, check, equal, finish, getScriptOrderFromIndexHtml } from './harness.js';

console.log('playback-demo.test.js');

const SPOT = 'public/assets/videos/onlang-spot-real.mp4';

// ---------------------------------------------------------------------
// 1. Automatischer Start: zuerst der Spot
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });

  equal('V006 laedt den BBK-Kanal', app.document.querySelector('.tv-name').textContent, 'BBK TV');
  equal('Tenant-Klasse wird gesetzt', app.tenantClasses.join(','), 'tenant-bbk-duesseldorf');
  check('Player ist im DOM vorhanden', !!app.video);
  equal('Erstes Medium ist der Werbespot', app.currentSource, SPOT);
  equal('Ablaufzustand nach Autostart', app.flowState, 'AD_PLAYING');
  equal('Kennzeichnung waehrend des Spots', app.nowPlayingTag, 'WERBUNG');
  check('Autostart erfolgt stumm', app.video.muted === true);
  check('Keine Aktivierungsflaeche noetig', app.activateVisible === false);

  // Der Spot darf NICHT zusaetzlich das erste Video vorab in dasselbe
  // <video>-Element laden (Doppel-load war eine der Fehlerursachen).
  equal('Genau ein Ladevorgang beim Start', app.state.loadedSources.length, 1);

  app.close();
}

// ---------------------------------------------------------------------
// 2. Spot -> Video -> Spot -> Video, dauerhaft und in Endlosschleife
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });
  const sequence = [];

  // 3 Videos + Spots => ein vollstaendiger Durchlauf und der Beginn des
  // zweiten. Damit ist der Rundlauf nachgewiesen, nicht nur behauptet.
  for (let i = 0; i < 9; i += 1) {
    sequence.push({ tag: app.nowPlayingTag, title: app.nowPlayingTitle, src: app.currentSource });
    await app.endMedia();
  }

  const tags = sequence.map((s) => s.tag).join(' | ');
  equal(
    'Wechsel Spot/Video laeuft durchgehend',
    tags,
    'WERBUNG | JETZT LÄUFT | WERBUNG | JETZT LÄUFT | WERBUNG | JETZT LÄUFT | WERBUNG | JETZT LÄUFT | WERBUNG'
  );

  const titles = sequence.filter((s) => s.tag === 'JETZT LÄUFT').map((s) => s.title);
  equal(
    'Playlist laeuft in Endlosschleife von vorn',
    titles.join(' -> '),
    'Vereinsbeitrag 1 -> Vereinsbeitrag 2 -> Vereinsbeitrag 3 -> Vereinsbeitrag 1'
  );

  const contentSources = sequence.filter((s) => s.tag === 'JETZT LÄUFT').map((s) => s.src);
  equal(
    'Zu jedem Titel wird die passende Quelle geladen',
    contentSources.join(' -> '),
    [
      'public/assets/videos/video1.mp4',
      'public/assets/videos/video2.mp4',
      'public/assets/videos/video3.mp4',
      'public/assets/videos/video1.mp4',
    ].join(' -> ')
  );

  check('Nach dem letzten Video folgt wieder ein Spot', sequence[6].tag === 'WERBUNG');
  app.close();
}

// ---------------------------------------------------------------------
// 3. "JETZT LÄUFT" ist synchron zum tatsaechlich geladenen Medium
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });

  await app.endMedia(); // Spot vorbei -> Video 1
  equal('Kennzeichnung nach Spotende', app.nowPlayingTag, 'JETZT LÄUFT');
  equal('Titel nach Spotende', app.nowPlayingTitle, 'Vereinsbeitrag 1');
  equal('Quelle passt zum angezeigten Titel', app.currentSource, 'public/assets/videos/video1.mp4');

  await app.endMedia(); // Video 1 vorbei -> Spot
  equal('Kennzeichnung nach Videoende', app.nowPlayingTag, 'WERBUNG');
  equal('Quelle passt zur Kennzeichnung', app.currentSource, SPOT);

  await app.endMedia(); // Spot vorbei -> Video 2
  equal('Keine Verzoegerung um einen Eintrag', app.nowPlayingTitle, 'Vereinsbeitrag 2');
  equal('Quelle bleibt synchron', app.currentSource, 'public/assets/videos/video2.mp4');

  app.close();
}

// ---------------------------------------------------------------------
// 4. Blockiertes Autoplay: genau eine sichtbare Aktivierung
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006', autoplayBlocked: true });

  check('Aktivierungsflaeche wird sichtbar', app.activateVisible === true);
  check('Kein Fehlerzustand bei blockiertem Autoplay', app.flowState !== 'ERROR');
  equal('Ablauf wartet auf die Nutzeraktion', app.flowState, 'AD_READY');
  equal('Spot ist bereits geladen', app.currentSource, SPOT);

  await app.userActivates();
  equal('Wiedergabe startet nach genau einem Klick', app.flowState, 'AD_PLAYING');
  check('Aktivierungsflaeche verschwindet wieder', app.activateVisible === false);
  check('Ton ist nach der Nutzeraktion aktiv', app.video.muted === false);

  // Danach muss der Ablauf dauerhaft ohne weiteres Zutun weiterlaufen.
  await app.endMedia();
  equal('Nach der Aktivierung laeuft der Ablauf allein weiter', app.nowPlayingTag, 'JETZT LÄUFT');
  await app.endMedia();
  equal('Und weiter zum naechsten Spot', app.nowPlayingTag, 'WERBUNG');

  app.close();
}

// ---------------------------------------------------------------------
// 5. Kundenwechsel: vollstaendiges Cleanup, kein Parallelbetrieb
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });
  const firstVideo = app.video;

  await app.endMedia(); // in ein Inhaltsvideo hinein wechseln
  equal('Vor dem Wechsel laeuft BBK-Inhalt', app.nowPlayingTitle, 'Vereinsbeitrag 1');

  await app.switchTenant('verein-blau-weiss');

  check('Altes Videoelement ist nicht mehr in der Ansicht', firstVideo !== app.video);
  check('Alter Player wurde angehalten', firstVideo.paused === true);
  check('Alte Quelle wurde geloest', !firstVideo.getAttribute('src'));
  equal('Nur eine Tenant-Klasse am body', app.tenantClasses.length, 1);
  equal('Neue Tenant-Klasse ist gesetzt', app.tenantClasses[0], 'tenant-verein-blau-weiss');
  equal('URL fuehrt die oeffentliche Kunden-ID', new URL(app.window.location.href).searchParams.get('kunde'), 'V902');
  equal('Genau ein Videoelement im Dokument', app.document.querySelectorAll('video').length, 1);
  equal('Neuer Kanal startet automatisch mit dem Spot', app.nowPlayingTag, 'WERBUNG');
  // Nur der sichtbare Anwendungsbereich zaehlt — der Testaufbau haengt
  // die Quelldateien als <script>-Elemente in das Dokument, deren Text
  // waere sonst faelschlich Teil von body.textContent.
  check(
    'Kein Titel des vorherigen Vereins sichtbar',
    !app.document.getElementById('app').textContent.includes('Vereinsbeitrag 1')
  );
  check(
    'Titel des neuen Vereins ist sichtbar',
    app.document.getElementById('app').textContent.includes('Saisonr\u00fcckblick 2025/26')
  );

  // Ein Ereignis auf dem alten Element darf den neuen Ablauf nicht mehr
  // beeinflussen (kein doppelter Ablauf, keine alten Listener).
  const tagBefore = app.nowPlayingTag;
  firstVideo.dispatchEvent(new app.window.Event('ended'));
  await app.settle();
  equal('Altes Medienereignis bleibt wirkungslos', app.nowPlayingTag, tagBefore);

  app.close();
}

// ---------------------------------------------------------------------
// 6. Schneller mehrfacher Kundenwechsel (Wettlaufsituation)
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });

  await app.switchTenantRapid([
    'verein-blau-weiss',
    'scorpions-sggierath',
    'bbk-duesseldorf',
    'verein-blau-weiss',
  ]);

  equal('Genau ein Videoelement nach vier schnellen Wechseln', app.document.querySelectorAll('video').length, 1);
  equal('Genau eine Tenant-Klasse', app.tenantClasses.length, 1);
  equal('Der zuletzt gewaehlte Verein gewinnt', app.tenantClasses[0], 'tenant-verein-blau-weiss');
  equal('Angezeigter Kanalname passt', app.document.querySelector('.tv-name').textContent, 'SV Blau-Wei\u00df TV');
  equal('Genau ein laufender Ablauf', app.nowPlayingTag, 'WERBUNG');

  // Rueckwechsel muss ebenfalls sauber funktionieren.
  await app.switchTenant('bbk-duesseldorf');
  equal('Rueckwechsel zu V006 funktioniert', app.document.querySelector('.tv-name').textContent, 'BBK TV');
  equal('Auch danach nur ein Videoelement', app.document.querySelectorAll('video').length, 1);
  await app.endMedia();
  equal('Ablauf laeuft nach dem Rueckwechsel weiter', app.nowPlayingTitle, 'Vereinsbeitrag 1');

  app.close();
}

// ---------------------------------------------------------------------
// 7. Unbekannte Kunden-ID
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V999' });

  check('Anwendung stuerzt nicht ab', !!app.video);
  check('Sichtbarer Hinweis erscheint', !!app.document.querySelector('.tv-notice'));
  check(
    'Hinweis nennt die angeforderte Kunden-ID',
    app.document.querySelector('.tv-notice').textContent.includes('V999')
  );
  equal('Ersatzkanal startet trotzdem automatisch', app.nowPlayingTag, 'WERBUNG');

  app.close();
}

// ---------------------------------------------------------------------
// 8. Fehlerhafte Medienquelle
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });

  await app.failMedia(4);
  equal('Medienfehler fuehrt in den Fehlerzustand', app.flowState, 'ERROR');
  check('Verstaendliche Meldung wird angezeigt', app.document.querySelector('.player-video-message').hidden === false);
  check('Anwendung bleibt bedienbar', !!app.document.querySelector('.tv-tenant-switcher'));

  // Aus dem Fehler heraus muss ein Kundenwechsel wieder in den
  // laufenden Sendebetrieb zuruecckfuehren.
  await app.switchTenant('verein-blau-weiss');
  equal('Kundenwechsel behebt den Fehlerzustand', app.nowPlayingTag, 'WERBUNG');

  app.close();
}

// ---------------------------------------------------------------------
// 9. Embed-Ansicht
// ---------------------------------------------------------------------
{
  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006&modus=embed' });

  check('Embed-Ansicht wird gerendert', !!app.document.querySelector('.tv-app--embed'));
  check('Kein Vereinswechsler in der Einbettung', !app.document.querySelector('.tv-tenant-switcher'));
  equal('Auch die Einbettung startet automatisch', app.nowPlayingTag, 'WERBUNG');
  await app.endMedia();
  equal('Auch die Einbettung wechselt selbsttaetig weiter', app.nowPlayingTag, 'JETZT LÄUFT');

  app.close();
}

// ---------------------------------------------------------------------
// 10. Reload (erneuter vollstaendiger Bootstrap)
// ---------------------------------------------------------------------
{
  const first = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });
  await first.endMedia();
  const titleBefore = first.nowPlayingTitle;
  first.close();

  const second = await createApp({ url: 'https://onlang-tv.test/?kunde=V006' });
  equal('Nach dem Reload beginnt wieder der Spot', second.nowPlayingTag, 'WERBUNG');
  await second.endMedia();
  equal('Und danach wieder Video 1', second.nowPlayingTitle, titleBefore);
  second.close();
}

// ---------------------------------------------------------------------
// 11. Bootstrap-API liefert die oeffentliche Kunden-ID "V006"
// ---------------------------------------------------------------------
// Die Apps-Script-API gibt je nach Datenquelle customerId: "V006" zurueck
// statt des internen Schluessels "bbk-duesseldorf". Das Branding muss
// trotzdem greifen.
{
  const bootstrapResponse = {
    success: true,
    meta: { requestedCustomerId: 'V006', loadedCustomerId: 'V006', fallbackUsed: false },
    tenant: {
      customerId: 'V006',
      name: 'BBK TV',
      tagline: 'Das Videoportal des Basketballkreises Duesseldorf / Neuss',
      logoUrl: 'public/assets/logos/bbk-logo.png',
      logoText: 'BBK',
      theme: { accent: '#ff7a1a', background: '#0f172a', surface: '#18233d', text: '#ffffff' },
      presenter: { label: 'BBK TV praesentiert von', name: 'ONLANG', logoUrl: '' },
    },
    settings: { defaultView: 'full', autoplay: true, mutedAutoplay: true, advertisingMode: 'startup' },
    playlist: {
      videos: [
        { id: 'api-1', title: 'API Beitrag 1', category: 'Highlights', durationLabel: 'VIDEO', src: 'public/assets/videos/video1.mp4' },
        { id: 'api-2', title: 'API Beitrag 2', category: 'Interviews', durationLabel: 'VIDEO', src: 'public/assets/videos/video2.mp4' },
      ],
    },
    advertising: {
      items: [
        { id: 'api-ad', title: 'ONLANG praesentiert', durationLabel: '00:10', src: SPOT, active: true },
      ],
    },
  };

  const app = await createApp({ url: 'https://onlang-tv.test/?kunde=V006', bootstrapResponse });

  equal('API-Daten werden verwendet', app.document.querySelector('.tv-name').textContent, 'BBK TV');
  equal(
    'customerId "V006" ergibt trotzdem die BBK-Klasse',
    app.tenantClasses.join(','),
    'tenant-bbk-duesseldorf'
  );
  check('Keine unbrauchbare Klasse tenant-v006', !app.tenantClasses.includes('tenant-v006'));
  check('Kein faelschlicher Fallback-Hinweis', !app.document.querySelector('.tv-notice'));
  equal('Sendebetrieb startet auch mit API-Daten', app.nowPlayingTag, 'WERBUNG');

  await app.endMedia();
  equal('API-Playlist laeuft weiter', app.nowPlayingTitle, 'API Beitrag 1');

  const switcher = app.document.querySelector('.tv-tenant-switcher');
  equal('Schnellwechsler markiert den richtigen Verein', switcher.value, 'bbk-duesseldorf');

  app.close();
}

// ---------------------------------------------------------------------
// 12. Struktur: Tests und Anwendung laden dieselben Dateien
// ---------------------------------------------------------------------
{
  const scripts = getScriptOrderFromIndexHtml();
  check('index.html laedt den Testkunden V902 mit', scripts.includes('public/demo-data/verein-blau-weiss.js'));
  check('index.html laedt die Ablaufsteuerung', scripts.includes('src/playback/playback-flow-controller.js'));
  check(
    'Kein Vorablade-Modul mehr aktiv',
    !scripts.some((s) => s.includes('preload'))
  );
}

finish('playback-demo.test.js');
