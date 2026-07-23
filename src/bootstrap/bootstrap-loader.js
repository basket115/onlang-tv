/**
 * ONLANG TV Bootstrap Loader
 * TV 3.1 – Schritt 1
 *
 * Verantwortlichkeit:
 * - Bootstrap-Daten über die Netlify Function laden
 * - JSON empfangen
 * - Ergebnis in der Browser-Konsole ausgeben
 *
 * Noch keine Verbindung zu:
 * - main.js
 * - Player
 * - Playlist
 * - Views
 */

const BootstrapLoader = {

  apiUrl: "/.netlify/functions/tv-bootstrap",

  async test() {

    try {

      const url =
        this.apiUrl +
        "?kunde=V006";

      console.log("Lade Bootstrap...");
      console.log(url);

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();

      console.log("Bootstrap erfolgreich geladen:");
      console.log(json);

      return json;

    } catch (error) {

      console.error("Bootstrap konnte nicht geladen werden");
      console.error(error);

      throw error;

    }

  }

};

export default BootstrapLoader;
