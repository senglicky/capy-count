/**
 * VERSION 3.0 - Guaranteed Unique Question Generator
 * Gebruikt Fisher-Yates shuffle voor 100% uniekheid.
 */
export const genereerVragenLijstV3 = (instellingen) => {
    console.log("VragenLijstV3 aanroepen met:", instellingen);
    const { geselecteerdeTafels, operaties, bereik, aantalVragen } = instellingen;
    const alleMogelijkeVragen = [];
    const seen = new Set();

    if (!geselecteerdeTafels || geselecteerdeTafels.length === 0) return [];

    geselecteerdeTafels.forEach(tafel => {
        for (let getal = 1; getal <= bereik; getal++) {
            // Maal vragen
            if (operaties === 'maal' || operaties === 'beide') {
                const v = `${getal} x ${tafel}`;
                if (!seen.has(v)) {
                    seen.add(v);
                    alleMogelijkeVragen.push({
                        vraag: v,
                        antwoord: getal * tafel,
                        type: 'maal'
                    });
                }
            }

            // Deel vragen
            if (operaties === 'deel' || operaties === 'beide') {
                const product = tafel * getal;
                const v = `${product} : ${tafel}`;
                if (!seen.has(v)) {
                    seen.add(v);
                    alleMogelijkeVragen.push({
                        vraag: v,
                        antwoord: getal,
                        type: 'deel'
                    });
                }
            }
        }
    });

    // Fisher-Yates Shuffle
    const geshuffeld = [...alleMogelijkeVragen];
    for (let i = geshuffeld.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [geshuffeld[i], geshuffeld[j]] = [geshuffeld[j], geshuffeld[i]];
    }

    const resultaat = geshuffeld.slice(0, aantalVragen);
    console.log(`Gegenereerd: ${resultaat.length} unieke vragen (v3)`);
    return resultaat;
};
