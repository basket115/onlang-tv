// bbk-duesseldorf.js
// Demo-Mandant "BBK Düsseldorf/Neuss" — Orange/Dunkelblau, wie im Entwurf.
// AUSSCHLIESSLICH Daten, keine eigene Logik (siehe Vorgabe "kein
// Sondercode"). Videos verweisen auf dieselben lokalen Testdateien wie
// der Standard-Mandant (kein echtes BBK-Footage vorhanden) — Titel/
// Kategorien/Partner sind Demo-Inhalte. Begleitende bbk-duesseldorf.json
// im selben Ordner: identischer Inhalt, reine Referenz, wird zur
// Laufzeit NICHT geladen (siehe tenant-service.js).

window.ONLANG = window.ONLANG || {};
window.ONLANG.tenantRegistry = window.ONLANG.tenantRegistry || {};

window.ONLANG.tenantRegistry['bbk-duesseldorf'] = {
  tenant: {
    customerId: 'bbk-duesseldorf',
    name: 'BBK TV',
    tagline: 'Das Videoportal des Basketballkreises Düsseldorf / Neuss',
    logoUrl: 'public/assets/logos/bbk-logo.png',
    logoText: 'BBK',
    theme: {
      accent: '#ff7a1a',
      background: '#0f172a',
      surface: '#18233d',
      text: '#ffffff',
    },
    presenter: {
      label: 'BBK TV präsentiert von',
      name: 'ONLANG',
      logoUrl: '',
    },
  },
  settings: {
    defaultView: 'full',
    autoplay: true,
    mutedAutoplay: true,
    loopPlaylist: true,
    advertisingMode: 'startup',
  },
  live: {
    enabled: true,
    title: 'BBK Herrenliga',
    date: 'Samstag',
    time: '19:00 Uhr',
  },
  videos: [
    { id: 'video-1', title: 'Vereinsbeitrag 1', description: 'Demo mit echtem Vereinsvideo.', category: 'Highlights', durationLabel: 'Vereinsvideo', src: 'public/assets/videos/video1.mp4', badge: 'NEU' },
    { id: 'video-2', title: 'Vereinsbeitrag 2', description: 'Demo mit echtem Vereinsvideo.', category: 'Interviews', durationLabel: 'Vereinsvideo', src: 'public/assets/videos/video2.mp4', badge: null },
    { id: 'video-3', title: 'Vereinsbeitrag 3', description: 'Demo mit echtem Vereinsvideo.', category: 'Nachwuchs', durationLabel: 'Vereinsvideo', src: 'public/assets/videos/video3.mp4', badge: null },
  ],

  categories: [
    { id: 'cat-1', icon: '📣', label: 'BBK Aktuell', description: 'Neuigkeiten aus dem Kreis' },
    { id: 'cat-2', icon: '🏀', label: 'Spielbetrieb', description: 'Ergebnisse und Spielplan' },
    { id: 'cat-3', icon: '🧒', label: 'Jugend', description: 'Der Nachwuchs im Fokus' },
    { id: 'cat-4', icon: '🏛', label: 'Vereine', description: 'Die Mitgliedsvereine im Portrait' },
    { id: 'cat-5', icon: '📋', label: 'Trainer', description: 'Trainerinnen und Trainer im Gespräch' },
    { id: 'cat-6', icon: '🟠', label: 'Schiedsrichter', description: 'Einblicke ins Schiedsrichterwesen' },
  ],
  partners: [
    { id: 'p-1', name: 'ONLANG', logoUrl: 'public/assets/logos/onlang-logo.png', subtitle: 'Digitale Vereinsplattform' },
    { id: 'p-2', name: 'Molten', logoUrl: '', subtitle: 'Offizieller Ballpartner' },
    { id: 'p-3', name: 'Volksbank', logoUrl: '', subtitle: 'Regionaler Förderpartner' },
    { id: 'p-4', name: 'Stadtwerke', logoUrl: '', subtitle: 'Energie für den BBK' },
  ],
  advertisements: [
    { id: 'ad-1', title: 'ONLANG präsentiert', sponsor: 'ONLANG', durationLabel: '00:10', src: 'public/assets/videos/onlang-spot-real.mp4', active: true },
  ],
};
