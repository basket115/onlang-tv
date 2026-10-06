// tenant-service.test.js
//
// Prüft, was die Browser-Seite aus den Antworten der Bootstrap-Function
// macht: Sprache, Zustand und vor allem, wann Demo-Videos erscheinen
// dürfen. fetch() ist eine Attrappe. Direkt mit
// "node tests/tenant-service.test.js" ausführbar.

import './setup-dom-shim.js';

const browser = { language: 'de-DE' };
window.location = { search: '', protocol: 'https:' };
Object.defineProperty(globalThis, 'navigator', { value: browser, configurable: true });

await import('../src/tenant/tenant-schema.js');
await import('../src/tenant/tenant-validator.js');
await import('../src/tenant/tenant-service.js');
await import('../public/demo-data/default.js');
await import('../public/demo-data/darazsak.js');

const service = window.ONLANG.tenant.TenantService;

let passed = 0;
let naechsteAntwort = null;
const originalWarn = console.warn;
const originalInfo = console.info;
console.warn = () => {};
console.info = () => {};

globalThis.fetch = async () => {
  if (naechsteAntwort === 'kaputt') throw new Error('Netz weg');
  return new Response(JSON.stringify(naechsteAntwort.body), { status: naechsteAntwort.status });
};

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

function bootstrap(videos, language) {
  return {
    status: 200,
    body: {
      success: true,
      tenant: { customerId: 'V002', name: 'Scorpions TV', tagline: '', logoUrl: '', logoText: '', theme: { accent: '#d71920', background: '#080808', surface: '#151515', text: '#ffffff' }, presenter: { label: '', name: '', logoUrl: '' } },
      settings: { defaultView: 'full', autoplay: true, mutedAutoplay: true, loopPlaylist: true, advertisingMode: 'off' },
      playlist: { videos },
      advertising: { items: [] },
      live: { enabled: false, title: '', date: '', time: '' },
      warnings: [],
      meta: { requestedCustomerId: 'V002', loadedCustomerId: 'V002', fallbackUsed: false, language },
    },
  };
}

console.log('tenant-service.test.js');

await test('Kunden-ID aus der Adresse: ?kunde= vor ?tenant=, immer Großbuchstaben, sonst DEFAULT', () => {
  gleich(service.getRequestedCustomerId({ search: '?kunde=v002' }), 'V002');
  gleich(service.getRequestedCustomerId({ search: '?tenant=hu001' }), 'HU001');
  gleich(service.getRequestedCustomerId({ search: '?kunde=V006&tenant=x' }), 'V006');
  gleich(service.getRequestedCustomerId({ search: '' }), 'DEFAULT');
});

await test('bekannter Kunde mit Video: Daten des Kunden, Zustand ok, Sprache de', async () => {
  naechsteAntwort = bootstrap([{ id: 'a', title: 'Spielbericht', src: 'https://youtu.be/abcdefghijk', category: 'VIDEO', durationLabel: 'VIDEO' }], 'de');
  const result = await service.loadTenantData('V002');
  gleich([result.data.tenant.name, result.data.videos.length, result.dataSource], ['Scorpions TV', 1, 'bootstrap-api']);
  gleich([service.getState(), service.getLanguage()], ['ok', 'de']);
});

await test('bekannter Kunde ohne Videos: sein Sender, keine Demo-Videos, Zustand empty, Sprache hu', async () => {
  naechsteAntwort = bootstrap([], 'hu');
  const result = await service.loadTenantData('V002');
  gleich([result.data.tenant.name, result.data.videos, result.data.advertisements], ['Scorpions TV', [], []]);
  gleich([service.getState(), service.getLanguage()], ['empty', 'hu']);
});

await test('unbekannter Kunde: neutraler Demo-Sender DEFAULT, auch wenn es lokale Demo-Daten zur ID gäbe', async () => {
  naechsteAntwort = { status: 200, body: { success: false, error: { code: 'CUSTOMER_UNKNOWN', message: 'Kunde unbekannt.' } } };
  const result = await service.loadTenantData('HU001');
  gleich([result.loadedCustomerId, result.data.tenant.name, result.data.videos.length > 0], ['DEFAULT', 'ONLANG TV', true]);
  gleich([service.getState(), service.getLanguage()], ['ok', 'de']);
});

await test('TV nicht erreichbar (HTTP 503, Netzfehler, unbekannter Fehlercode): Hinweis-Zustand, keine Demo-Videos', async () => {
  const faelle = [
    { status: 503, body: { success: false, error: { code: 'TV_UNAVAILABLE', message: '' } } },
    'kaputt',
    { status: 200, body: { success: false, error: { code: 'IRGENDWAS', message: '' } } },
  ];
  for (const fall of faelle) {
    naechsteAntwort = fall;
    const result = await service.loadTenantData('HU001');
    gleich([result.data.tenant.name, result.data.videos, result.data.advertisements, result.dataSource], ['ONLANG TV', [], [], 'unavailable']);
    gleich([service.getState(), service.getLanguage()], ['unavailable', 'de']);
  }
});

await test('TV nicht erreichbar bei ungarischem Browser: Sprache hu', async () => {
  browser.language = 'hu-HU';
  naechsteAntwort = 'kaputt';
  await service.loadTenantData('HU001');
  gleich([service.getState(), service.getLanguage()], ['unavailable', 'hu']);
  browser.language = 'de-DE';
});

await test('lokaler file://-Betrieb: Demo-Daten aus der Registry, Sprache aus den Demo-Daten', async () => {
  window.location.protocol = 'file:';
  const result = await service.loadTenantData('HU001');
  gleich([result.loadedCustomerId, result.dataSource, service.getLanguage()], ['HU001', 'local-registry', 'hu']);
  window.location.protocol = 'https:';
});

console.warn = originalWarn;
console.info = originalInfo;
console.log(`tenant-service.test.js: ${passed} Tests bestanden\n`);
