/**
 * ONLANG TV Bootstrap Loader
 * TV 3.1 – Schritt 1
 */

const BootstrapLoader = {

  apiUrl:"https://script.google.com/macros/s/AKfycbxovRbJTE6qP_dP-I0PS2f_Hfnl58RcDNj00FL4cGg3LpIrrRhQKI10SMnH0LoiH-2J/exec",
    

  async test() {

    try {

      const url =
        this.apiUrl +
        "?action=getTvBootstrap&kunde=V006";

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
