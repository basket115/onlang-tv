// advertising-data.js
//
// Enthält AUSSCHLIESSLICH die lokalen Werbedaten. Keine Logik.
// Genau ein Werbespot für Schritt 4 (siehe Anweisung, Punkt 1).
//
// Klassisches <script>, KEIN ES-Modul.

window.ONLANG = window.ONLANG || {};

window.ONLANG.advertisingData = [
  {
    id: 'ad-1',
    title: 'ONLANG präsentiert',
    sponsor: 'ONLANG',
    durationLabel: '00:05',
    src: 'public/assets/videos/advertisement.mp4',
    active: true,
  },
];
