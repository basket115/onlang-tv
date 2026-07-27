// i18n.test.js
//
// Eigenständige Tests für die Übersetzungsschicht (src/i18n/*.js).
// Prüft AUSSCHLIESSLICH normalizeLanguage(), isSupported(), setLanguage()/
// getLanguage(), translate()/t() und getLocale() — keine Views, kein
// Bootstrap, kein Player/Playlist/Werbung (die kennt dieser Dienst laut
// Vorgabe bewusst nicht). Klassische <script>-Dateien, ab Phase 5 kein
// ES-Modul mehr — setup-dom-shim.js macht sie unter Node lauffähig
// (siehe tests/tenant-validator.test.js für dasselbe Muster).

import './setup-dom-shim.js';
import '../src/i18n/translations.js';
import '../src/i18n/i18n-service.js';

const I18nService = window.ONLANG.i18n.I18nService;

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

function assertFalse(value, msg) {
  if (value) throw new Error(msg || 'Erwartet: false');
}

console.log('i18n.test.js');

// ---------------------------------------------------------------------
// normalizeLanguage()
// ---------------------------------------------------------------------

test('normalizeLanguage: Deutsch-Varianten -> DE', () => {
  assertEqual(I18nService.normalizeLanguage('de'), 'DE');
  assertEqual(I18nService.normalizeLanguage('de-DE'), 'DE');
  assertEqual(I18nService.normalizeLanguage('de_DE'), 'DE');
  assertEqual(I18nService.normalizeLanguage('Deutsch'), 'DE');
  assertEqual(I18nService.normalizeLanguage('german'), 'DE');
});

test('normalizeLanguage: Ungarisch-Varianten -> HU', () => {
  assertEqual(I18nService.normalizeLanguage('hu'), 'HU');
  assertEqual(I18nService.normalizeLanguage('hu-HU'), 'HU');
  assertEqual(I18nService.normalizeLanguage('hu_HU'), 'HU');
  assertEqual(I18nService.normalizeLanguage('Magyar'), 'HU');
  assertEqual(I18nService.normalizeLanguage('Ungarisch'), 'HU');
  assertEqual(I18nService.normalizeLanguage('hungarian'), 'HU');
});

test('normalizeLanguage: Englisch-Varianten -> EN', () => {
  assertEqual(I18nService.normalizeLanguage('en'), 'EN');
  assertEqual(I18nService.normalizeLanguage('en-US'), 'EN');
  assertEqual(I18nService.normalizeLanguage('en-GB'), 'EN');
  assertEqual(I18nService.normalizeLanguage('en_GB'), 'EN');
  assertEqual(I18nService.normalizeLanguage('English'), 'EN');
  assertEqual(I18nService.normalizeLanguage('Englisch'), 'EN');
});

test('normalizeLanguage: Groß-/Kleinschreibung wird ignoriert', () => {
  assertEqual(I18nService.normalizeLanguage('DE'), 'DE');
  assertEqual(I18nService.normalizeLanguage('hU'), 'HU');
  assertEqual(I18nService.normalizeLanguage('EN'), 'EN');
  assertEqual(I18nService.normalizeLanguage('MAGYAR'), 'HU');
});

test('normalizeLanguage: umgebende Leerzeichen werden entfernt', () => {
  assertEqual(I18nService.normalizeLanguage('  de  '), 'DE');
  assertEqual(I18nService.normalizeLanguage(' Magyar '), 'HU');
  assertEqual(I18nService.normalizeLanguage('\ten-US\n'), 'EN');
});

test('normalizeLanguage: ungültige/fehlende Werte fallen auf DE zurück', () => {
  assertEqual(I18nService.normalizeLanguage(''), 'DE');
  assertEqual(I18nService.normalizeLanguage('   '), 'DE');
  assertEqual(I18nService.normalizeLanguage(null), 'DE');
  assertEqual(I18nService.normalizeLanguage(undefined), 'DE');
  assertEqual(I18nService.normalizeLanguage(42), 'DE');
  assertEqual(I18nService.normalizeLanguage('FR'), 'DE');
  assertEqual(I18nService.normalizeLanguage('kaputt'), 'DE');
});

// ---------------------------------------------------------------------
// isSupported()
//
// Entscheidung (siehe i18n-service.js): isSupported() akzeptiert sowohl
// bereits normalisierte Codes ("DE") als auch normalisierbare Aliasse
// ("de"), aber NICHT Werte, die nur wegen des Sicherheits-Fallbacks von
// normalizeLanguage() auf "DE" landen würden (z.B. "FR"). Dieses
// Verhalten ist verbindlich und muss bei jeder späteren Erweiterung so
// bleiben.
// ---------------------------------------------------------------------

test('isSupported: normalisierte Codes sind unterstützt', () => {
  assertTrue(I18nService.isSupported('DE'));
  assertTrue(I18nService.isSupported('HU'));
  assertTrue(I18nService.isSupported('EN'));
});

test('isSupported: normalisierbare Aliasse sind unterstützt', () => {
  assertTrue(I18nService.isSupported('de'));
  assertTrue(I18nService.isSupported('Deutsch'));
  assertTrue(I18nService.isSupported('hu-HU'));
});

test('isSupported: nicht unterstützte oder leere Werte liefern false', () => {
  assertFalse(I18nService.isSupported('FR'));
  assertFalse(I18nService.isSupported(''));
  assertFalse(I18nService.isSupported(null));
  assertFalse(I18nService.isSupported(undefined));
  assertFalse(I18nService.isSupported('kaputt'));
});

test('isSupported("FR") ist false, obwohl normalizeLanguage("FR") aus Sicherheitsgründen DE liefert', () => {
  assertEqual(I18nService.normalizeLanguage('FR'), 'DE');
  assertFalse(I18nService.isSupported('FR'));
});

// ---------------------------------------------------------------------
// setLanguage() / getLanguage()
// ---------------------------------------------------------------------

test('Startwert ist DE', () => {
  // Eigener, frischer Modul-Kontext pro Testdatei (ein Prozess pro
  // "node tests/i18n.test.js"-Aufruf) — an dieser Stelle wurde noch
  // keine Sprache gesetzt.
  assertEqual(I18nService.getLanguage(), 'DE');
});

test('setLanguage("HU") setzt und liefert HU', () => {
  assertEqual(I18nService.setLanguage('HU'), 'HU');
  assertEqual(I18nService.getLanguage(), 'HU');
});

test('setLanguage("en-US") normalisiert auf EN', () => {
  assertEqual(I18nService.setLanguage('en-US'), 'EN');
  assertEqual(I18nService.getLanguage(), 'EN');
});

test('setLanguage("FR") fällt sicher auf DE zurück', () => {
  assertEqual(I18nService.setLanguage('FR'), 'DE');
  assertEqual(I18nService.getLanguage(), 'DE');
});

// ---------------------------------------------------------------------
// translate() / t()
// ---------------------------------------------------------------------

test('DE liefert den deutschen Text', () => {
  I18nService.setLanguage('DE');
  assertEqual(I18nService.translate('status.advertising'), 'WERBUNG');
  assertEqual(I18nService.translate('status.nowPlaying'), 'JETZT LÄUFT');
});

test('HU liefert den ungarischen Text', () => {
  I18nService.setLanguage('HU');
  assertEqual(I18nService.translate('status.advertising'), 'HIRDETÉS');
  assertEqual(I18nService.translate('status.nowPlaying'), 'MOST MŰSORON');
});

test('EN liefert den englischen Text', () => {
  I18nService.setLanguage('EN');
  assertEqual(I18nService.translate('status.advertising'), 'ADVERTISEMENT');
  assertEqual(I18nService.translate('status.nowPlaying'), 'NOW PLAYING');
});

test('translate() und t() liefern dasselbe Ergebnis', () => {
  I18nService.setLanguage('HU');
  assertEqual(I18nService.t('player.play'), I18nService.translate('player.play'));
  assertEqual(I18nService.t('player.play'), 'Lejátszás');
});

test('fehlender Schlüssel in einer Sprache fällt auf DE zurück', () => {
  // datetime.clockSuffix ist für HU/EN absichtlich ein leerer String
  // (kein "Uhr"-Äquivalent) — das ist ein GÜLTIGER, kein fehlender
  // Wert. Für einen echten Fallback-Test wird ein Schlüssel entfernt,
  // der in DE existiert, in HU aber absichtlich nicht angelegt wurde.
  const TRANSLATIONS = window.ONLANG.i18n.Translations.TRANSLATIONS;
  TRANSLATIONS.DE.status.__testOnlyKey = 'Nur auf Deutsch vorhanden';
  I18nService.setLanguage('HU');
  assertEqual(I18nService.translate('status.__testOnlyKey'), 'Nur auf Deutsch vorhanden');
  delete TRANSLATIONS.DE.status.__testOnlyKey;
});

test('fehlender Schlüssel in EN fällt ebenfalls auf DE zurück', () => {
  const TRANSLATIONS = window.ONLANG.i18n.Translations.TRANSLATIONS;
  TRANSLATIONS.DE.status.__testOnlyKey = 'Nur auf Deutsch vorhanden';
  I18nService.setLanguage('EN');
  assertEqual(I18nService.translate('status.__testOnlyKey'), 'Nur auf Deutsch vorhanden');
  delete TRANSLATIONS.DE.status.__testOnlyKey;
});

test('vollständig unbekannter Schlüssel liefert den Schlüssel selbst', () => {
  I18nService.setLanguage('EN');
  assertEqual(I18nService.translate('does.not.exist'), 'does.not.exist');
  I18nService.setLanguage('DE');
  assertEqual(I18nService.translate('nichts.gefunden'), 'nichts.gefunden');
});

test('leerer Schlüssel wird sicher behandelt (kein Fehler, unveränderter Rückgabewert)', () => {
  assertEqual(I18nService.translate(''), '');
});

// ---------------------------------------------------------------------
// getLocale() (additiv)
// ---------------------------------------------------------------------

test('getLocale(): DE -> de-DE, HU -> hu-HU, EN -> en-GB', () => {
  I18nService.setLanguage('DE');
  assertEqual(I18nService.getLocale(), 'de-DE');
  I18nService.setLanguage('HU');
  assertEqual(I18nService.getLocale(), 'hu-HU');
  I18nService.setLanguage('EN');
  assertEqual(I18nService.getLocale(), 'en-GB');
});

// Sprache am Ende zurücksetzen, damit dieser Test unabhängig von der
// Ausführungsreihenfolge innerhalb dieser Datei bleibt.
I18nService.setLanguage('DE');

console.log(`i18n.test.js: ${passed} Test(s) bestanden\n`);
