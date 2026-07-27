// tenant-service.test.js
//
// Prüft ausschließlich die Bootstrap-Anpassung in tenant-service.js
// (adaptBootstrapResult()/normalizeSettings()) — nicht den restlichen
// Sendebetrieb (siehe playback-demo.test.js dafür).
//
// Anlass: Die Apps-Script-Bootstrap-API liefert settings.advertisingMode
// aktuell als "between" statt eines der drei offiziellen, von
// tenant-validator.js akzeptierten Werte ("off"/"startup"/"always",
// siehe tenant-schema.js). Ohne Abbildung erzeugte jeder Bootstrap-
// Aufruf eine Validierungswarnung und advertisingMode fiel auf "off"
// zurück, obwohl der angeforderte Modus ("Werbung zwischen jedem
// Video") inhaltlich gültig gemeint war.

import './setup-dom-shim.js';
import '../src/tenant/tenant-schema.js';
import '../src/tenant/tenant-validator.js';
import '../src/tenant/tenant-service.js';

window.location = { protocol: 'https:', search: '', href: 'https://onlang-tv.test/' };

const TenantService = window.ONLANG.tenant.TenantService;

let passed = 0;

async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) {
    throw new Error((msg || 'Assertion fehlgeschlagen') + `: erwartet "${expected}", erhalten "${actual}"`);
  }
}

function bootstrapResponse(advertisingMode) {
  return {
    success: true,
    meta: { requestedCustomerId: 'V006', loadedCustomerId: 'V006', fallbackUsed: false },
    tenant: { customerId: 'V006', name: 'BBK TV' },
    settings: { defaultView: 'full', autoplay: true, mutedAutoplay: false, loopPlaylist: true, advertisingMode },
    playlist: { videos: [{ id: 'v1', title: 'V1', src: 'x.mp4' }] },
    advertising: { items: [] },
  };
}

console.log('tenant-service.test.js');

await test('Bootstrap-Wert "between" wird auf den offiziellen Wert "always" abgebildet, keine Warnung', async () => {
  window.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => bootstrapResponse('between'),
  });

  const result = await TenantService.loadTenantData('V006');

  assertEqual(result.dataSource, 'bootstrap-api');
  assertEqual(result.data.settings.advertisingMode, 'always');
  assertEqual(
    result.warnings.some((w) => w.includes('advertisingMode')),
    false,
    'keine Validierungswarnung zu advertisingMode erwartet: ' + result.warnings.join('; ')
  );
});

await test('Bereits offizielle Werte (z.B. "startup") bleiben unverändert, keine Warnung', async () => {
  window.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => bootstrapResponse('startup'),
  });

  const result = await TenantService.loadTenantData('V006');

  assertEqual(result.data.settings.advertisingMode, 'startup');
  assertEqual(
    result.warnings.some((w) => w.includes('advertisingMode')),
    false,
    'keine Validierungswarnung zu advertisingMode erwartet: ' + result.warnings.join('; ')
  );
});

await test('Tatsächlich ungültige Werte lösen weiterhin die Warnung aus (Alias ersetzt keine echte Validierung)', async () => {
  window.fetch = async () => ({
    ok: true,
    status: 200,
    json: async () => bootstrapResponse('kaputt'),
  });

  const result = await TenantService.loadTenantData('V006');

  assertEqual(result.data.settings.advertisingMode, 'off');
  assertEqual(
    result.warnings.some((w) => w.includes('advertisingMode')),
    true,
    'Validierungswarnung zu advertisingMode erwartet, aber keine erhalten'
  );
});

console.log(`tenant-service.test.js: ${passed} Test(s) bestanden\n`);
