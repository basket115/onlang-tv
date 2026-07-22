# ONLANG TV

Mandantenfähiges TV- und Videoportal für Vereine, Basketballkreise, Landesverbände und weitere Sportorganisationen.

## Aktueller Stand

**Präsentationsversion 1.0**

- Großbild-Player als Mittelpunkt
- automatisierte Playlist
- Werbespots zwischen Videobeiträgen
- Themen- und Programmticker
- vollständige TV-Ansicht und kompakte Website-Einbettung
- Mandanten ONLANG TV, BBK TV und Scorpions TV
- Betrieb ohne Build-Schritt möglich

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
