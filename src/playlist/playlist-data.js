// playlist-data.js
//
// Enthält AUSSCHLIESSLICH die lokale Test-Playlist. Keine Logik.
//
// Alle Pfade sind relativ und funktionieren über file:// (siehe
// docs/ARCHITECTURE.md, Abschnitt "Kein Build-Schritt nötig").
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};

window.ONLANG.playlistData = [
  {
    id: 'video-1',
    title: 'ONLANG TV – Testvideo 1',
    category: 'Test',
    durationLabel: '00:08',
    src: 'public/assets/videos/sample.mp4',
  },
  {
    id: 'video-2',
    title: 'ONLANG TV – Testvideo 2',
    category: 'Test',
    durationLabel: '00:08',
    src: 'public/assets/videos/sample-2.mp4',
  },
  {
    id: 'video-3',
    title: 'ONLANG TV – Testvideo 3',
    category: 'Test',
    durationLabel: '00:08',
    src: 'public/assets/videos/sample-3.mp4',
  },
];
