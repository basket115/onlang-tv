// media.test.js
//
// Prüft die Demo-Medien auf die zwei Eigenschaften, die im Browser über
// "startet sofort" und "schwarzes Bild" entscheiden:
//
// 1. Jede in den Mandantendaten referenzierte Datei existiert.
// 2. Der moov-Container (die Metadaten) liegt VOR den Mediendaten.
//
// Zu 2.: Liegt moov am Dateiende, muss der Browser die gesamte Datei
// laden, bevor er überhaupt die Länge kennt und mit der Wiedergabe
// beginnen kann. Bei einem 7,7 MB großen Werbespot bedeutet das je nach
// Verbindung mehrere Sekunden schwarzes Bild — die Seite wirkt tot.
// ffmpeg -movflags +faststart stellt moov nach vorn.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import './setup-dom-shim.js';
import '../src/tenant/tenant-schema.js';
import '../src/tenant/tenant-validator.js';
import '../public/demo-data/default.js';
import '../public/demo-data/bbk-duesseldorf.js';
import '../public/demo-data/scorpions-sggierath.js';
import '../public/demo-data/verein-blau-weiss.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

console.log('media.test.js');

let failures = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`  \u2713 ${label}`);
  } else {
    failures += 1;
    console.error(`  \u2717 ${label}${detail ? ` \u2014 ${detail}` : ''}`);
  }
}

/** Liest die Reihenfolge der Top-Level-Boxen einer MP4-Datei. */
function readBoxOrder(filePath) {
  const size = fs.statSync(filePath).size;
  const fd = fs.openSync(filePath, 'r');
  const boxes = [];
  let pos = 0;

  try {
    while (pos < size) {
      const header = Buffer.alloc(8);
      if (fs.readSync(fd, header, 0, 8, pos) < 8) break;

      let boxSize = header.readUInt32BE(0);
      const type = header.toString('latin1', 4, 8);

      if (boxSize === 1) {
        const large = Buffer.alloc(8);
        fs.readSync(fd, large, 0, 8, pos + 8);
        boxSize = Number(large.readBigUInt64BE(0));
      }
      if (boxSize === 0) boxSize = size - pos;
      if (boxSize < 8) break;

      boxes.push(type);
      pos += boxSize;
    }
  } finally {
    fs.closeSync(fd);
  }

  return boxes;
}

// Alle in den Mandantendaten referenzierten Quellen einsammeln.
const registry = window.ONLANG.tenantRegistry;
const sources = new Set();

Object.keys(registry).forEach((key) => {
  const tenant = registry[key];
  [...(tenant.videos || []), ...(tenant.advertisements || [])].forEach((entry) => {
    if (entry && entry.src) sources.add(entry.src);
  });
});

check('Mandantendaten referenzieren Medien', sources.size > 0, `${sources.size} Quelle(n)`);

[...sources].sort().forEach((src) => {
  const filePath = path.join(ROOT, src);

  if (!fs.existsSync(filePath)) {
    check(`${src}: Datei vorhanden`, false, 'Datei fehlt');
    return;
  }
  check(`${src}: Datei vorhanden`, true);

  const boxes = readBoxOrder(filePath);
  const moovIndex = boxes.indexOf('moov');
  const mdatIndex = boxes.indexOf('mdat');

  check(`${src}: gültige MP4-Struktur`, boxes[0] === 'ftyp' && moovIndex !== -1 && mdatIndex !== -1, boxes.join(' '));
  check(
    `${src}: sofort abspielbar (moov vor mdat)`,
    moovIndex !== -1 && mdatIndex !== -1 && moovIndex < mdatIndex,
    `Reihenfolge: ${boxes.join(' ')}`
  );
});

if (failures > 0) {
  console.error(`\nmedia.test.js: ${failures} Test(s) fehlgeschlagen\n`);
  process.exit(1);
}
console.log('media.test.js: alle Tests bestanden\n');
