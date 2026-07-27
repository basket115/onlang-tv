// translations.js
//
// Zentrale, frameworkfreie Übersetzungstabelle für DE/HU/EN. Enthält
// AUSSCHLIESSLICH strukturelle UI-Texte (Labels, Status, Fehler-
// meldungen, Ticker- und Footer-Texte) — KEINE redaktionellen Daten aus
// dem Bootstrap (Video-Titel, Vereinsname, Sponsorname bleiben
// unverändert, wie sie aus den Mandantendaten kommen). "ONLANG" bzw.
// "ONLANG TV" als Produktname wird nicht übersetzt.
//
// Schlüssel sind semantisch und stabil (z.B. "status.advertising"),
// nicht die deutschen Texte selbst. Deutsch (DE) ist die Ausgangs- und
// Fallback-Sprache — die DE-Werte entsprechen bewusst exakt den aktuell
// im Quellcode fest verdrahteten Texten (siehe Phase-1-Bestandsaufnahme
// in docs/ARCHITECTURE.md, Abschnitt "Mehrsprachigkeit"), damit eine
// spätere Anbindung (Phase 4) den bestehenden, getesteten Sendebetrieb
// nicht sichtbar verändert.
//
// Texte mit "{platzhalter}" enthalten eine spätere Ersetzung (z.B. Name
// des Mandanten, Video-Titel). Diese Datei liefert nur die Vorlage —
// das Ersetzen selbst ist noch nicht angebunden (kommt in Phase 4).
//
// Diese Datei enthält KEINE Logik (kein Fallback, keine Normalisierung)
// — das übernimmt ausschließlich i18n-service.js.
//
// Klassisches <script>, KEIN ES-Modul (siehe docs/ARCHITECTURE.md,
// Abschnitt "Kein Build-Schritt nötig").

window.ONLANG = window.ONLANG || {};
window.ONLANG.i18n = window.ONLANG.i18n || {};

(function (ns) {
  'use strict';

  var TRANSLATIONS = {
    DE: {
      status: {
        advertising: 'WERBUNG',
        nowPlaying: 'JETZT LÄUFT',
        next: 'ALS NÄCHSTES',
        later: 'DANACH',
        live: 'LIVE',
        auto: 'AUTO',
        playingBadge: 'LÄUFT',
        broadcastAuto: 'Automatischer Sendebetrieb',
        loading: 'Wird geladen …',
      },
      player: {
        activatePlayback: 'ONLANG TV starten',
        status: 'Status',
        time: 'Zeit',
        mode: 'Modus',
        flow: 'Ablauf',
        play: 'Play',
        pause: 'Pause',
        stop: 'Stop',
        modeAdvertisement: 'WERBUNG',
        modeContent: 'INHALT',
      },
      playlist: {
        title: 'Programm',
        subtitle: 'Automatischer Wechsel mit Werbespot',
        empty: 'Keine Playlist-Einträge vorhanden.',
        unknownVideo: 'Unbekanntes Video',
        unknownEntry: 'diesem Eintrag',
        itemLoadError: 'Fehler bei „{title}": Video konnte nicht geladen werden.',
        finished: 'Playlist beendet.',
      },
      errors: {
        loadFailed: 'Video konnte nicht geladen werden.',
        fileNotFound: 'Kein Testvideo gefunden.',
        decodeFailed: 'Video konnte nicht dekodiert werden.',
        networkError: 'Netzwerkfehler beim Laden des Videos.',
        aborted: 'Laden des Videos wurde abgebrochen.',
        unknown: 'Unbekannter Fehler beim Laden des Videos.',
      },
      tenant: {
        switchLabel: 'Verein',
        switchAriaLabel: 'Verein wechseln',
        unknownCustomerNotice: 'Unbekannte Kunden-ID „{requested}“ — es wird der Kanal „{loaded}“ angezeigt.',
        loadFailedHeadline: 'Dieser Vereinskanal konnte nicht geladen werden.',
        loadFailedDetailPrefix: 'Kunden-ID: ',
      },
      language: {
        switcherLabel: 'Sprache',
        switcherAriaLabel: 'Sprache wechseln',
      },
      partners: {
        sectionTitle: 'Unsere Partner',
      },
      footer: {
        presentationVersion: 'ONLANG TV – Präsentationsversion 1.0',
        copyrightFull: '© 2026 ONLANG · Digitale Kommunikationsplattform für Vereine und Verbände',
        copyrightEmbed: '© 2026 ONLANG',
      },
      ticker: {
        welcome: 'Willkommen bei {name} – powered by ONLANG',
        category: 'Thema',
        program: 'Im Programm: {title}',
        outlook: 'Highlights und Livestreams als nächste Ausbaustufe',
        embedNowPlaying: 'Jetzt im Programm von {name}',
        sponsorNotice: 'Sponsorenwerbung zwischen den Beiträgen',
        embedAdNotice: 'Werbespots zwischen den Beiträgen',
        broadcastStatusAriaLabel: 'Sendestatus',
        infoAriaLabel: 'TV Informationen',
      },
      content: {
        videos: 'VIDEOS',
        highlights: 'HIGHLIGHTS',
      },
      empty: {
        noContent: 'Keine Inhalte verfügbar',
      },
      datetime: {
        clockSuffix: ' Uhr',
      },
    },

    HU: {
      status: {
        advertising: 'HIRDETÉS',
        nowPlaying: 'MOST MŰSORON',
        next: 'KÖVETKEZIK',
        later: 'EZUTÁN',
        live: 'ÉLŐ',
        auto: 'AUTO',
        playingBadge: 'MŰSORON',
        broadcastAuto: 'Automatikus műsorszórás',
        loading: 'Betöltés …',
      },
      player: {
        activatePlayback: 'ONLANG TV indítása',
        status: 'Állapot',
        time: 'Idő',
        mode: 'Mód',
        flow: 'Működés',
        play: 'Lejátszás',
        pause: 'Szünet',
        stop: 'Leállítás',
        modeAdvertisement: 'HIRDETÉS',
        modeContent: 'TARTALOM',
      },
      playlist: {
        title: 'Műsor',
        subtitle: 'Automatikus váltás hirdetéssel',
        empty: 'Nincsenek műsorelemek.',
        unknownVideo: 'Ismeretlen videó',
        unknownEntry: 'ennél a bejegyzésnél',
        itemLoadError: 'Hiba történt itt: „{title}": a videó nem tölthető be.',
        finished: 'A műsor véget ért.',
      },
      errors: {
        loadFailed: 'A videó nem tölthető be.',
        fileNotFound: 'Nem található teszt videó.',
        decodeFailed: 'A videó nem dekódolható.',
        networkError: 'Hálózati hiba a videó betöltése közben.',
        aborted: 'A videó betöltése megszakadt.',
        unknown: 'Ismeretlen hiba a videó betöltése közben.',
      },
      tenant: {
        switchLabel: 'Egyesület',
        switchAriaLabel: 'Egyesület váltása',
        unknownCustomerNotice: 'Ismeretlen ügyfélazonosító: „{requested}” — helyette a(z) „{loaded}” csatorna jelenik meg.',
        loadFailedHeadline: 'Ezt az egyesületi csatornát nem sikerült betölteni.',
        loadFailedDetailPrefix: 'Ügyfélazonosító: ',
      },
      language: {
        switcherLabel: 'Nyelv',
        switcherAriaLabel: 'Nyelv váltása',
      },
      partners: {
        sectionTitle: 'Partnereink',
      },
      footer: {
        presentationVersion: 'ONLANG TV – 1.0-s bemutató verzió',
        copyrightFull: '© 2026 ONLANG · Digitális kommunikációs platform egyesületek és szövetségek számára',
        copyrightEmbed: '© 2026 ONLANG',
      },
      ticker: {
        welcome: 'Üdvözlünk itt: {name} – powered by ONLANG',
        category: 'Téma',
        program: 'Műsoron: {title}',
        outlook: 'Összefoglalók és élő közvetítések a következő fejlesztési lépésben',
        embedNowPlaying: 'Most a(z) {name} műsorán',
        sponsorNotice: 'Szponzori hirdetések a videók között',
        embedAdNotice: 'Hirdetések a videók között',
        broadcastStatusAriaLabel: 'Adás állapota',
        infoAriaLabel: 'TV információk',
      },
      content: {
        videos: 'VIDEÓK',
        highlights: 'ÖSSZEFOGLALÓK',
      },
      empty: {
        noContent: 'Nincs elérhető tartalom',
      },
      datetime: {
        clockSuffix: '',
      },
    },

    EN: {
      status: {
        advertising: 'ADVERTISEMENT',
        nowPlaying: 'NOW PLAYING',
        next: 'UP NEXT',
        later: 'AFTER THAT',
        live: 'LIVE',
        auto: 'AUTO',
        playingBadge: 'ON AIR',
        broadcastAuto: 'Automatic broadcast',
        loading: 'Loading …',
      },
      player: {
        activatePlayback: 'Start ONLANG TV',
        status: 'Status',
        time: 'Time',
        mode: 'Mode',
        flow: 'Flow',
        play: 'Play',
        pause: 'Pause',
        stop: 'Stop',
        modeAdvertisement: 'ADVERTISEMENT',
        modeContent: 'CONTENT',
      },
      playlist: {
        title: 'Program',
        subtitle: 'Automatic switch with ad break',
        empty: 'No playlist entries available.',
        unknownVideo: 'Unknown video',
        unknownEntry: 'this entry',
        itemLoadError: 'Error with “{title}”: the video could not be loaded.',
        finished: 'Playlist finished.',
      },
      errors: {
        loadFailed: 'The video could not be loaded.',
        fileNotFound: 'No test video found.',
        decodeFailed: 'The video could not be decoded.',
        networkError: 'Network error while loading the video.',
        aborted: 'Loading the video was aborted.',
        unknown: 'Unknown error while loading the video.',
      },
      tenant: {
        switchLabel: 'Club',
        switchAriaLabel: 'Switch club',
        unknownCustomerNotice: 'Unknown customer ID “{requested}” — showing channel “{loaded}” instead.',
        loadFailedHeadline: 'This club channel could not be loaded.',
        loadFailedDetailPrefix: 'Customer ID: ',
      },
      language: {
        switcherLabel: 'Language',
        switcherAriaLabel: 'Switch language',
      },
      partners: {
        sectionTitle: 'Our partners',
      },
      footer: {
        presentationVersion: 'ONLANG TV – Presentation Version 1.0',
        copyrightFull: '© 2026 ONLANG · Digital communication platform for clubs and associations',
        copyrightEmbed: '© 2026 ONLANG',
      },
      ticker: {
        welcome: 'Welcome to {name} – powered by ONLANG',
        category: 'Topic',
        program: 'On air: {title}',
        outlook: 'Highlights and livestreams as the next milestone',
        embedNowPlaying: 'Now on {name}',
        sponsorNotice: 'Sponsor messages between segments',
        embedAdNotice: 'Ad breaks between segments',
        broadcastStatusAriaLabel: 'Broadcast status',
        infoAriaLabel: 'TV information',
      },
      content: {
        videos: 'VIDEOS',
        highlights: 'HIGHLIGHTS',
      },
      empty: {
        noContent: 'No content available',
      },
      datetime: {
        clockSuffix: '',
      },
    },
  };

  ns.Translations = { TRANSLATIONS: TRANSLATIONS };
})(window.ONLANG.i18n);
