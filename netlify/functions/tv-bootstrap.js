/**
 * ONLANG TV – Netlify Bootstrap Proxy
 * TV 3.2
 */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzrvPIQsGaqHP28_9G-geahMB0QMYHlbylnGLUTeJagi1Sc_rgPVErasrhc0HGGthppYA/exec";

export default async function handler(request) {
  try {
    const requestUrl = new URL(request.url);

    const kunde = String(
      requestUrl.searchParams.get("kunde") || ""
    ).trim();

    if (!kunde) {
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

    const appsScriptUrl = new URL(APPS_SCRIPT_URL);

    appsScriptUrl.searchParams.set(
      "action",
      "get_tv_playlist"
    );

    appsScriptUrl.searchParams.set(
      "kundenId",
      kunde
    );

    console.log(
      "TV-Playlist-Anfrage an Apps Script:",
      appsScriptUrl.toString()
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

    return new Response(
      responseText,
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
          message: "TV-Playlist konnte nicht geladen werden."
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
