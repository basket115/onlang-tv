// Demo-Mandant Darazsak — ungarische TV-Version.
window.ONLANG = window.ONLANG || {};
window.ONLANG.tenantRegistry = window.ONLANG.tenantRegistry || {};

window.ONLANG.tenantRegistry['HU001'] = {
  tenant: {
    customerId: 'HU001',
    name: 'Darazsak TV',
    tagline: 'A Darazsak videócsatornája',
    logoUrl: '',
    logoText: 'DARAZSAK',
    theme: {
      accent: '#f2b705',
      background: '#080808',
      surface: '#151515',
      text: '#ffffff'
    },
    presenter: {
      label: 'Darazsak TV bemutatja',
      name: 'ONLANG',
      logoUrl: ''
    }
  },

  settings: {
    defaultView: 'full',
    autoplay: true,
    mutedAutoplay: true,
    loopPlaylist: true,
    advertisingMode: 'startup'
  },

  live: {
    enabled: false,
    title: '',
    date: '',
    time: ''
  },

  videos: [
    {
      id: 'darazsak-video-1',
      title: 'Darazsak – Egyesületi videó 1',
      description: 'Darazsak TV tesztvideó.',
      category: 'Kiemelt videók',
      durationLabel: 'VIDEÓ',
      src: 'public/assets/videos/video1.mp4',
      badge: 'ÚJ'
    },
    {
      id: 'darazsak-video-2',
      title: 'Darazsak – Egyesületi videó 2',
      description: 'Darazsak TV tesztvideó.',
      category: 'Egyesületi élet',
      durationLabel: 'VIDEÓ',
      src: 'public/assets/videos/video2.mp4',
      badge: null
    }
  ],

  categories: [
    {
      id: 'darazsak-cat-1',
      icon: '🏀',
      label: 'Kiemelt videók',
      description: 'A legjobb jelenetek'
    },
    {
      id: 'darazsak-cat-2',
      icon: '🎙',
      label: 'Interjúk',
      description: 'Beszélgetések játékosokkal és edzőkkel'
    },
    {
      id: 'darazsak-cat-3',
      icon: '🧒',
      label: 'Utánpótlás',
      description: 'Fiatal játékosaink és csapataink'
    },
    {
      id: 'darazsak-cat-4',
      icon: '📅',
      label: 'Mérkőzések',
      description: 'Mérkőzések, eredmények és események'
    }
  ],

  partners: [
    {
      id: 'darazsak-p-1',
      name: 'ONLANG',
      logoUrl: 'public/assets/logos/onlang-logo.png',
      subtitle: 'Digitális egyesületi platform'
    }
  ],

  advertisements: [
    {
      id: 'darazsak-ad-1',
      title: 'Az ONLANG bemutatja',
      sponsor: 'ONLANG',
      durationLabel: '00:10',
      src: 'public/assets/videos/onlang-spot-real.mp4',
      active: true
    }
  ]
};
