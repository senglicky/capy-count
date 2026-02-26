"use strict";

import { useReducer } from "react";

// De initiële staat van de oefening
const initiëleStaat = {
  naam: "",
  geselecteerdeTafels: [],
  modus: "vrij", // vrij, 30s, 1m, 2m
  operaties: "maal", // maal, deel, beide
  bereik: 10, // 10 of 20
  correctie: "direct", // direct of einde
  aantalVragen: 10, // 10, 20, 30
};

function reducer(staat, actie) {
  // Validatie functie om te zorgen dat het aantal vragen past bij het aantal tafels
  const valideerAantalVragen = (tafelsLijst, huidigAantal) => {
    const aantalTafels = tafelsLijst.length;
    if (huidigAantal === 50 && aantalTafels < 5) return 30; // Downgrade naar 30 als < 5 tafels
    if (huidigAantal >= 30 && aantalTafels < 3) return 20; // Downgrade naar 20 als < 3 tafels
    if (huidigAantal >= 20 && aantalTafels < 2) return 10; // Downgrade naar 10 als < 2 tafels
    return huidigAantal;
  };

  switch (actie.type) {
    case "SET_NAAM":
      return { ...staat, naam: actie.waarde };
    case "TOGGLE_TAFEL":
      const nieuweTafels = staat.geselecteerdeTafels.includes(actie.waarde)
        ? staat.geselecteerdeTafels.filter((t) => t !== actie.waarde)
        : [...staat.geselecteerdeTafels, actie.waarde];

      const gesorteerdeTafels = nieuweTafels.sort((a, b) => a - b);
      return {
        ...staat,
        geselecteerdeTafels: gesorteerdeTafels,
        aantalVragen: valideerAantalVragen(gesorteerdeTafels, staat.aantalVragen)
      };
    case "SELECT_ALLE_TAFELS":
      const alleTafels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const zijnAllemaalGeselecteerd = staat.geselecteerdeTafels.length === alleTafels.length;
      const geselecteerd = zijnAllemaalGeselecteerd ? [] : alleTafels;
      return {
        ...staat,
        geselecteerdeTafels: geselecteerd,
        aantalVragen: valideerAantalVragen(geselecteerd, staat.aantalVragen)
      };
    case "SET_MODUS":
      return { ...staat, modus: actie.waarde };
    case "SET_OPERATIES":
      return { ...staat, operaties: actie.waarde };
    case "SET_BEREIK":
      return { ...staat, bereik: actie.waarde };
    case "SET_CORRECTIE":
      return { ...staat, correctie: actie.waarde };
    case "SET_AANTAL":
      // Directe controle bij het handmatig instellen
      return { ...staat, aantalVragen: valideerAantalVragen(staat.geselecteerdeTafels, actie.waarde) };
    default:
      return staat;
  }
}

export { initiëleStaat, reducer };
