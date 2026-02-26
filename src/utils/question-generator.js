/**
 * Genereert een lijst met unieke maaltafels en deeltafels vragen.
 * Gebruikt een shuffle-algoritme voor optimale verdeling en gegarandeerde uniekheid.
 */
export const genereerVragenLijst = (instellingen) => {
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

    // Retourneer gevraagde aantal (of minder als er niet genoeg unieke vragen zijn)
    return geshuffeld.slice(0, aantalVragen);
};
