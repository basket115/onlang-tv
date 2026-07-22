# ARCHITECTURE.md

## Ausgangslage

Die frühere BBK-TV-Präsentationsversion (Standalone-Präsentationsdateien
mit eingebettetem Werbespot, Autoplay-Logik und Endlosschleife) wurde
nach wiederholten Reparaturen als nicht tragfähige Grundlage eingestuft.
`onlang-tv` ist ein **vollständig neues, eigenständiges Projekt**. Aus
der bisherigen Lösung wurde kein Code übernommen — sie diente höchstens
als optische Referenz.

## Zweck des Moduls

ONLANG TV ist ein Videoportal-Modul, das künftig als offizieller
Bestandteil des ONLANG-Angebots für Vereine, Basketballkreise,
Landesverbände und andere Sportorganisationen nutzbar sein soll. Ein
einzelnes Deployment (z.B. `https://onlang-tv.netlify.app/`) bedient
beliebig viele Mandanten über die URL:

```
https://onlang-tv.netlify.app/?kunde=V006
https://onlang-tv.netlify.app/?kunde=V115
```

BBK Düsseldorf/Neuss (Kunden-ID `V006`) wird später der erste reale
Mandant, ist aber an keiner Stelle im Code fest eingebaut.

## Trennung der Verantwortlichkeiten

| Bereich | Datei(en) | Verantwortlich für |
|---|---|---|
| Laufzeit-Konfiguration | `src/config/runtime-config.js` | nicht-mandantenspezifische URL-Parameter (aktuell: Ansichtsmodus `full`/`embed`) |
| Mandanten-Identität & -Daten | `src/tenant/tenant-service.js` | Kunden-ID aus der URL lesen, passenden Datensatz laden, Fallback |
| Mandanten-Struktur | `src/tenant/tenant-schema.js` | kanonische Feldstruktur + neutrale Standardwerte |
| Mandanten-Validierung | `src/tenant/tenant-validator.js` | rohe Daten in einen garantiert gültigen Datensatz überführen |
| Player (später) | `src/player/player-controller.js`, `src/player/media-adapter.js` | Videowiedergabe, Quellen-Abstraktion (MP4/YouTube/HLS) |
| Playlist (später) | `src/playlist/playlist-controller.js` | Videoliste, Auswahl |
| Werbung (später) | `src/advertising/advertising-controller.js` | Werbespot-Logik gemäß `settings.advertisingMode` |
| Ansichten (später) | `src/views/full-view.js`, `src/views/embed-view.js` | komplette Oberfläche für Vollversion bzw. Embed |
| Logging | `src/utils/logger.js` | einheitliches Konsolen-Logging |

Diese Trennung ist bewusst so gewählt, dass jede spätere Erweiterung
(echter Player, echte Playlist, echte Werbelogik, echte Datenquelle)
**nur** die jeweils zuständige Datei betrifft, ohne die anderen Module
anzufassen.

## Datenfluss (Schritt 1)

> **Hinweis (Schritt 2):** `tenant-service.js`, `tenant-schema.js` und
> `tenant-validator.js` sind weiterhin unverändert als ES-Module
> vorhanden, werden aber von `index.html` **aktuell nicht geladen** —
> die Playeransicht aus Schritt 2 benötigt noch keine Mandantendaten.
> Der folgende Datenfluss beschreibt den Stand aus Schritt 1 und wird
> in Schritt 3 (Playlist) wieder aktiv, sobald diese drei Dateien auf
> das klassische Skript-/Namespace-Muster umgestellt werden (siehe
> Abschnitt "Kein Build-Schritt nötig" oben) und erneut in `index.html`
> eingebunden werden.

```
URL (?kunde=V006)
        │
        ▼
tenant-service.getRequestedCustomerId()
        │
        ▼
tenant-service.loadTenantData(requestedCustomerId)
        │
        ├── fetch(/demo-data/{customerId}.json)   ── Erfolg ──┐
        │                                                      │
        └── Fehlschlag ──► fetch(/demo-data/default.json)      │
                                     │                          │
                                     ▼                          ▼
                          tenant-validator.validateTenantData(raw)
                                     │
                                     ▼
                     { data, warnings, usedFallback, ... }
                                     │
                                     ▼
                          main.js rendert Diagnoseansicht
```

Wichtig: `loadTenantData()` wirft **nie** eine Exception nach außen.
Jeder Fehlerfall (Kunden-ID nicht gefunden, Netzwerkfehler, ungültiges
JSON, fehlende Felder) endet in einem klar gekennzeichneten,
funktionierenden neutralen Zustand.

## Austauschbare Datenquelle

`tenant-service.js` ist die **einzige** Datei im Projekt, die weiß, dass
die Daten aktuell aus lokalen JSON-Dateien unter `public/demo-data/`
kommen. Player, Playlist und Views rufen ausschließlich
`loadTenantData(customerId)` auf und erhalten ein bereits validiertes
Objekt zurück — sie kennen weder Google Sheets noch eine externe API
noch das Dateisystem.

Wenn in einer späteren Phase (siehe `docs/ROADMAP.md`, Phase 7) eine
echte Google-Sheets-/API-Anbindung hinzukommt, wird ausschließlich
`fetchTenantJson()` innerhalb von `tenant-service.js` ersetzt (z.B. durch
einen Aufruf einer Apps-Script-API). Die Rückgabestruktur
(`{ data, warnings, usedFallback, ... }`) bleibt exakt gleich, sodass
kein anderes Modul angepasst werden muss.

## Full- und Embed-Ansicht

`tenant.settings.defaultView` bzw. der URL-Parameter `?modus=` steuern
später, ob die vollständige Ansicht (`full-view.js`: Header, Player,
Playlist, Kategorien, Partner, Footer) oder die kompakte Embed-Ansicht
(`embed-view.js`: kleiner Header, Player, Playlist — für die spätere
iframe-Einbindung auf Vereins-/Verbands-Websites) gerendert wird. Beide
Views lesen ausschließlich aus denselben validierten Mandantendaten und
enthalten keine eigene Datenlogik.

In Schritt 1 sind beide Views reine Platzhalter (siehe
`docs/ROADMAP.md`, Phase 4) — stattdessen zeigt `main.js` eine minimale
Diagnoseansicht.

## Abgrenzung zum Highlight-System

ONLANG TV ist ein **Präsentations- und Playlist-Modul** für bereits
fertige Videos (Vereins-News, Interviews, Spielberichte etc.). Es ist
ausdrücklich **kein** Ersatz für ein automatisiertes Video-Schnitt-/
Highlight-Erkennungssystem (wie es z.B. für automatisierte
Spielausschnitte denkbar wäre). Eine mögliche spätere Anbindung an ein
Highlight-System ist in `docs/ROADMAP.md` als eigene, spätere Phase
vorgesehen und technisch bewusst nicht Teil dieses Moduls.

## Kein Build-Schritt nötig (ab Schritt 2)

**Wichtige Änderung gegenüber Schritt 1:** Ab Schritt 2 muss ONLANG TV
vollständig ohne Node.js, npm, Vite, lokalen Server oder Kommandozeile
funktionieren — ausschließlich durch ZIP entpacken und `index.html`
per Doppelklick öffnen (`file://`-Protokoll).

Das hat einen konkreten technischen Grund: **ES-Module
(`<script type="module">` mit `import`/`export`) funktionieren in
Chrome nicht über `file://`.** Das wurde vor Beginn von Schritt 2
empirisch geprüft — bereits der Ladeversuch des Einstiegs-Skripts
scheitert mit `Access to script ... has been blocked by CORS policy`,
sobald das Skript ein `import` einer weiteren Datei enthält.

Deshalb wurde die Architektur ab Schritt 2 umgestellt:

- Alle aktiv geladenen Skripte (`src/player/*.js`, `src/main.js`) sind
  **klassische Skripte** (kein `type="module"`, kein `import`/`export`).
- Sie hängen ihre öffentliche API an ein gemeinsames, global
  verfügbares Namespace-Objekt an: `window.ONLANG.player.*`. Jede
  Datei sichert dieses Objekt selbst ab
  (`window.ONLANG = window.ONLANG || {}; ...`), damit die Reihenfolge
  der `<script>`-Tags in `index.html` die einzige echte Abhängigkeit
  ist (state/events vor controller, controller vor ui/main — siehe
  Kommentar in `index.html`).
- Alle Pfade in `index.html` und in den Skripten sind **relativ ohne
  führenden Schrägstrich** (`src/main.js`, nicht `/src/main.js`), da
  ein führender `/` unter `file://` auf die Wurzel des Dateisystems
  verweisen würde, nicht auf den Projektordner.
- CSS wird per klassischem `<link rel="stylesheet">` eingebunden statt
  per CSS-Import in einem JS-Modul.

**Vite wurde daraufhin vollständig entfernt** (`vite.config.js` und
`package-lock.json` gelöscht, `package.json` auf reine, optionale
Test-Skripte reduziert). Ein Test hat gezeigt, dass ein `vite build`
mit der neuen Struktur einen unvollständigen, nicht lauffähigen
`dist/`-Ordner erzeugt hätte (klassische `<script src="...">`-Dateien
werden von Vite nicht mit in den Build kopiert) — Vite beizubehalten
wäre irreführend gewesen.

`package.json` existiert weiterhin, aber ausschließlich für den
**optionalen** Befehl `npm test` (führt die Dateien in `tests/` direkt
mit Node aus, ohne jede Abhängigkeit). Für den eigentlichen Betrieb der
Anwendung ist `package.json` nicht nötig.

## Media Player — Unabhängigkeit (Schritt 2, erweitert in Schritt 3)

Der Media Player (`src/player/player-controller.js`,
`src/player/player-events.js`, `src/player/player-state.js`,
`src/player/player-ui.js`) ist **vollständig unabhängig** von:

- Playlist (`src/playlist/playlist-controller.js`)
- Werbung (`src/advertising/advertising-controller.js`)
- Studio (redaktionelle Verwaltung, spätere Phase)
- Google Sheets / einer externen API
- BBK oder irgendeinem anderen konkreten Mandanten

Er kennt weder `tenant-service.js` noch irgendeine Mandanten-ID. Seine
öffentliche API besteht ausschließlich aus:

```
load(video)      // Video laden (String-Quelle oder { source })
play()           // Wiedergabe starten
pause()           // Pausieren
stop()            // pause() + currentTime = 0
currentTime       // Getter
duration          // Getter
state             // Getter, siehe player-state.js für die 7 Zustände
onStateChange(fn) // Abonnieren von Statuswechseln
onTimeUpdate(fn)  // Abonnieren von Zeit-Updates
getErrorMessage() // lesbare Fehlermeldung im ERROR-Zustand
```

**Alle späteren Module verwenden ausschließlich diese öffentliche
API.** Die Playlist (Schritt 3) wird `controller.load(video)` mit dem
jeweils gewählten Playlist-Eintrag aufrufen; die Werbung (Schritt 4)
wird denselben Controller für Spot und Inhalt verwenden. Keines dieser
späteren Module wird den Player-Code selbst verändern müssen — analog
zum Prinzip der austauschbaren Datenquelle (siehe oben,
Tenant-Service).

Der Player verarbeitet ausschließlich sechs native `<video>`-Events
(`loadedmetadata`, `play`, `pause`, `ended`, `error`, `timeupdate`,
siehe `player-events.js`) und kennt genau sieben Zustände (`IDLE`,
`LOADING`, `READY`, `PLAYING`, `PAUSED`, `ENDED`, `ERROR`, siehe
`player-state.js`). Es gibt bewusst keinen Timer, kein Autoplay, keine
Schleife und keine Playlist-Logik innerhalb des Players selbst.

## Playlist — Unabhängigkeit vom Player (Schritt 3, entkoppelt in Schritt 4)

Die Playlist (`src/playlist/playlist-controller.js`,
`playlist-state.js`, `playlist-ui.js`, `playlist-data.js`) ist ein
**eigenständiges Modul**, das oberhalb des Media Players sitzt und ihn
ausschließlich über seine öffentliche API steuert:

```
player.load({ source })
player.play()
player.on(eventName, callback)
```

Die Playlist greift **niemals** direkt auf `video.src`,
`video.currentTime`, `video.play()` oder `video.pause()` zu — sie kennt
das `<video>`-Element überhaupt nicht, nur die `player`-Instanz, die
ihr in `main.js` übergeben wird (`createPlaylistController(player)`).

**Der Player kennt umgekehrt die Playlist nicht.** Es gibt keinen
Import, keine Referenz und keine Sonderbehandlung in
`player-controller.js`, `player-state.js`, `player-events.js` oder
`player-ui.js` für Playlist-Belange. Die einzige Erweiterung, die der
Player für die Playlist erhalten hat, ist die generische
`on(eventName, callback)`-Methode (siehe oben) — ein reiner
Publish/Subscribe-Mechanismus, den grundsätzlich jedes beliebige Modul
nutzen könnte, nicht nur die Playlist.

Der automatische Video-Übergang entsteht dadurch, dass
`playlist-controller.js` sich bei `player.on('ended', ...)` anmeldet
und bei einem vorhandenen nächsten Eintrag `player.load(...)` gefolgt
von `player.play()` aufruft — beides ausschließlich über die
öffentliche API.

**Werbung (Schritt 4) wird später oberhalb der Playlist-Steuerung
ergänzt:** ein zukünftiges `advertising-controller.js` wird sich
zwischen Playlist und Player schalten (z.B. indem es das
`ended`-Event zuerst selbst abfängt, einen Werbespot abspielt und erst
danach die Playlist über den eigentlichen Videowechsel informiert),
ohne dass der Player etwas davon merkt und ohne dass die
Playlist-Kernlogik (`playlist-state.js`) verändert werden muss.

## Werbemodul und Playback Flow Controller (Schritt 4)

Ab Schritt 4 gibt es vier fachlich getrennte Module und genau eine
Instanz, die sie koordiniert:

```
PlaybackFlowController
├── Player       (kennt weder Playlist noch Werbung)
├── Playlist     (kennt keine Werbung, seit Schritt 4 auch keinen Player mehr)
└── Advertising  (kennt weder Player noch Playlist)
```

**Werbemodul ist unabhängig:** `advertising-controller.js` entscheidet
ausschließlich, ob ein gültiger aktiver Spot vorhanden ist
(`hasActiveAdvertisement()`), welcher es ist (`getActiveAdvertisement()`)
und ob die Daten gültig sind. Es ruft selbst **niemals** `player.load()`
oder `player.play()` auf.

**Der Playback Flow Controller ist die einzige Ablaufsteuerung:**
`src/playback/playback-flow-controller.js` ist die einzige Datei im
Projekt, die `player`, `playlist` und `advertising` gleichzeitig kennt.
Er bindet sich als einzige Stelle an die echten Player-Events
`player.on('ended', ...)` und `player.on('error', ...)` und entscheidet
anhand seines eigenen Ablaufzustands (`IDLE`, `AD_READY`, `AD_PLAYING`,
`CONTENT_READY`, `CONTENT_PLAYING`, `PAUSED`, `FINISHED`, `ERROR`) und
seines aktuellen Modus (`ADVERTISEMENT`, `CONTENT`, `NONE`), was als
Nächstes passiert. Keine Timer, keine simulierten Events — siehe
`docs/TEST_PLAN.md`.

**Player spielt nur das jeweils geladene Medium:** `player-controller.js`
weiß nicht, ob gerade Werbung oder Inhalt läuft — er bekommt einfach
eine Quelle über `load({ source })` und wird über `play()`/`pause()`/
`stop()` gesteuert. Das gilt für Werbespot und Inhaltsvideo
gleichermaßen.

**Playlist verwaltet nur Inhaltsvideos:** `playlist-controller.js`
wurde in Schritt 4 von seiner bisherigen (Schritt-3-)Kopplung an den
Player befreit (siehe nächster Abschnitt) und kennt jetzt ausschließlich
seinen eigenen Zustand (`items`, `currentIndex`, `status`).

**Keine direkte Abhängigkeit zwischen Playlist und Advertising:** Beide
Module haben keinerlei Referenz aufeinander. Die einzige Stelle, die
Informationen aus beiden zu einer Anzeige zusammenführt (z.B. für die
WERBUNG/JETZT-LÄUFT-Kennzeichnung), ist `getNowPlayingInfo()` im
Playback Flow Controller.

### UI-Fassade, damit playlist-ui.js unverändert bleibt

`playlist-ui.js` ist inhaltlich identisch zu Schritt 3 geblieben. Damit
ein Playlist-Klick trotzdem zwingend durch den Flow-Controller läuft
(er muss ja ggf. erst einen Spot vorschalten), bekommt `playlist-ui.js`
ab Schritt 4 in `main.js` den `PlaybackFlowController` als "controller"
übergeben statt des `PlaylistController` direkt. Der Flow-Controller
stellt dafür eine reine Lese-/Weiterleitungs-Fassade bereit
(`getItems()`, `getCurrentIndex()`, `getCurrentItem()`, `getStatus()`,
`STATUSES`, `select()` als Alias für `selectContent()`), die 1:1 an die
echte Playlist-Instanz durchreicht. So musste an `playlist-ui.js`
buchstäblich keine Zeile geändert werden.

### player-ui.js: getrennte Quellen für Anzeige und Aktionen

`player-ui.js` wurde minimal erweitert (kein Rebuild): `wirePlayerView()`
akzeptiert jetzt eine `statusSource` (immer der echte Player — Status
und Zeit müssen unabhängig davon stimmen, ob Werbung oder Inhalt läuft)
und optional ein `actionTarget` (ab Schritt 4 der Flow-Controller, damit
"Play" bei Bedarf zuerst den Spot startet) sowie optional den
`flowController` selbst für die zusätzlichen Zeilen "Modus:"/"Ablauf:"
(Punkt 14). Ohne diese zusätzlichen Parameter verhält sich die Funktion
exakt wie in Schritt 2/3.

### Bugfix während Schritt 4 gefunden: verlorener ERROR-Status

Beim Testen von Schritt 4 wurde ein bestehender Fehler in
`player-controller.js` gefunden (nicht Werbe-spezifisch, sondern ein
allgemeiner Korrektheitsfehler aus Schritt 2/3, der vorher nie sichtbar
wurde): Browser feuern nach einem fehlgeschlagenen Ladeversuch
zusätzlich zum `error`-Event ein `pause`-Event. Der bisherige
`pause`-Handler hat daraufhin den bereits gesetzten `ERROR`-Zustand
fälschlich wieder auf `PAUSED` zurückgesetzt. Behoben durch eine
zusätzliche Prüfung auf `videoEl.error` im `pause`-Handler. Siehe
Commit-Kommentar in `player-controller.js`.

## Whitelabel-Theming und TV-Oberfläche (Phase 5)

### Kein fetch() unter file:// — Mandanten-Registry statt JSON-Fetch

Phase 5 sollte ursprünglich Mandantendaten aus `public/demo-data/*.json`
per `fetch()` laden. Empirisch geprüft: **`fetch()` einer lokalen Datei
scheitert unter `file://` in Chrome** exakt wie zuvor schon ES-Module
und Vite-Builds:

```
Fetch API cannot load file:///.../data.json.
URL scheme "file" is not supported.
```

Deshalb registrieren sich Mandanten-Konfigurationen stattdessen über
klassische `<script>`-Tags in `window.ONLANG.tenantRegistry[customerId]`
— exakt dasselbe, bereits bewährte Muster wie zuvor
`playlist-data.js`/`advertising-data.js`. Jede Datei unter
`public/demo-data/*.js` trägt sich beim Laden selbst ein:

```js
window.ONLANG.tenantRegistry['bbk-duesseldorf'] = { tenant: {...}, videos: [...], ... };
```

`tenant-service.js` (`loadTenantData()`) sucht darin anhand der
`?kunde=`-URL-Kennung, fällt bei Nichtfinden auf `DEFAULT` zurück und
validiert wie gehabt über `tenant-validator.js`. Die begleitenden
`*.json`-Dateien im selben Ordner sind **rein dokumentarische
Referenz** (identischer Inhalt, aus derselben Quelle erzeugt) und
werden zur Laufzeit nicht geladen — nützlich für Menschen und für eine
spätere echte API-Anbindung (Phase 7), bei der `tenant-service.js`
durch einen echten Netzwerkabruf ersetzt wird.

Ein neuer Mandant benötigt: eine neue `public/demo-data/{kunde}.js`
sowie einen zusätzlichen `<script>`-Tag dafür in `index.html` — sonst
nichts.

### Schema-Erweiterung — additiv, keine bestehenden Felder verändert

`tenant.theme` (`accent`/`background`/`surface`/`text`) ist
**unverändert** seit Schritt 1. Neu und optional hinzugekommen:
`tenant.logoText`, `tenant.presenter.{label,name,logoUrl}`, sowie die
erstmals konkret definierte Item-Struktur von `videos`/`categories`/
`partners`/`advertisements` (siehe `docs/DATA_MODEL.md`). Ungültige
einzelne Einträge (z.B. ein Video ohne `src`) werden vom Validator
übersprungen und mit Hinweis versehen, nicht die ganze Liste verworfen.

### Dynamisches Theming

`tenant-service.js` → `applyTenantTheme(theme)` überträgt
`tenant.theme` als Inline-Styles auf `:root` (`--tv-accent`, `--tv-bg`,
`--tv-surface`, `--tv-text` — dieselben Variablennamen wie in
`tokens.css`). Da Inline-Styles jede CSS-Regel überschreiben, war keine
Änderung an `tokens.css` selbst nötig.

### Full-/Embed-View — reine Kompositionsschicht

`full-view.js`, `embed-view.js` und das neue gemeinsame
`view-helpers.js` bauen ausschließlich Layout (Header, Kategorien,
Partner) und rendern Tenant-**Daten** — sie enthalten keine eigene
Player-/Playlist-/Werbelogik. Die eigentliche Funktionalität kommt
unverändert aus `player-ui.js`/`playlist-ui.js`/`advertising-ui.js`
(Schritt 2–4), die von `createModuleViews()` lediglich in die vom
jeweiligen View bereitgestellten Container eingehängt werden.
`main.js` erstellt Player-/Playlist-/Advertising-Controller und den
`PlaybackFlowController` genau wie in Schritt 4 — einzige Änderung:
`contentItems`/`advertisements` kommen jetzt aus `tenant.videos`/
`tenant.advertisements` statt aus den (ab Phase 5 nicht mehr geladenen)
Dateien `playlist-data.js`/`advertising-data.js`.

### Kleine notwendige Anpassung an player-ui.js

`player-ui.js` zeigte bisher fest den Titel "ONLANG TV" über dem
Videofenster. Das wurde entfernt, da der neue, markengetreue
`tv-header` (Phase 5) diese Rolle jetzt übernimmt — sonst hätte jeder
Mandant zusätzlich zum eigenen Header-Logo redundant "ONLANG TV" über
dem Player stehen gehabt. Keine Werbe- oder Mandanten-Logik wurde
dabei ergänzt, nur eine veraltete, jetzt doppelte Zeile entfernt.

## Echte Branding-Assets, Vereins-Schnellwechsler (Phase 5, Nachtrag)

### Echte Assets statt Platzhalter

- `public/assets/logos/onlang-logo.png` / `onlang-logo-round.png`: das
  echte runde ONLANG-Logo, aus der bereitgestellten Marketing-Vorlage
  freigestellt. Wird per `tenant.logoUrl` gesteuert — beim
  `DEFAULT`-Mandanten (der ONLANG selbst repräsentiert) im Header,
  bei allen Mandanten im Partnereintrag "ONLANG". **Bewusst nicht**
  im Header von `bbk-duesseldorf`/`verein-blau-weiss` — dort steht
  weiterhin der jeweils eigene Vereins-Platzhalter, da ein Kunde nicht
  mit dem ONLANG-Logo im eigenen Header erscheinen soll.
- `public/assets/videos/onlang-spot-real.mp4`: das bereitgestellte,
  echte ONLANG-Spot-Video (1920×1080, H.264).
- `public/assets/videos/onlang-spotfolien.mp4`: eine aus den drei
  bereitgestellten Spotfolien ("Willkommen bei ONLANG", "Alles auf
  einer Plattform", "Präsentiert von ONLANG") erzeugte Slideshow mit
  Überblendungen — ebenfalls echtes Bildmaterial, kein synthetischer
  Platzhalter mehr.
- Fehlt ein Logo einmal (`logoUrl` zeigt ins Leere), fängt
  `view-helpers.js` das über das `error`-Event des `<img>` ab und
  fällt automatisch auf den bisherigen Text-Platzhalter zurück — kein
  kaputtes Bildsymbol.

### `?kunde=` bleibt primär, `?tenant=` als Alias

Die Anweisung zum Schnellwechsler nannte `?tenant=<ID>`. Das
**dokumentierte, seit Schritt 1 durchgängig verwendete** Format ist
`?kunde=`. Um nichts Bestehendes zu brechen, wurde `?tenant=`
zusätzlich als **Alias** ergänzt (nur verwendet, wenn `?kunde=` fehlt).
Der interne Wechsler schreibt beim Auswählen eines Vereins immer
kanonisch `?kunde=` in die Adresszeile zurück. Fallback bei fehlender
oder unbekannter ID bleibt `DEFAULT` (Groß-/Kleinschreibung wird beim
Nachschlagen ignoriert, `?kunde=default` funktioniert also genauso).

### Vereins-Schnellwechsler ohne Neuladen

`main.js` wurde in eine wiederverwendbare `bootstrap(customerId)`-
Funktion umgebaut. Das Dropdown im Header (nur Vollansicht, siehe
`view-helpers.js`, `renderTenantSwitcher()`) listet
`TenantService.getAvailableCustomerIds()` — alle aktuell per
`<script>`-Tag registrierten Mandanten. Bei Auswahl:

1. `history.pushState()` aktualisiert `?kunde=` in der Adresszeile,
   **ohne** die Seite neu zu laden.
2. `bootstrap(neueId)` läuft erneut: `#app` wird komplett neu
   aufgebaut, wodurch das alte `<video>`-Element automatisch aus dem
   DOM entfernt wird (stoppt jede laufende Wiedergabe) und ein neuer,
   sauberer Satz Controller (Player/Playlist/Advertising/
   PlaybackFlowController) entsteht — keine manuelle Aufräumlogik
   nötig, kein doppelt gebundenes Event.
3. Browser-Zurück/Vor (`popstate`) wird ebenfalls unterstützt.

## Abweichung von der vorgegebenen Ordnerstruktur

Eine einzige, technisch notwendige Abweichung von der ursprünglich
vorgegebenen Struktur: `index.html` liegt im **Projekt-Root**, nicht
unter `public/index.html`. Grund: Auch ohne Vite ist es die allgemein
übliche und für Nutzer nachvollziehbarste Position für die
Einstiegsseite eines Webprojekts (direkt neben `README.md` sichtbar,
kein Suchen in Unterordnern nötig). Alle anderen Ordner
(`public/assets/`, `public/demo-data/`, `src/...`, `tests/`, `docs/`)
entsprechen exakt der vorgegebenen Struktur.
