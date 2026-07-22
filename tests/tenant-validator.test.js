// tenant-validator.test.js
//
// Einfache Tests ohne externes Test-Framework — direkt mit
// "node tests/tenant-validator.test.js" ausführbar. tenant-schema.js/
// tenant-validator.js sind ab Phase 5 klassische Browser-Scripts (kein
// ES-Modul mehr) — setup-dom-shim.js macht sie unter Node lauffähig.

import './setup-dom-shim.js';
import '../src/tenant/tenant-schema.js';
import '../src/tenant/tenant-validator.js';

const validateTenantData = window.ONLANG.tenant.TenantValidator.validateTenantData;

let passed = 0;

function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'Assertion fehlgeschlagen') + `: erwartet "${expected}", erhalten "${actual}"`);
  }
}

function assertTrue(value, msg) {
  if (!value) throw new Error(msg || 'Erwartet: true');
}

function assertDeepEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg || 'Assertion fehlgeschlagen') + `: erwartet ${e}, erhalten ${a}`);
}

console.log('tenant-validator.test.js');

test('null/undefined Eingabe liefert vollständigen, funktionierenden Standard-Datensatz', () => {
  const { data, warnings } = validateTenantData(null);
  assertEqual(data.tenant.customerId, 'DEFAULT');
  assertEqual(data.tenant.name, 'ONLANG TV');
  assertEqual(data.settings.defaultView, 'full');
  assertEqual(data.settings.advertisingMode, 'off');
  assertTrue(Array.isArray(data.videos));
  assertTrue(Array.isArray(data.categories));
  assertTrue(Array.isArray(data.partners));
  assertTrue(Array.isArray(data.advertisements));
  assertTrue(warnings.length > 0, 'sollte auf die fehlenden Daten hinweisen');
});

test('leeres Objekt {} liefert ebenfalls vollständigen Standard-Datensatz', () => {
  const { data } = validateTenantData({});
  assertEqual(data.tenant.customerId, 'DEFAULT');
  assertDeepEqual(data.videos, []);
});

test('vorhandene, gültige Werte (inkl. neuer Branding-Felder) bleiben unverändert erhalten', () => {
  const { data, warnings } = validateTenantData({
    tenant: {
      customerId: 'bbk-duesseldorf', name: 'BBK TV', tagline: 'Test', logoUrl: '/x.png', logoText: 'BBK',
      theme: { accent: '#ff7a1a' },
      presenter: { label: 'präsentiert von', name: 'ONLANG', logoUrl: '' },
    },
    settings: { advertisingMode: 'always', autoplay: true },
    live: { enabled: false, title: '', date: '', time: '' },
    videos: [{ id: 'v1', title: 'Video 1', src: 'x.mp4' }],
    categories: [], partners: [], advertisements: [],
  });
  assertEqual(data.tenant.customerId, 'bbk-duesseldorf');
  assertEqual(data.tenant.name, 'BBK TV');
  assertEqual(data.tenant.logoText, 'BBK');
  assertEqual(data.tenant.theme.accent, '#ff7a1a');
  // Nicht gesetzte Theme-Felder fallen weiterhin auf den Standard zurück.
  assertEqual(data.tenant.theme.background, '#080808');
  assertEqual(data.tenant.presenter.name, 'ONLANG');
  assertEqual(data.settings.advertisingMode, 'always');
  assertEqual(data.videos.length, 1);
  assertEqual(data.videos[0].title, 'Video 1');
  assertEqual(warnings.length, 0, 'bei vollständig gültigen Daten sollten keine Hinweise entstehen: ' + warnings.join('; '));
});

test('ungültiger advertisingMode fällt auf "off" zurück und erzeugt einen Hinweis', () => {
  const { data, warnings } = validateTenantData({ settings: { advertisingMode: 'kaputt' } });
  assertEqual(data.settings.advertisingMode, 'off');
  assertTrue(warnings.some((w) => w.includes('advertisingMode')));
});

test('Nicht-Array-Werte für videos/categories/partners/advertisements werden zu leeren Arrays', () => {
  const { data, warnings } = validateTenantData({
    videos: 'kaputt', categories: 42, partners: null, advertisements: { nicht: 'array' },
  });
  assertDeepEqual(data.videos, []);
  assertDeepEqual(data.categories, []);
  assertDeepEqual(data.partners, []);
  assertDeepEqual(data.advertisements, []);
  assertTrue(warnings.some((w) => w.includes('videos')));
  assertTrue(warnings.some((w) => w.includes('categories')));
});

test('leerer customerId-String fällt auf DEFAULT zurück', () => {
  const { data, warnings } = validateTenantData({ tenant: { customerId: '   ', name: 'X' } });
  assertEqual(data.tenant.customerId, 'DEFAULT');
  assertTrue(warnings.some((w) => w.includes('customerId')));
});

test('ungültige Video-/Werbe-Einträge werden einzeln übersprungen, gültige bleiben erhalten', () => {
  const { data, warnings } = validateTenantData({
    videos: [
      { id: 'v1', title: 'Gültig', src: 'a.mp4' },
      { id: 'v2', title: '', src: 'b.mp4' },
      { id: 'v3', src: 'c.mp4' },
    ],
    advertisements: [
      { id: 'ad1', title: 'Spot', src: 'ad.mp4', active: true },
      { id: 'ad2', title: '', src: '' },
    ],
  });
  assertEqual(data.videos.length, 1);
  assertEqual(data.videos[0].id, 'v1');
  assertEqual(data.advertisements.length, 1);
  assertEqual(data.advertisements[0].id, 'ad1');
  assertTrue(warnings.some((w) => w.includes('videos[1]')));
  assertTrue(warnings.some((w) => w.includes('videos[2]')));
});

console.log(`tenant-validator.test.js: ${passed} Test(s) bestanden\n`);
