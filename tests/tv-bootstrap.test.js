// tv-bootstrap.test.js
//
// Prüft die Netlify Function ohne Netz: fetch() wird durch eine
// Attrappe ersetzt, die Supabase-REST-Antworten für "kunden" und
// "tv_inhalte" liefert. Direkt mit "node tests/tv-bootstrap.test.js"
// ausführbar.

import handler from '../netlify/functions/tv-bootstrap.js';

process.env.SUPABASE_URL = 'https://supabase.test';
process.env.SUPABASE_SECRET_KEY = 'geheim';

let passed = 0;
let tabellen = {};
let abrufe = [];

globalThis.fetch = async (url, init) => {
  abrufe.push({ url: String(url), init });
  const tabelle = String(url).split('/rest/v1/')[1].split('?')[0];
  const inhalt = tabellen[tabelle];
  if (inhalt === 'kaputt') throw new Error('Netz weg');
  if (inhalt === undefined) return new Response('{}', { status: 500 });
  return new Response(JSON.stringify(inhalt), { status: 200 });
};

const originalError = console.error;

async function abruf(query) {
  abrufe = [];
  console.error = () => {};
  const response = await handler(new Request('https://tv.test/.netlify/functions/tv-bootstrap' + query));
  console.error = originalError;
  return { status: response.status, body: await response.json() };
}

async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function gleich(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg || 'Assertion fehlgeschlagen') + `: erwartet ${e}, erhalten ${a}`);
}

const V002 = { kunden_id: 'V002', verein_name: 'SG Gierath Basketball', short_name: 'Scorpions', logo_verein: 'https://bilder.test/logo.png', thema_farbe: '#d71920', sprache: 'de' };
const HU001 = { kunden_id: 'HU001', verein_name: 'Kőbányai Darazsak', short_name: '', logo_verein: '', thema_farbe: 'gelb', sprache: 'HU' };

const gestern = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
const morgen = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const heute = new Date().toISOString().slice(0, 10);

console.log('tv-bootstrap.test.js');

await test('bekannter Kunde: Branding aus kunden, Videos und Spots getrennt, bisheriges Format', async () => {
  tabellen = {
    kunden: [V002],
    tv_inhalte: [
      { id: 'a1', typ: 'VIDEO', titel: 'Spielbericht', video_url: 'https://youtu.be/abcdefghijk', poster_url: '', reihenfolge: 1, start_am: null, ende_am: null },
      { id: 'a2', typ: 'WERBESPOT', titel: 'Sponsor', video_url: 'https://bilder.test/spot.mp4', poster_url: 'https://bilder.test/p.jpg', reihenfolge: 2, start_am: gestern, ende_am: morgen },
    ],
  };
  const { status, body } = await abruf('?kunde=v002');
  gleich(status, 200);
  gleich(body.success, true);
  gleich(body.tenant.customerId, 'V002');
  gleich(body.tenant.name, 'Scorpions TV');
  gleich(body.tenant.tagline, '');
  gleich(body.tenant.logoUrl, 'https://bilder.test/logo.png');
  gleich(body.tenant.theme, { accent: '#d71920', background: '#080808', surface: '#151515', text: '#ffffff' });
  gleich(body.playlist.videos.map((v) => [v.id, v.title, v.src, v.category]), [['a1', 'Spielbericht', 'https://youtu.be/abcdefghijk', 'VIDEO']]);
  gleich(body.advertising.items.map((v) => [v.id, v.active, v.poster]), [['a2', true, 'https://bilder.test/p.jpg']]);
  gleich(body.settings.advertisingMode, 'startup');
  gleich(body.meta.language, 'de');
  gleich(Object.keys(body), ['success', 'tenant', 'settings', 'playlist', 'advertising', 'live', 'warnings', 'meta']);
});

await test('Abruf nutzt den geheimen Schlüssel nur als apikey-Header und filtert auf Kunde und aktiv', async () => {
  await abruf('?kunde=V002');
  const tv = abrufe.find((a) => a.url.includes('/tv_inhalte?'));
  gleich(tv.init.headers, { apikey: 'geheim' });
  gleich(tv.url.includes('kunden_id=eq.V002'), true);
  gleich(tv.url.includes('aktiv=eq.true'), true);
  gleich(tv.url.includes('order=reihenfolge.asc'), true);
  gleich(abrufe.every((a) => !a.url.includes('geheim')), true);
});

await test('Zeitraum: noch nicht gestartet und abgelaufen fallen weg, Ende ohne Uhrzeit gilt bis Tagesende', async () => {
  tabellen = {
    kunden: [V002],
    tv_inhalte: [
      { id: 'b1', typ: 'VIDEO', titel: 'Später', video_url: 'https://x.test/1.mp4', start_am: morgen, ende_am: null },
      { id: 'b2', typ: 'VIDEO', titel: 'Vorbei', video_url: 'https://x.test/2.mp4', start_am: null, ende_am: gestern },
      { id: 'b3', typ: 'VIDEO', titel: 'Bis heute', video_url: 'https://x.test/3.mp4', start_am: null, ende_am: heute },
      { id: 'b4', typ: 'VIDEO', titel: 'Ohne Adresse', video_url: 'javascript:alert(1)', start_am: null, ende_am: null },
    ],
  };
  const { body } = await abruf('?kunde=V002');
  gleich(body.playlist.videos.map((v) => v.id), ['b3']);
});

await test('bekannter Kunde ohne Videos: gebrandet, leere Liste, keine Spots, ungarisch', async () => {
  tabellen = {
    kunden: [HU001],
    tv_inhalte: [{ id: 'c1', typ: 'WERBESPOT', titel: 'Spot', video_url: 'https://x.test/s.mp4', start_am: null, ende_am: null }],
  };
  const { body } = await abruf('?tenant=hu001');
  gleich(body.success, true);
  gleich(body.tenant.name, 'Kőbányai Darazsak TV');
  gleich(body.tenant.logoUrl, '');
  gleich(body.tenant.theme.accent, '#f28c00', 'ungültige Farbe -> Standard');
  gleich(body.tenant.presenter.label, 'Kőbányai Darazsak TV bemutatja');
  gleich(body.playlist.videos, []);
  gleich(body.advertising.items, []);
  gleich(body.settings.advertisingMode, 'off');
  gleich(body.meta.language, 'hu');
});

await test('unbekannter, fehlender oder ungültiger Kunde: CUSTOMER_UNKNOWN', async () => {
  tabellen = { kunden: [], tv_inhalte: [] };
  for (const query of ['?kunde=XX999', '', '?kunde=', '?kunde=scorpions-sggierath']) {
    const { status, body } = await abruf(query);
    gleich([status, body.success, body.error.code], [200, false, 'CUSTOMER_UNKNOWN'], query);
  }
});

await test('Supabase nicht erreichbar oder Fehlerstatus: TV_UNAVAILABLE ohne technische Details', async () => {
  for (const zustand of [{ kunden: 'kaputt', tv_inhalte: [] }, { kunden: [V002] }]) {
    tabellen = zustand;
    const { status, body } = await abruf('?kunde=V002');
    gleich([status, body.success, body.error.code], [503, false, 'TV_UNAVAILABLE']);
    gleich(JSON.stringify(body).includes('Netz weg'), false);
  }
});

await test('fehlende Umgebungsvariablen: TV_UNAVAILABLE', async () => {
  const url = process.env.SUPABASE_URL;
  delete process.env.SUPABASE_URL;
  tabellen = { kunden: [V002], tv_inhalte: [] };
  const { status, body } = await abruf('?kunde=V002');
  process.env.SUPABASE_URL = url;
  gleich([status, body.error.code], [503, 'TV_UNAVAILABLE']);
});

console.log(`tv-bootstrap.test.js: ${passed} Tests bestanden\n`);
