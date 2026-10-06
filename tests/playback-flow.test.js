// playback-flow.test.js
//
// Prüft die Ankündigung "Als Nächstes" und den Ablauf mit und ohne
// Werbespot. Der Player ist eine Attrappe, die nur Ereignisse weitergibt.
// Direkt mit "node tests/playback-flow.test.js" ausführbar.

import './setup-dom-shim.js';
import '../src/playlist/playlist-state.js';
import '../src/playlist/playlist-controller.js';
import '../src/advertising/advertising-state.js';
import '../src/advertising/advertising-controller.js';
import '../src/playback/playback-flow-controller.js';

let passed = 0;
const originalLog = console.log;

function test(name, fn) {
  console.log = () => {};
  try {
    fn();
  } finally {
    console.log = originalLog;
  }
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function gleich(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg || 'Assertion fehlgeschlagen') + `: erwartet ${e}, erhalten ${a}`);
}

// Attrappe: merkt sich die geladene Quelle; ende() meldet "Medium beendet".
function attrappe() {
  const listeners = {};
  const player = {
    quelle: '',
    on(name, fn) { listeners[name] = fn; },
    load(medium) { player.quelle = medium.source; player.bild = medium.poster || ''; listeners.loadedmetadata(); },
    play() { listeners.play(); },
    pause() {},
    stop() {},
    ende() { listeners.ended(); },
  };
  return player;
}

function starte(videos, spots) {
  const player = attrappe();
  const flow = window.ONLANG.playback.PlaybackFlowController.createPlaybackFlowController();
  flow.initialize({
    player,
    playlist: window.ONLANG.playlist.PlaylistController.createPlaylistController(),
    advertising: window.ONLANG.advertising.AdvertisingController.createAdvertisingController(),
    contentItems: videos,
    advertisements: spots,
  });
  flow.play();
  return { player, flow };
}

const v1 = { id: 'v1', title: 'Video 1', src: 'https://x.test/1.mp4' };
const v2 = { id: 'v2', title: 'Video 2', src: 'https://x.test/2.mp4' };
const spot = { id: 's1', title: 'Spot vom Verein', src: 'https://x.test/s.mp4', active: true };

console.log('playback-flow.test.js');

test('ohne Spot: kein Werbespot wird angekündigt oder gespielt, es folgt direkt das nächste Video', () => {
  const { player, flow } = starte([v1, v2], []);
  gleich([flow.hasAdvertisement(), player.quelle, flow.getNowPlayingInfo().title], [false, v1.src, 'Video 1']);
  gleich(flow.getUpcomingInfo(), { nextTag: 'ALS NÄCHSTES', nextTitle: 'Video 2', afterTag: '', afterTitle: '' });
  player.ende();
  gleich([player.quelle, flow.getUpcomingInfo().nextTitle], [v2.src, 'Video 1']);
});

test('ohne Spot und nur ein Video: nichts wird angekündigt, das Video läuft wieder von vorn', () => {
  const { player, flow } = starte([v1], []);
  gleich(flow.getUpcomingInfo().nextTitle, '');
  player.ende();
  gleich([player.quelle, flow.getCurrentMode()], [v1.src, 'CONTENT']);
});

test('mit Spot des Vereins: Spot zuerst, dann Video, Ankündigung Spot und danach das nächste Video', () => {
  const { player, flow } = starte([v1, v2], [spot]);
  gleich([flow.hasAdvertisement(), player.quelle, flow.getNowPlayingInfo().tag], [true, spot.src, 'WERBUNG']);
  player.ende();
  gleich([player.quelle, flow.getNowPlayingInfo().title], [v1.src, 'Video 1']);
  gleich(flow.getUpcomingInfo(), { nextTag: 'ALS NÄCHSTES', nextTitle: 'Spot vom Verein', afterTag: 'DANACH', afterTitle: 'Video 2' });
});

test('während des Spots meldet der Ablauf den Modus Werbung (die Programmliste markiert dann kein Video)', () => {
  const { player, flow } = starte([v1, v2], [spot]);
  gleich([flow.getCurrentMode(), flow.MODES.ADVERTISEMENT], ['ADVERTISEMENT', 'ADVERTISEMENT']);
  player.ende();
  gleich(flow.getCurrentMode(), 'CONTENT');
  player.ende();
  gleich([flow.getCurrentMode(), player.quelle], ['ADVERTISEMENT', spot.src]);
});

test('Vorschaubild des Videos geht an den Player, beim Spot keins', () => {
  const mitBild = { ...v1, poster: 'https://x.test/1.jpg' };
  const { player } = starte([mitBild, v2], [spot]);
  gleich([player.quelle, player.bild], [spot.src, '']);
  player.ende();
  gleich([player.quelle, player.bild], [v1.src, 'https://x.test/1.jpg']);
});

test('inaktiver Spot zählt nicht', () => {
  const { player, flow } = starte([v1, v2], [{ ...spot, active: false }]);
  gleich([flow.hasAdvertisement(), player.quelle, flow.getUpcomingInfo().nextTitle], [false, v1.src, 'Video 2']);
});

console.log(`playback-flow.test.js: ${passed} Tests bestanden\n`);
