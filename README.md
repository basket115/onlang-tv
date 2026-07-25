# ONLANG TV

Mandantenfähiges TV- und Videoportal für Vereine, Basketballkreise, Landesverbände und weitere Sportorganisationen.

## Aktueller Stand

**Präsentationsversion 1.0**

- Großbild-Player als Mittelpunkt
- automatisierte Playlist
- Werbespots zwischen Videobeiträgen
- Themen- und Programmticker
- vollständige TV-Ansicht und kompakte Website-Einbettung
- Mandanten ONLANG TV, BBK TV, Scorpions TV und SV Blau-Weiß TV (Testkunde)
- automatischer Sendebetrieb (Autostart, Endlosschleife, Kundenwechsel)
- Betrieb ohne Build-Schritt möglich

## Kunden-IDs

Die Adresse `?kunde=` akzeptiert sowohl die öffentliche ONLANG-Kunden-ID
als auch den internen Registry-Schlüssel:

| Öffentliche ID | Registry-Schlüssel | Kanal |
|---|---|---|
| `V006` | `bbk-duesseldorf` | BBK TV |
| `V002` | `scorpions-sggierath` | Scorpions TV |
| `V902` | `verein-blau-weiss` | SV Blau-Weiß TV (Testkunde) |
| – | `DEFAULT` | ONLANG TV |

Eine unbekannte Kunden-ID führt nicht zum Absturz: es wird der
Standardkanal geladen und ein sichtbarer Hinweis eingeblendet.

## Tests

```
npm install
npm test
```

Führt vier Suiten aus: Validator, Mandanten-Rauchtest, Medienprüfung und
die Integrationstests des Sendebetriebs (`tests/playback-demo.test.js`,
komplette Anwendung in jsdom mit nachgebildeter Medienwiedergabe).

## Lokal starten

`index.html` doppelklicken. Für die kompakte Einbettungsansicht `website-tv.html` öffnen.

## Mandanten testen

| Adresse | Ansicht |
|---|---|
| `index.html` | ONLANG TV |
| `index.html?kunde=bbk-duesseldorf` | BBK TV |
| `index.html?kunde=scorpions-sggierath` | Scorpions TV |
| `website-tv.html?kunde=bbk-duesseldorf` | BBK-Website-Einbettung |

Im Vollbildmodus kann der Sender auch über das Auswahlfeld im Header gewechselt werden.

## Veröffentlichung

Die genauen Schritte stehen in [`GITHUB-NETLIFY-START.md`](GITHUB-NETLIFY-START.md). Das Projekt ist für die direkte Verbindung von GitHub mit Netlify vorbereitet; ein Build-Befehl ist nicht erforderlich.

## Tests

Optional mit installiertem Node.js:

```bash
npm test
```

## Technik

- HTML5 und CSS
- klassisches JavaScript ohne Framework
- kein Bundler und kein Build-Schritt
- mandantenabhängige Inhalte über `public/demo-data/`
- Architekturdetails in `docs/ARCHITECTURE.md`
