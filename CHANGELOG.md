# Changelog

## Demo 1.0 – Validierungswarnung settings.advertisingMode

- **Bootstrap-API liefert "between" statt eines offiziellen Werts**:
  `tenant-schema.js` (`VALID_ADVERTISING_MODES`) akzeptiert ausschließlich
  `"off"`/`"startup"`/`"always"`. Die Apps-Script-Bootstrap-API liefert
  denselben, inhaltlich gültigen Modus ("Werbung zwischen jedem Video")
  aber als `"between"` — jeder Bootstrap-Aufruf erzeugte dadurch eine
  Validierungswarnung und `advertisingMode` fiel auf `"off"` zurück.
  `tenant-service.js` (`adaptBootstrapResult()`) bildet `"between"` jetzt
  über eine neue `ADVERTISING_MODE_ALIASES`-Tabelle auf `"always"` ab,
  bevor validiert wird — analog zum bestehenden `CUSTOMER_ID_ALIASES`-
  Muster in derselben Datei. Validator, Schema und alle lokalen
  Mandanten-Dateien bleiben unverändert; keine funktionale Änderung an
  Player oder Ablaufsteuerung. Neuer Test: `tests/tenant-service.test.js`.

## Demo 1.0 – mutedAutoplay:false ohne sichtbare Aktivierungsfläche

- **Redundanter nativer Autoplay-Versuch**: `main.js` setzte zusätzlich
  zum expliziten, per Promise ausgewerteten `player.play()`-Aufruf auch
  das native `videoEl.autoplay = true`. Bei `mutedAutoplay:false`
  blockierte der Browser den unstummen Versuch; der parallele, für den
  Code unsichtbare native Versuch verhinderte, dass die Aktivierungs-
  fläche zuverlässig erschien. Attribut entfernt — Start läuft jetzt
  ausschließlich über den einen, beobachtbaren `player.play()`-Aufruf.
  Siehe `docs/ARCHITECTURE.md`, Abschnitt "Autoplay".
- Testumgebung (`tests/harness.js`) bildet blockierten Autoplay jetzt
  wie im echten Browser nach: ein unstummer `play()`-Aufruf ohne
  vorherige Nutzeraktion wird immer abgelehnt, nicht nur wenn ein
  Test das manuell simuliert. Neuer Testfall in
  `tests/playback-demo.test.js` (Abschnitt 12) deckt
  `mutedAutoplay:false` vollständig ab: Aktivierungsfläche erscheint,
  Klick startet mit Ton, Spot → Video → Spot läuft danach ohne erneute
  Blockade weiter.

## Demo 1.0 – Stabilisierung des Sendebetriebs

Behobene Ursachen:

- **Medien ohne faststart**: Bei allen MP4-Dateien lag der `moov`-Container
  hinter den Mediendaten. Der Browser musste die Datei vollständig laden,
  bevor die Wiedergabe beginnen konnte (Werbespot: 7,7 MB). Alle Dateien
  wurden verlustfrei mit `-movflags +faststart` neu verpackt.
- **Vorablade-Sturm**: `main.js` legte für jede Demo-Quelle ein verstecktes
  `<video preload="auto">` an — rund 20 MB gleichzeitig, parallel zum
  eigentlichen Player, und bei jedem Kundenwechsel erneut. Entfernt.
- **Kein Cleanup beim Kundenwechsel**: `#app.innerHTML` entfernte das alte
  `<video>` aus dem DOM, beendete die Wiedergabe aber nicht. Player,
  Ablaufsteuerung und Event-Abos liefen parallel weiter. Ersetzt durch
  einen einzigen Session-Lebenszyklus mit `destroy()`.
- **Wettlauf bei schnellem Kundenwechsel**: Zwei gleichzeitige
  Ladevorgänge konnten sich gegenseitig überschreiben. Jeder Bootstrap
  hat jetzt eine laufende Nummer; veraltete Antworten werden verworfen.
- **Blockiertes Autoplay wurde als Medienfehler behandelt**: Der Ablauf
  blieb stehen. `NotAllowedError` wird jetzt getrennt gemeldet und führt
  zu genau einer sichtbaren Aktivierungsfläche.
- **Doppeltes `load()` beim Start**: Erst das Inhaltsvideo, unmittelbar
  danach der Spot in dasselbe Element. Beim Autostart wird nur noch der
  Spot geladen.
- **`?kunde=V006` fand keinen Datensatz**: Die Registry war nur über
  Slugs erreichbar. Neue Alias-Auflösung in `tenant-service.js`.
- **„JETZT LÄUFT" ohne laufenden Inhalt**: Die Anzeige richtete sich nach
  dem geladenen, nicht nach dem tatsächlich laufenden Medium.
- **Fallback umgangen**: Ein synchroner Fehler im Bootstrap-Aufruf
  entkam der `.catch()`-Behandlung in `loadTenantData()`.
- **Alte Tenant-Klassen blieben stehen**: Die Entfernung nutzte eine
  feste Liste. Jetzt werden alle `tenant-*`-Klassen entfernt.

Ergänzt: `tests/media.test.js` und `tests/playback-demo.test.js`
(Integrationstests der kompletten Anwendung in jsdom).

## Version 1.3 – BBK-Blau

- BBK-TV-Hintergrund von Schwarz auf dunkles BBK-Blau (`#0f172a`) umgestellt.
- BBK-Flächen und Karten auf abgestimmtes Dunkelblau (`#18233d`) gesetzt.
- ONLANG TV und Scorpions TV unverändert.
- Keine Änderungen an Player-, Playlist- oder Werbelogik.

# Änderungsverlauf

## 1.0.0 – Präsentationsversion (22.07.2026)

- Großbild-Player als zentraler Schwerpunkt für alle Mandanten.
- Programmliste kompakt unter dem Player.
- Kategorie-Kacheln entfernt; Themen und Videoinhalte laufen im Ticker.
- Vollansicht und kompakte Website-Einbettung enthalten.
- Scorpions-TV-Branding und korrekt zugeschnittenes Vereinslogo enthalten.
- Dezenter Präsentations-Footer ergänzt.
- Netlify-Konfiguration für direkte Veröffentlichung aus GitHub ergänzt.
