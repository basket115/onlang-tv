# ROADMAP.md

Verbindliche Reihenfolge der nächsten Phasen. Jede Phase wird erst
begonnen, nachdem die vorherige Phase auf Laszlos Windows-PC sichtbar
getestet und freigegeben wurde (siehe `docs/TEST_PLAN.md`). Innerhalb
einer Phase werden keine Funktionen aus späteren Phasen vorgezogen.

> **Hinweis:** Die Reihenfolge der Phasen 4–6 wurde bei Beginn von
> Schritt 3 präzisiert ("konsequent von innen nach außen"): zuerst
> Werbung (Schritt 4), dann TV-Oberfläche (Schritt 5), dann BBK als
> erster Mandant (Schritt 6) — vor Schritt 3 stand in dieser Datei noch
> eine andere Reihenfolge.

## Phase 1 — Projektbasis und Mandantenmodell ✅

- Projektstruktur, neutrales Mandanten-Datenmodell (`tenant-schema.js`,
  `tenant-validator.js`, `tenant-service.js`)
- Kunden-ID-Erkennung aus der URL mit Fallback auf `DEFAULT`
- Minimale Diagnoseansicht (seit Schritt 2 durch die Playeransicht ersetzt)
- Ausdrücklich NICHT enthalten: Player, Playlist, Werbung, Autoplay,
  Endlosschleife, BBK-Design, V006-Datensatz, Google Sheets, Apps
  Script, Studio-Anbindung, Netlify-Veröffentlichung

## Phase 2 — HTML5-Player mit einem Testvideo ✅

- Echtes `<video>`-Element, angesteuert über `player-controller.js`
- Genau sieben Zustände (`player-state.js`): `IDLE`, `LOADING`,
  `READY`, `PLAYING`, `PAUSED`, `ENDED`, `ERROR`
- Ausschließlich sechs native Video-Events verarbeitet
  (`player-events.js`): `loadedmetadata`, `play`, `pause`, `ended`,
  `error`, `timeupdate`
- Extrem einfache Playeransicht (`player-ui.js`)
- Ein lokales Testvideo (`public/assets/videos/sample.mp4`)
- Kein Autoplay, keine Werbung, keine Schleife, keine Playlist
- **Architekturwechsel:** ab hier läuft die Anwendung ohne Build-
  Schritt direkt über `file://` (siehe `docs/ARCHITECTURE.md`,
  Abschnitt „Kein Build-Schritt nötig"); Vite wurde entfernt

## Phase 3 — Playlist ✅ (dieser Schritt)

- `playlist-data.js`: lokale Test-Playlist (3 Einträge, je ein eigenes
  H.264/AAC-Testvideo: `sample.mp4`, `sample-2.mp4`, `sample-3.mp4`)
- `playlist-state.js`: `items`, `currentIndex`, `status` — Zustände
  `EMPTY`, `READY`, `PLAYING`, `FINISHED`, `ERROR`
- `playlist-controller.js`: `load(items)`, `select(index)`,
  `playSelected()`, `playNext()`, `reset()`, `getCurrentItem()`,
  `getCurrentIndex()` — steuert den Player ausschließlich über dessen
  öffentliche API (`load`, `play`, `on`)
- `playlist-ui.js`: Darstellung, Klickverarbeitung, aktive Markierung,
  Leer-/Fehlerzustand
- Player-API additiv erweitert: `on(eventName, callback)`,
  `getState()`, `getCurrentTime()`, `getDuration()` (siehe
  `docs/ARCHITECTURE.md`) — bestehende Player-Logik unverändert
- Automatischer Videowechsel nach `ended`, Stop nach dem letzten Video
  (`FINISHED`, kein Sprung zurück zu Video 1, keine Schleife)
- Kein Autoplay beim Seitenstart, keine Werbung, kein Kategorienfilter,
  keine Suche, keine Vorschaubilder, kein BBK-Design

## Phase 4 — Werbung zwischen Inhaltsvideos ✅ technisch fertig, NOCH NICHT von Laszlo freigegeben

- `src/advertising/`: `advertising-data.js`, `advertising-state.js`
  (Zustände `DISABLED`, `READY`, `PLAYING`, `FINISHED`, `ERROR`),
  `advertising-controller.js` (`load`, `getActiveAdvertisement`,
  `hasActiveAdvertisement`, `prepare`, `reset`, `getStatus`),
  `advertising-ui.js` (WERBUNG/JETZT-LÄUFT-Kennzeichnung)
- `src/playback/playback-flow-controller.js` (NEU): einzige
  Ablaufsteuerung, kennt als einzige Instanz Player, Playlist UND
  Werbung. Zustände `IDLE`, `AD_READY`, `AD_PLAYING`, `CONTENT_READY`,
  `CONTENT_PLAYING`, `PAUSED`, `FINISHED`, `ERROR`; Modi
  `ADVERTISEMENT`, `CONTENT`, `NONE`
- Ablauf: Play → Spot → Video 1 → Spot → Video 2 → Spot → Video 3 →
  Ende. Kein Spot nach dem letzten Video, kein Sprung zu Video 1, keine
  Endlosschleife, kein Autoplay beim Öffnen
- Pause/Fortsetzen an derselben Stelle (Spot wie Inhalt), Stop setzt
  auf den Ausgangspunkt VOR dem aktuellen Inhalt zurück
  (nächster Play-Klick beginnt wieder mit dem Spot)
- `playlist-controller.js` wurde von seiner direkten Player-Kopplung
  aus Schritt 3 befreit (siehe `docs/ARCHITECTURE.md`) — reine
  Zustandsverwaltung, kein `player.load()`/`play()` mehr
- Bugfix in `player-controller.js` gefunden und behoben (verlorener
  ERROR-Status durch ein nachgelagertes "pause"-Event) — siehe
  `docs/ARCHITECTURE.md`
- Ausschließlich echte Player-Events (`ended`, `error`), keine Timer,
  keine simulierten Events
- **Freigaberegel:** Schritt 5 beginnt erst nach Laszlos sichtbarem
  Test auf seinem Windows-PC (siehe `docs/TEST_PLAN.md`)

## Phase 5 — echte ONLANG-TV-Oberfläche mit Full- und Embed-Ansicht ✅ technisch fertig, NOCH NICHT von Laszlo freigegeben

- `src/views/full-view.js`: vollständige Oberfläche (Header mit
  Logo/Slogan, Player mit "Präsentiert von"-Sponsor, Playlist-Spalte,
  Kategorie-Leiste, Partner-Leiste)
- `src/views/embed-view.js`: kompakte Oberfläche (kleiner Header,
  Player, Playlist — keine Kategorien/Partner/Footer)
- `src/views/view-helpers.js` (neu): gemeinsame, reine
  Rendering-Hilfsfunktionen für beide Views
- Umschaltung über `?modus=full|embed`, sonst `tenant.settings.defaultView`
- Dynamisches Whitelabel-Theming: `tenant.theme` wird zur Laufzeit als
  CSS-Variablen auf `:root` übertragen (`tenant-service.js`,
  `applyTenantTheme()`) — Namensraum unverändert seit Schritt 1
- Drei Demo-Mandanten: `DEFAULT`, `bbk-duesseldorf` (Orange/Schwarz),
  `verein-blau-weiss` (Blau/Weiß, zum Test des Design-Wechsels)
- Player, Playlist, Werbung und Playback Flow Controller **unverändert**
  seit Schritt 4 — Views komponieren sie nur in ein reichhaltigeres
  Layout, Datenquelle für Videos/Werbespots kommt jetzt aus dem
  Tenant-Objekt statt aus separaten Testdateien
- Mandantendaten werden NICHT per `fetch()` aus `.json` geladen
  (funktioniert unter `file://` nicht — empirisch geprüft), sondern
  über eine klassische Script-Registry (`public/demo-data/*.js`); die
  `.json`-Dateien sind reine Referenz (siehe `docs/ARCHITECTURE.md`)
- **Freigaberegel:** Schritt 6 beginnt erst nach Laszlos sichtbarem
  Test auf seinem Windows-PC (siehe `docs/TEST_PLAN.md`)

## Phase 6 — V006 als erster Mandant (nächster geplanter Schritt)

- Anlegen eines echten, aber weiterhin lokalen Datensatzes für
  `V006` (BBK Düsseldorf/Neuss) nach demselben Schema wie
  `default.json`
- Kein BBK-Sonderfall im Code — ausschließlich Daten

## Phase 7 — Google-Sheets-/API-Anbindung

- Ersetzen der lokalen JSON-Quelle in `tenant-service.js` durch einen
  echten Abruf (z.B. Apps-Script-API)
- Keine Änderung an Player, Playlist, Views oder Werbelogik nötig
  (siehe `docs/ARCHITECTURE.md`, Abschnitt „Austauschbare Datenquelle")

## Phase 8 — Studio-TV-Verwaltung

- Redaktionelle Verwaltungsoberfläche (voraussichtlich als Teil von
  ONLANG Studio) zur Pflege von Videos, Kategorien, Partnern und
  Werbespots pro Mandant

## Phase 9 — YouTube, MP4 und HLS

- `media-adapter.js`: einheitliche Quellen-Abstraktion, damit
  `player-controller.js` unabhängig vom jeweiligen Quellentyp
  funktioniert

## Phase 10 — Livestream und Highlight-System

- Unterstützung echter Live-Übertragungen
- Mögliche spätere Anbindung an ein automatisiertes
  Highlight-Erkennungssystem (siehe `docs/ARCHITECTURE.md`, Abschnitt
  „Abgrenzung zum Highlight-System") — eigene, separate Phase
