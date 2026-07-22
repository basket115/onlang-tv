// smoke.test.js
//
// Rauchtest: prüft, dass alle drei Mandanten-Registrierungsdateien
// unter public/demo-data/*.js gültig sind und ohne Validierungshinweis
// durchlaufen. Ab Phase 5 werden die Mandantendaten NICHT mehr per
// fetch() aus .json-Dateien geladen (funktioniert unter file:// nicht),
// sondern über klassische <script>-Tags, die sich in
// window.ONLANG.tenantRegistry eintragen — daher prüft dieser Test die
// *.js-Dateien, nicht *.json (siehe src/tenant/tenant-service.js).

import './setup-dom-shim.js';
import '../src/tenant/tenant-schema.js';
import '../src/tenant/tenant-validator.js';
import '../public/demo-data/default.js';
import '../public/demo-data/bbk-duesseldorf.js';
import '../public/demo-data/verein-blau-weiss.js';

const validateTenantData = window.ONLANG.tenant.TenantValidator.validateTenantData;
const registry = window.ONLANG.tenantRegistry;

console.log('smoke.test.js');

['DEFAULT', 'bbk-duesseldorf', 'verein-blau-weiss'].forEach((customerId) => {
  const raw = registry[customerId];
  if (!raw) {
    console.error(`  ✗ Kunden-ID "${customerId}" nicht in der Registry gefunden`);
    process.exit(1);
  }

  const { data, warnings } = validateTenantData(raw);

  if (data.tenant.customerId !== raw.tenant.customerId) {
    console.error(`  ✗ ${customerId}: customerId stimmt nach Validierung nicht überein`);
    process.exit(1);
  }
  console.log(`  ✓ ${customerId}: gefunden und customerId korrekt`);

  if (warnings.length !== 0) {
    console.error(`  ✗ ${customerId}: sollte ohne Validierungshinweise durchlaufen, tatsächlich: ${warnings.join('; ')}`);
    process.exit(1);
  }
  console.log(`  ✓ ${customerId}: durchläuft die Validierung ohne Hinweise`);

  if (data.videos.length === 0) {
    console.error(`  ✗ ${customerId}: sollte mindestens ein Video enthalten`);
    process.exit(1);
  }
  console.log(`  ✓ ${customerId}: enthält ${data.videos.length} Video(s), ${data.categories.length} Kategorie(n), ${data.partners.length} Partner, ${data.advertisements.length} Werbespot(s)`);
});

console.log('smoke.test.js: alle Tests bestanden\n');
