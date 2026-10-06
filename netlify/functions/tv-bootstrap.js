/**
 * ONLANG TV – Netlify Bootstrap (Supabase)
 * TV 4.0
 *
 * Liest per Supabase-REST mit dem GEHEIMEN SUPABASE_SECRET_KEY (nur
 * apikey-Header, geht nie an den Browser):
 *   - kunden      -> Sendername, Logo, Akzentfarbe, Sprache
 *   - tv_inhalte  -> Videos und Werbespots des Kunden
 *
 * Die Antwort hat das bisherige Bootstrap-Format (tenant, settings,
 * playlist.videos, advertising.items, live, warnings, meta). Neu ist nur
 * meta.language ("de" | "hu").
 *
 * Fehlerantworten enthalten nie technische Details, nur einen Code:
 *   CUSTOMER_UNKNOWN -> Kunde fehlt oder ist unbekannt (Seite zeigt den
 *                       neutralen Demo-Sender)
 *   TV_UNAVAILABLE   -> Supabase nicht erreichbar (Seite zeigt nur einen
 *                       Hinweis, keine Demo-Videos)
 */

const LOG = "[TV]";

const KUNDEN_MUSTER = /^[A-Z0-9]{2,12}$/;
const FARB_MUSTER = /^#[0-9a-f]{6}$/i;
const ADRESS_MUSTER = /^https?:\/\//i;
const NUR_DATUM_MUSTER = /^\d{4}-\d{2}-\d{2}$/;

const KUNDEN_SPALTEN =
  "kunden_id,verein_name,short_name,logo_verein,thema_farbe,sprache";

const TV_SPALTEN =
  "id,typ,titel,video_url,poster_url,reihenfolge,start_am,ende_am";

// Hintergrund, Fläche und Text sind für alle Sender gleich dunkel. Nur
// die Akzentfarbe kommt vom Kunden (kunden.thema_farbe).
const THEMA = {
  accent: "#f28c00",
  background: "#080808",
  surface: "#151515",
  text: "#ffffff"
};

const PRAESENTIERT = {
  de: " präsentiert von",
  hu: " bemutatja"
};

function text(wert) {
  return wert === undefined || wert === null ? "" : String(wert).trim();
}

function antwort(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function fehler(status, code, message) {
  return antwort(status, { success: false, error: { code, message } });
}

// null bedeutet technischer Fehler, [] bedeutet keine Zeilen.
async function ladeZeilen(tabelle, query) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    console.error(`${LOG} SUPABASE_URL/SUPABASE_SECRET_KEY nicht gesetzt`);
    return null;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/${tabelle}?${query}`,
      {
        method: "GET",
        headers: { apikey: secretKey },
        signal: AbortSignal.timeout(5000)
      }
    );

    if (!response.ok) {
      console.error(`${LOG} Unerwarteter Status (${tabelle})`, response.status);
      return null;
    }

    const rows = await response.json();
    return Array.isArray(rows) ? rows : null;
  } catch (error) {
    console.error(`${LOG} Anfrage fehlgeschlagen (${tabelle})`, error);
    return null;
  }
}

// Start/Ende leer oder jetzt im Zeitraum. Ein Ende ohne Uhrzeit
// (2026-10-31) gilt bis zum Ende dieses Tages.
function imZeitraum(row, jetzt) {
  const start = text(row.start_am);
  const ende = text(row.ende_am);

  if (start) {
    const ab = new Date(start).getTime();
    if (!isNaN(ab) && jetzt < ab) return false;
  }

  if (ende) {
    let bis = new Date(ende).getTime();
    if (NUR_DATUM_MUSTER.test(ende)) bis += 24 * 60 * 60 * 1000;
    if (!isNaN(bis) && jetzt > bis) return false;
  }

  return true;
}

function zuMedium(row, index) {
  const typ = text(row.typ).toUpperCase() || "VIDEO";
  const poster = text(row.poster_url);

  return {
    id: text(row.id) || `tv-${index + 1}`,
    title: text(row.titel) || "TV-Inhalt",
    description: "",
    category: typ,
    durationLabel: "",
    src: text(row.video_url),
    poster: ADRESS_MUSTER.test(poster) ? poster : "",
    badge: null,
    active: true
  };
}

function zuTenant(kunde, sprache) {
  const sender =
    (text(kunde.short_name) || text(kunde.verein_name) || "ONLANG") + " TV";
  const logo = text(kunde.logo_verein);
  const farbe = text(kunde.thema_farbe);

  return {
    customerId: text(kunde.kunden_id),
    name: sender,
    tagline: "",
    logoUrl: ADRESS_MUSTER.test(logo) ? logo : "",
    logoText: "",
    theme: {
      ...THEMA,
      accent: FARB_MUSTER.test(farbe) ? farbe : THEMA.accent
    },
    presenter: {
      label: sender + PRAESENTIERT[sprache],
      name: "ONLANG",
      logoUrl: ""
    }
  };
}

export default async function handler(request) {
  const params = new URL(request.url).searchParams;

  const requested = text(params.get("kunde") || params.get("tenant"));
  const kundenId = requested.toUpperCase();

  if (!KUNDEN_MUSTER.test(kundenId)) {
    return fehler(200, "CUSTOMER_UNKNOWN", "Kunde unbekannt.");
  }

  const filter = `kunden_id=eq.${encodeURIComponent(kundenId)}`;

  const [kunden, inhalte] = await Promise.all([
    ladeZeilen("kunden", `${filter}&select=${KUNDEN_SPALTEN}`),
    ladeZeilen(
      "tv_inhalte",
      `${filter}&aktiv=eq.true&select=${TV_SPALTEN}` +
        "&order=reihenfolge.asc.nullslast,id.asc"
    )
  ]);

  if (!kunden || !inhalte) {
    return fehler(503, "TV_UNAVAILABLE", "TV gerade nicht erreichbar.");
  }

  if (kunden.length !== 1) {
    return fehler(200, "CUSTOMER_UNKNOWN", "Kunde unbekannt.");
  }

  const sprache =
    text(kunden[0].sprache).toLowerCase() === "hu" ? "hu" : "de";

  const tenant = zuTenant(kunden[0], sprache);

  const jetzt = Date.now();
  const videos = [];
  const ads = [];

  inhalte
    .filter((row) => imZeitraum(row, jetzt))
    .forEach((row, index) => {
      const media = zuMedium(row, index);

      if (!ADRESS_MUSTER.test(media.src)) return;

      if (media.category === "WERBESPOT") {
        ads.push(media);
      } else {
        videos.push(media);
      }
    });

  // Ohne Videos gibt es nichts, wozwischen ein Spot laufen könnte.
  const spots = videos.length > 0 ? ads : [];

  return antwort(200, {
    success: true,

    tenant: tenant,

    settings: {
      defaultView: "full",
      autoplay: true,
      mutedAutoplay: true,
      loopPlaylist: true,
      advertisingMode: spots.length > 0 ? "startup" : "off"
    },

    playlist: {
      videos: videos
    },

    advertising: {
      items: spots
    },

    live: {
      enabled: false,
      title: "",
      date: "",
      time: ""
    },

    warnings: [],

    meta: {
      requestedCustomerId: requested,
      loadedCustomerId: tenant.customerId,
      fallbackUsed: false,
      kundenId: tenant.customerId,
      tvKey: tenant.customerId,
      language: sprache
    }
  });
}
