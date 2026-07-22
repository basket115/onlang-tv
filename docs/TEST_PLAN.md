# TEST_PLAN.md

## Verbindlicher Freigabeprozess

**Jede Phase (siehe `docs/ROADMAP.md`) wird erst nach einem sichtbaren
Test auf Laszlos Windows-PC freigegeben.**

Claude-Berichte oder Sandbox-Tests (automatisierte Tests, Screenshots
aus einer Testumgebung, `npm run build`-Erfolg in der Sandbox usw.)
gelten **nicht** als Freigabe. Sie sind eine Voraussetzung dafür, dass
eine Phase überhaupt zur Prüfung vorgelegt wird — nicht deren Ersatz.

Ablauf pro Phase:

1. Claude entwickelt die Phase gemäß `docs/ROADMAP.md`.
2. Claude führt alle automatisierten Tests aus (`npm test`) und prüft
   `npm install`, `npm run dev`, `npm run build` in der Sandbox.
3. Claude liefert eine ZIP des vollständigen Projekts sowie einen
   Abschlussbericht mit den konkreten Ergebnissen.
4. Laszlo entpackt die ZIP lokal, führt `npm install`, `npm run dev`
   (und bei Bedarf `npm run build`) auf seinem Windows-PC aus und prüft
   das Ergebnis sichtbar im Browser.
5. Erst nach Laszlos ausdrücklicher Freigabe beginnt die nächste Phase.

## Automatisierte Tests (Sandbox, Voraussetzung für Schritt 3)

- `npm test` führt aus:
  - `tests/tenant-validator.test.js` — prüft `validateTenantData()`
    gegen verschiedene fehlerhafte/unvollständige/vollständige Eingaben
  - `tests/smoke.test.js` — prüft, dass `public/demo-data/default.json`
    gültig ist und ohne Validierungshinweise durchläuft

## Manuelle Prüfpunkte für Schritt 1 (auf Laszlos PC)

- [ ] `npm install` läuft ohne Fehler durch
- [ ] `npm run dev` startet einen lokalen Server ohne Fehler
- [ ] Aufruf ohne Parameter zeigt: Kunden-ID `DEFAULT`, Datenquelle
      „Lokale Demo-Daten", Status „bereit"
- [ ] Aufruf mit `?kunde=V006` zeigt: „Angeforderte Kunden-ID: V006" /
      „Geladener Datensatz: DEFAULT" (da V006 in Schritt 1 noch nicht
      angelegt ist)
- [ ] Browser-Konsole zeigt keine JavaScript-Fehler
- [ ] `npm run build` erzeugt einen `dist/`-Ordner ohne Fehler
- [ ] Es ist kein Videoplayer, keine Playlist und keine BBK-Oberfläche
      sichtbar
- [ ] Keine Datei außerhalb von `onlang-tv/` wurde verändert

## Manuelle Prüfpunkte für Schritt 2 (auf Laszlos PC)

- [ ] ZIP entpackt, `index.html` per Doppelklick geöffnet — **kein**
      Terminal, **kein** `npm install`, **kein** lokaler Server nötig
- [ ] Playeransicht erscheint: Titel „ONLANG TV", Videofenster, Status,
      Zeit, drei Buttons (Play/Pause/Stop) — keine Playlist, keine
      Werbung, keine Logos, keine Kategorien, keine Overlays
- [ ] Status zeigt nach dem Laden `READY` (Testvideo `sample.mp4`
      geladen, aber nicht automatisch gestartet)
- [ ] Play startet die Wiedergabe, Status wechselt zu `PLAYING`, die
      Zeitanzeige läuft sichtbar mit
- [ ] Pause hält die Wiedergabe an, Status wechselt zu `PAUSED`, Zeit
      bleibt stehen
- [ ] Stop setzt die Zeit auf `00:00` zurück
- [ ] Video am Ende: Status wechselt automatisch zu `ENDED`
- [ ] Wird `sample.mp4` entfernt/umbenannt: Status zeigt `ERROR` mit der
      Meldung „Kein Testvideo gefunden.", **keine** Browser-Fehlermeldung
      als sichtbarer Absturz, **keine** unbehandelte JavaScript-Exception
      in der Konsole
- [ ] Browser-Konsole zeigt keine JavaScript-Fehler (Netzwerk-Log für
      eine bewusst fehlende Testdatei ist normal und kein Fehler der
      Anwendung)
- [ ] Kein Autoplay, keine Werbung, keine Schleife, keine Playlist,
      kein automatischer Wechsel zu einem nächsten Video
- [ ] Keine Datei außerhalb von `onlang-tv/` wurde verändert

## Manuelle Prüfpunkte für Schritt 3 (auf Laszlos PC)

- [ ] ZIP entpackt, `index.html` per Doppelklick geöffnet
- [ ] Drei Playlist-Einträge werden unterhalb des Players angezeigt
- [ ] Video 1 ist beim Start ausgewählt (deutlich, aber schlicht markiert)
- [ ] Video 1 startet **nicht** automatisch — erst nach Klick auf Play
- [ ] Klick auf Video 2 lädt Video 2 in den Player (Titel/Zeit wechseln),
      startet aber **nicht** automatisch die Wiedergabe
- [ ] Die aktive Markierung wechselt korrekt zum angeklickten Eintrag
- [ ] Nach Ende von Video 1 (bei laufender Wiedergabe) startet Video 2
      automatisch
- [ ] Nach Ende von Video 2 startet Video 3 automatisch
- [ ] Nach Ende von Video 3 stoppt die Playlist (Status „Playlist
      beendet.", Player bleibt bei `ENDED`) — **kein** Sprung zurück zu
      Video 1, **keine** Schleife
- [ ] Pause funktioniert weiterhin für das jeweils aktive Video
- [ ] Stop funktioniert weiterhin (Zeit auf `00:00`)
- [ ] Browser-Konsole zeigt keine JavaScript-Fehler
- [ ] Wird ein Playlist-Eintrag mit fehlender/ungültiger Datei
      angeklickt: verständliche Fehlermeldung, betroffener Eintrag
      sichtbar markiert, restliche Playlist bleibt bedienbar, keine
      automatische Endlosschleife
- [ ] Keine Werbung und keine Endlosschleife im gesamten Ablauf sichtbar
- [ ] Keine Datei außerhalb von `onlang-tv/` wurde verändert

## Manuelle Prüfpunkte für Schritt 4 (auf Laszlos PC)

- [ ] ZIP entpackt, `index.html` per Doppelklick geöffnet
- [ ] Video 1 ist ausgewählt, beim Seitenstart läuft nichts
- [ ] Erster Play-Klick startet den Werbespot (nicht direkt Video 1)
- [ ] Während des Spots steht sichtbar „WERBUNG"
- [ ] Nach Spotende startet Video 1 automatisch
- [ ] Nach Video 1 startet erneut genau ein Spot
- [ ] Danach startet Video 2 automatisch
- [ ] Danach folgt Spot und Video 3
- [ ] Nach Video 3 endet der Ablauf — **kein** weiterer Spot
- [ ] **Kein** Sprung zurück zu Video 1, keine Endlosschleife
- [ ] Pause während der Werbung funktioniert
- [ ] Fortsetzen der Werbung läuft an derselben Stelle weiter (nicht von vorne)
- [ ] Pause während eines Inhaltsvideos funktioniert
- [ ] Fortsetzen des Inhalts läuft an derselben Stelle weiter
- [ ] Stop während der Werbung funktioniert
- [ ] Stop während eines Inhaltsvideos funktioniert
- [ ] Nach Stop beginnt der nächste Play-Klick erneut mit der Werbung
- [ ] Klick auf Video 3 wählt Video 3 aus, **ohne** dass etwas abgespielt wird
- [ ] Anschließender Play-Klick: Spot → Video 3 → Ende
- [ ] Ein fehlender Werbespot erzeugt eine verständliche Fehlermeldung,
      der Ablauf stoppt (kein stillschweigendes Überspringen)
- [ ] Ein fehlendes Inhaltsvideo erzeugt eine verständliche
      Fehlermeldung, der betroffene Playlist-Eintrag wird markiert
- [ ] Browser-Konsole zeigt keine unbehandelten JavaScript-Fehler
- [ ] Keine Timer (`setTimeout`/`setInterval`) und keine Endlosschleife
      im gesamten Ablauf
- [ ] Keine Datei außerhalb von `onlang-tv/` wurde verändert

## Manuelle Prüfpunkte für Phase 5 (auf Laszlos PC)

- [ ] ZIP entpackt, `index.html` per Doppelklick geöffnet (kein `?kunde=`)
      → zeigt neutrales ONLANG-TV-Design (Orange), 3 Testvideos
- [ ] `index.html?kunde=bbk-duesseldorf` → BBK-Branding sichtbar
      (Name "BBK TV", Slogan, 6 Kategorien, 4 Partner, eigene Videotitel)
- [ ] `index.html?kunde=verein-blau-weiss` → deutlich anderes Farbschema
      (Blau/Weiß statt Orange/Schwarz), eigener Name/Inhalt
- [ ] `index.html?kunde=irgendwas-unbekanntes` → Fallback auf das
      neutrale ONLANG-Design, keine Fehlermeldung, keine leere Seite
- [ ] Header zeigt Logo-Platzhalter (Kürzel oder Initialen), Vereinsname
      und Slogan aus der jeweiligen Konfiguration
- [ ] "Präsentiert von"-Leiste über dem Player zeigt den Hauptsponsor
- [ ] Playlist-Spalte rechts ("Als Nächstes") zeigt die drei Videos
- [ ] Kategorie-Leiste unter dem Player zeigt die konfigurierten
      Kategorien (in der Vollansicht)
- [ ] Partner-Leiste ganz unten zeigt die konfigurierten Partner (in
      der Vollansicht)
- [ ] `?modus=embed` (mit beliebigem `?kunde=`) zeigt die kompakte
      Ansicht: kleiner Header, Player, Playlist — **keine** Kategorien,
      **keine** Partner
- [ ] Der komplette Werbe-/Playlist-Ablauf aus Schritt 4 funktioniert
      unverändert (Play → Spot → Video 1 → Spot → Video 2 → Spot →
      Video 3 → Ende, kein Autoplay, keine Schleife)
- [ ] Browser-Konsole zeigt keine JavaScript-Fehler
- [ ] `npm test` (falls Node vorhanden) läuft weiterhin erfolgreich durch
- [ ] Keine Datei außerhalb von `onlang-tv/` wurde verändert

## Prüfpunkte für spätere Phasen (wird pro Phase ergänzt)

Wird mit jeder neuen Phase um die dort jeweils relevanten,
phasenspezifischen Prüfpunkte erweitert (z.B. Phase 6: „V006-Datensatz
zeigt echte BBK-Daten ohne Sonderfall im Code" usw.).

## Manuelle Prüfpunkte — Branding & Vereins-Schnellwechsler (Nachtrag zu Phase 5)

- [ ] Header zeigt beim `DEFAULT`-Mandanten das echte runde ONLANG-Logo als Bild
- [ ] Partnerbereich zeigt bei allen drei Mandanten das echte ONLANG-Logo beim Partner "ONLANG"
- [ ] BBK-Header zeigt weiterhin den eigenen "BBK"-Platzhalter, **nicht** das ONLANG-Logo
- [ ] Play-Klick bei BBK spielt den echten ONLANG-Spot (`onlang-spot-real.mp4`)
- [ ] Play-Klick bei DEFAULT/Blau-Weiß spielt die Spotfolien-Slideshow (`onlang-spotfolien.mp4`)
- [ ] `index.html?tenant=bbk-duesseldorf` funktioniert genauso wie `?kunde=bbk-duesseldorf`
- [ ] Dropdown im Header (nur Vollansicht) zeigt alle drei Mandanten-IDs
- [ ] Auswahl im Dropdown wechselt Logo/Name/Farben/Playlist/Kategorien/Partner/Spot **ohne Neuladen der Seite**
- [ ] Adresszeile zeigt nach dem Wechsel korrekt `?kunde=<gewählte-id>`
- [ ] Browser-Zurück-Taste nach einem Dropdown-Wechsel funktioniert
- [ ] Embed-Ansicht (`?modus=embed`) zeigt **kein** Dropdown
- [ ] Browser-Konsole zeigt keine JavaScript-Fehler
