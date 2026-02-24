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
  switch (actie.type) {
    case "SET_NAAM":
      return { ...staat, naam: actie.waarde };
    case "TOGGLE_TAFEL":
      const tafels = staat.geselecteerdeTafels.includes(actie.waarde)
        ? staat.geselecteerdeTafels.filter((t) => t !== actie.waarde)
        : [...staat.geselecteerdeTafels, actie.waarde];
      return { ...staat, geselecteerdeTafels: tafels.sort((a, b) => a - b) };
    case "SELECT_ALLE_TAFELS":
      const alleTafels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const zijnAllemaalGeselecteerd = staat.geselecteerdeTafels.length === alleTafels.length;
      return {
        ...staat,
        geselecteerdeTafels: zijnAllemaalGeselecteerd ? [] : alleTafels
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
      return { ...staat, aantalVragen: actie.waarde };
    default:
      return staat;
  }
}

export { initiëleStaat, reducer };
