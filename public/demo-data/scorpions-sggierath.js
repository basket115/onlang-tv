// Demo-Mandant Scorpions SG Gierath — datengetriebener Sofortwechsel.
window.ONLANG = window.ONLANG || {};
window.ONLANG.tenantRegistry = window.ONLANG.tenantRegistry || {};
window.ONLANG.tenantRegistry['scorpions-sggierath'] = {
  tenant: {
    customerId: 'scorpions-sggierath',
    name: 'Scorpions TV',
    tagline: 'Das Videoportal der Basketballabteilung SG Gierath',
    logoUrl: 'public/assets/logos/scorpions-logo.svg',
    logoText: 'SGG',
    theme: { accent: '#d71920', background: '#05070b', surface: '#10131a', text: '#ffffff' },
    presenter: { label: 'Scorpions TV präsentiert von', name: 'ONLANG', logoUrl: '' }
  },
  settings: { defaultView: 'full', autoplay: true, mutedAutoplay: true, loopPlaylist: true, advertisingMode: 'startup' },
  live: { enabled: true, title: 'Scorpions Basketball', date: 'Spieltag', time: 'Automatik' },
  videos: [
    { id: 'sgg-video-1', title: 'Scorpions Spielbericht', description: 'Aktuelles Vereinsvideo.', category: 'Highlights', durationLabel: 'Vereinsvideo', src: 'public/assets/videos/video1.mp4', badge: 'NEU' },
    { id: 'sgg-video-2', title: 'Team und Trainer', description: 'Einblicke aus dem Verein.', category: 'Interviews', durationLabel: 'Vereinsvideo', src: 'public/assets/videos/video2.mp4', badge: null },
    { id: 'sgg-video-3', title: 'Scorpions Nachwuchs', description: 'Jugendbasketball im Fokus.', category: 'Nachwuchs', durationLabel: 'Vereinsvideo', src: 'public/assets/videos/video3.mp4', badge: null }
  ],
  categories: [
    { id: 'sgg-cat-1', icon: '🏀', label: 'Scorpions Aktuell', description: 'Neuigkeiten aus der Abteilung' },
    { id: 'sgg-cat-2', icon: '📅', label: 'Spielbetrieb', description: 'Spiele, Ergebnisse und Termine' },
    { id: 'sgg-cat-3', icon: '🧒', label: 'Jugend', description: 'Unsere Nachwuchsteams' },
    { id: 'sgg-cat-4', icon: '🎙', label: 'Interviews', description: 'Stimmen aus dem Verein' },
    { id: 'sgg-cat-5', icon: '🤝', label: 'Partner', description: 'Unterstützer der Scorpions' }
  ],
  partners: [
    { id: 'sgg-p-1', name: 'ONLANG', logoUrl: 'public/assets/logos/onlang-logo.png', subtitle: 'Digitale Vereinsplattform' },
    { id: 'sgg-p-2', name: 'SG Rot-Weiß Gierath', logoUrl: '', subtitle: 'Heimatverein der Scorpions' }
  ],
  advertisements: [
    { id: 'sgg-ad-1', title: 'ONLANG präsentiert', sponsor: 'ONLANG', durationLabel: '00:10', src: 'public/assets/videos/onlang-spot-real.mp4', active: true }
  ]
};
