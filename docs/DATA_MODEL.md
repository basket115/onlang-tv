# DATA_MODEL.md

Diese Datei beschreibt jedes Feld aus `public/demo-data/default.json`
sowie die Struktur, die `src/tenant/tenant-schema.js` und
`src/tenant/tenant-validator.js` verwenden. Dieses Datenmodell ist
vorläufig (siehe `docs/ROADMAP.md`) und wird in späteren Phasen um
konkrete Video-/Kategorie-/Partner-/Werbe-Felder erweitert, sobald
Player, Playlist und Werbelogik entstehen.

## Vollständiges Beispiel (neutraler Standard-Datensatz)

```json
{
  "tenant": {
    "customerId": "DEFAULT",
    "name": "ONLANG TV",
    "tagline": "Das Videoportal für Vereine und Verbände",
    "logoUrl": "",
    "theme": {
      "accent": "#f28c00",
      "background": "#080808",
      "surface": "#151515",
      "text": "#ffffff"
    }
  },
  "settings": {
    "defaultView": "full",
    "autoplay": false,
    "mutedAutoplay": true,
    "loopPlaylist": false,
    "advertisingMode": "off"
  },
  "live": {
    "enabled": false,
    "title": "",
    "date": "",
    "time": ""
  },
  "videos": [],
  "categories": [],
  "partners": [],
  "advertisements": []
}
```

## `tenant` — Identität und Erscheinungsbild des Mandanten

| Feld | Typ | Beschreibung | Standardwert (Fallback) |
|---|---|---|---|
| `tenant.customerId` | string | Eindeutige Kunden-ID, entspricht dem `?kunde=`-URL-Parameter (z.B. `"V006"`). | `"DEFAULT"` |
| `tenant.name` | string | Anzeigename des Portals (z.B. `"BBK TV"`). | `"ONLANG TV"` |
| `tenant.tagline` | string | Kurzer Untertitel/Claim unter dem Namen. | `"Das Videoportal für Vereine und Verbände"` |
| `tenant.logoUrl` | string | Pfad/URL zum Logo. Leerer String, solange kein Logo hinterlegt ist (spätere Phase zeigt dann einen Platzhalter). | `""` |
| `tenant.theme.accent` | string (Hex-Farbe) | Akzentfarbe (Buttons, Hervorhebungen). | `"#f28c00"` |
| `tenant.theme.background` | string (Hex-Farbe) | Haupt-Hintergrundfarbe. | `"#080808"` |
| `tenant.theme.surface` | string (Hex-Farbe) | Farbe für Karten/Flächen über dem Hintergrund. | `"#151515"` |
| `tenant.theme.text` | string (Hex-Farbe) | Haupttextfarbe. | `"#ffffff"` |

## `settings` — Verhalten der Anwendung für diesen Mandanten

| Feld | Typ | Beschreibung | Gültige Werte | Standardwert |
|---|---|---|---|---|
| `settings.defaultView` | string | Welche Ansicht ohne `?modus=`-Parameter angezeigt wird. | `"full"`, `"embed"` | `"full"` |
| `settings.autoplay` | boolean | Ob Videos automatisch starten sollen (spätere Phase). | `true`/`false` | `false` |
| `settings.mutedAutoplay` | boolean | Ob Autoplay stumm erfolgen soll (Browser-Voraussetzung für Autoplay). | `true`/`false` | `true` |
| `settings.loopPlaylist` | boolean | Ob die Playlist nach dem letzten Video wieder von vorne beginnt (spätere Phase). | `true`/`false` | `false` |
| `settings.advertisingMode` | string | Steuert die spätere Werbespot-Logik. | `"off"`, `"startup"`, `"always"` | `"off"` |

## `live` — Hinweis auf eine bevorstehende Live-Übertragung

| Feld | Typ | Beschreibung | Standardwert |
|---|---|---|---|
| `live.enabled` | boolean | Ob ein Live-Hinweis angezeigt werden soll. | `false` |
| `live.title` | string | Bezeichnung der Übertragung (z.B. „BBK Herrenliga"). | `""` |
| `live.date` | string | Datum der Übertragung (Format wird in einer späteren Phase festgelegt). | `""` |
| `live.time` | string | Uhrzeit der Übertragung. | `""` |

## Listen-Felder (in Schritt 1 bewusst leer)

| Feld | Typ | Beschreibung |
|---|---|---|
| `videos` | Array | Liste der Playlist-Einträge. Struktur wird in Roadmap-Phase 2/3 definiert. |
| `categories` | Array | Liste der Kategorien. Struktur wird in einer späteren Phase definiert. |
| `partners` | Array | Liste der Partner/Sponsoren. Struktur wird in einer späteren Phase definiert. |
| `advertisements` | Array | Liste der Werbespots. Struktur wird in Roadmap-Phase 5 definiert. |

Alle vier Felder werden vom Validator auf „ist es ein Array?" geprüft;
jeder andere Wert (fehlend, `null`, Objekt, String etc.) wird ohne
Fehler zu einem leeren Array `[]`.

## Validierungsverhalten (Zusammenfassung)

`src/tenant/tenant-validator.js` garantiert für jeden Aufruf von
`validateTenantData(rawInput)`:

- Es wird **niemals** eine Exception geworfen.
- Jedes fehlende oder falsch typisierte Feld wird durch den
  entsprechenden Standardwert aus `tenant-schema.js` ersetzt.
- Jede vorgenommene Korrektur erzeugt einen lesbaren Eintrag im
  `warnings`-Array (z.B. für Diagnose-Anzeigen oder Tests).
- Das zurückgegebene `data`-Objekt hat **immer** exakt die oben
  beschriebene vollständige Struktur, unabhängig davon, wie unvollständig
  die Eingabe war.

## Ergänzungen ab Phase 5

### `tenant.logoText` (optional)

Kurztext im Logo-Platzhalter (z.B. `"BBK"`), falls kein `logoUrl`-Bild
hinterlegt ist. Fehlt auch dieser, werden automatisch die Initialen aus
`tenant.name` verwendet.

### `tenant.presenter` (optional)

| Feld | Typ | Beschreibung |
|---|---|---|
| `presenter.label` | string | z.B. `"BBK TV präsentiert von"` |
| `presenter.name` | string | z.B. `"ONLANG"` |
| `presenter.logoUrl` | string | optionales Sponsor-Logo |

### `videos[]` — Item-Struktur (ab Phase 5 verbindlich)

| Feld | Typ | Pflicht |
|---|---|---|
| `id` | string | nein (wird sonst automatisch vergeben) |
| `title` | string | **ja** |
| `description` | string | nein |
| `category` | string | nein |
| `durationLabel` | string | nein (Standard `"--:--"`) |
| `src` | string | **ja** — relativer Pfad, z.B. `public/assets/videos/sample.mp4` |
| `badge` | string \| null | nein, z.B. `"NEU"` |

Fehlt `title` oder `src`, wird der Eintrag übersprungen (Hinweis in
`warnings`), nicht die ganze Liste verworfen.

### `categories[]` — Item-Struktur

`{ id, icon, label, description }` — nur `label` ist Pflicht.

### `partners[]` — Item-Struktur

`{ id, name, logoUrl, subtitle }` — nur `name` ist Pflicht.

### `advertisements[]` — Item-Struktur (unverändert seit Schritt 4)

`{ id, title, sponsor, durationLabel, src, active }` — `title` und
`src` sind Pflicht. Nur der erste Eintrag mit `active: true` wird
verwendet.

## Wichtiger Hinweis zur Datenquelle (Phase 5)

Diese Felder werden zur Laufzeit **nicht** aus `.json`-Dateien per
`fetch()` geladen — das funktioniert unter `file://` nicht (siehe
`docs/ARCHITECTURE.md`). Tatsächliche Quelle sind
`public/demo-data/*.js`-Dateien, die sich in
`window.ONLANG.tenantRegistry` eintragen. Die `.json`-Dateien im
selben Ordner haben identischen Inhalt und dienen nur als
menschenlesbare Referenz.

## Nachtrag: echte Branding-Assets & `?tenant=`-Alias

`tenant.logoUrl` und `partners[].logoUrl` können jetzt auf echte
Bilddateien zeigen (z.B. `public/assets/logos/onlang-logo.png`). Fehlt
die Datei oder ist das Feld leer, wird automatisch der bisherige
Text-Platzhalter verwendet — kein zusätzliches Feld nötig.

Die Kunden-ID kann per `?kunde=` (primär, dokumentiert) oder `?tenant=`
(Alias, falls `kunde` fehlt) übergeben werden. Siehe
`docs/ARCHITECTURE.md`, Abschnitt „Echte Branding-Assets,
Vereins-Schnellwechsler".
