/**
 * ONLANG TV – Netlify Bootstrap Proxy
 * TV 3.3
 */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzrvPIQsGaqHP28_9G-geahMB0QMYHlbylnGLUTeJagi1Sc_rgPVErasrhc0HGGthppYA/exec";

const CUSTOMER_ALIASES = {
  "v002": { kundenId: "V002", slug: "scorpions-sggierath" },
  "scorpions-sggierath": { kundenId: "V002", slug: "scorpions-sggierath" },
  "v006": { kundenId: "V006", slug: "bbk-duesseldorf" },
  "bbk-duesseldorf": { kundenId: "V006", slug: "bbk-duesseldorf" },
  "hu001": { kundenId: "HU001", slug: "HU001" },
  "darazsak": { kundenId: "HU001", slug: "HU001" }
};

function resolveCustomer(raw) {
  const key = String(raw || "").trim();

  return CUSTOMER_ALIASES[key.toLowerCase()] || {
    kundenId: key,
    slug: key
  };
}

function tenantFor(customer) {
  if (customer.kundenId === "V002") {
    return {
      customerId: "scorpions-sggierath",
      name: "Scorpions TV",
      tagline: "Das Videoportal der Basketballabteilung SG Gierath",
      logoUrl: "public/assets/logos/scorpions-logo.svg",
      logoText: "SGG",
      theme: {
        accent: "#d71920",
        background: "#05070b",
        surface: "#10131a",
        text: "#ffffff"
      },
      presenter: {
        label: "Scorpions TV präsentiert von",
        name: "ONLANG",
        logoUrl: ""
      }
    };
  }

  if (customer.kundenId === "V006") {
    return {
      customerId: "bbk-duesseldorf",
      name: "BBK TV",
      tagline: "Das Videoportal des Basketballkreises Düsseldorf / Neuss",
      logoUrl: "public/assets/logos/bbk-logo.png",
      logoText: "BBK",
      theme: {
        accent: "#ff7a1a",
        background: "#0f172a",
        surface: "#18233d",
        text: "#ffffff"
      },
      presenter: {
        label: "BBK TV präsentiert von",
        name: "ONLANG",
        logoUrl: ""
      }
    };
  }

  if (customer.kundenId === "HU001") {
    return {
      customerId: "HU001",
      name: "Darazsak TV",
      tagline: "A Darazsak videócsatornája",
      logoUrl: "public/assets/logos/Darazsak Logo.png",
      logoText: "DARAZSAK",
      theme: {
        accent: "#f2b705",
        background: "#080808",
        surface: "#151515",
        text: "#ffffff"
      },
      presenter: {
        label: "Darazsak TV bemutatja",
        name: "ONLANG",
        logoUrl: ""
      }
    };
  }

  return {
    customerId: customer.slug,
    name: "ONLANG TV",
    tagline: "Das Videoportal für Vereine und Verbände",
    logoUrl: "",
    logoText: "OT",
    theme: {
      accent: "#f2b705",
      background: "#080808",
      surface: "#151515",
      text: "#ffffff"
    },
    presenter: {
      label: "ONLANG TV präsentiert von",
      name: "ONLANG",
      logoUrl: ""
    }
  };
}

function toMediaItem(item, index) {
  return {
    id: String(item.TV_ID || `tv-${index + 1}`),
    title: String(item.Titel || "TV-Inhalt"),
    description: "",
    category: String(item.Typ || "VIDEO"),
    durationLabel: String(item.Typ || "VIDEO"),
    src: String(item.Video_URL || ""),
    poster: String(item.Poster_URL || ""),
    badge: null,
    active: String(item.Aktiv || "JA").toUpperCase() !== "NEIN"
  };
}

export default async function handler(request) {
  try {
    const requestUrl = new URL(request.url);

    const requested = String(
      requestUrl.searchParams.get("kunde") || ""
    ).trim();

    if (!requested) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "CUSTOMER_ID_REQUIRED",
            message: "Kunden-ID fehlt."
          }
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const customer = resolveCustomer(requested);

    const appsScriptUrl = new URL(APPS_SCRIPT_URL);

    appsScriptUrl.searchParams.set(
      "action",
      "getTvBootstrap"
    );

    appsScriptUrl.searchParams.set(
      "kundenId",
      customer.kundenId
    );

    const response = await fetch(
      appsScriptUrl.toString(),
      {
        method: "GET",
        redirect: "follow"
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: "APPS_SCRIPT_REQUEST_FAILED",
            message: `Apps Script antwortete mit HTTP ${response.status}`
          }
        }),
        {
          status: 502,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const playlistResult = JSON.parse(responseText);

    if (!playlistResult || playlistResult.success !== true) {
      return new Response(
        JSON.stringify(
          playlistResult || {
            success: false,
            error: {
              code: "TV_PLAYLIST_ERROR",
              message: "TV-Playlist konnte nicht geladen werden."
            }
          }
        ),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }
      );
    }

    const items = Array.isArray(playlistResult.items)
      ? playlistResult.items
      : [];

    const ads = [];
    const videos = [];

    items.forEach((item, index) => {
      const media = toMediaItem(item, index);

      if (!media.src || media.active === false) return;

      if (
        String(item.Typ || "").toUpperCase() === "WERBESPOT"
      ) {
        ads.push(media);
      } else {
        videos.push(media);
      }
    });

    const tenant = tenantFor(customer);

    const bootstrap = {
      success: true,

      tenant: tenant,

      settings: {
        defaultView: "full",
        autoplay: true,
        mutedAutoplay: true,
        loopPlaylist: true,
        advertisingMode:
          playlistResult.adsEnabled === false
            ? "off"
            : "startup"
      },

      playlist: {
        videos: videos
      },

      advertising: {
        items: ads
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
        kundenId: customer.kundenId,
        tvKey:
          playlistResult.tvKey ||
          customer.slug
      }
    };

    return new Response(
      JSON.stringify(bootstrap),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "TV_PLAYLIST_PROXY_FAILED",
          message:
            error && error.message
              ? error.message
              : "TV-Playlist konnte nicht geladen werden."
        }
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store"
        }
      }
    );
  }
}
