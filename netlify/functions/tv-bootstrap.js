/**
 * ONLANG TV – Netlify Bootstrap Proxy
 * TV 3.1
 *
 * Verantwortlichkeit:
 * - Apps-Script-WebApp serverseitig aufrufen
 * - Weiterleitungen von Google verfolgen
 * - Bootstrap-JSON an den Browser weitergeben
 *
 * Noch keine Verbindung zu:
 * - main.js
 * - Player
 * - Playlist
 * - Views
 */

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxovRbJTE6qP_dP-I0PS2f_Hfnl58RcDNj00FL4cGg3LpIrrRhQKI10SMnH0LoiH-2J/exec";

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
      "getTvBootstrap"
    );

    appsScriptUrl.searchParams.set(
      "kunde",
      kunde
    );

    console.log(
      "Bootstrap-Anfrage an Apps Script:",
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

      console.error(
        "Apps Script antwortete mit HTTP",
        response.status
      );

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

    console.error(
      "Bootstrap-Proxy fehlgeschlagen:",
      error
    );

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: "BOOTSTRAP_PROXY_FAILED",
          message: "Bootstrap konnte nicht geladen werden."
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
