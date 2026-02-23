/**
 * Bereken het maximale aantal cappies dat verdiend kan worden op basis van de test instellingen.
 */
export const berekenMaxCappies = (instellingen) => {
    let totaal = 0;

    // Aantal tafels: +1 per tafel
    totaal += (instellingen.geselecteerdeTafels?.length || 0);

    // Operaties: +5 indien ook delen
    if (instellingen.operaties === 'beide') {
        totaal += 5;
    }

    // Modus (Tijd): 30s (+3), 1m (+2), 2m (+1), vrij (0)
    if (instellingen.modus === '30s') totaal += 3;
    else if (instellingen.modus === '1m') totaal += 2;
    else if (instellingen.modus === '2m') totaal += 1;

    // Bereik: +5 indien tot 20
    if (instellingen.bereik === 20) {
        totaal += 5;
    }

    // Correctie: +5 indien aan het einde
    if (instellingen.correctie === 'einde') {
        totaal += 5;
    }

    // Aantal vragen: 20 (+2), 30 (+3), 50 (+7)
    if (instellingen.aantalVragen === 20) totaal += 2;
    else if (instellingen.aantalVragen === 30) totaal += 3;
    else if (instellingen.aantalVragen === 50) totaal += 7;

    return Math.min(35, totaal);
};

/**
 * Bereken de verdiende cappies aan het einde van een sessie.
 */
export const berekenVerdiendeCappies = (maxCappies, aantalCorrect, totaalVragen, aantalFouten) => {
    if (aantalCorrect === 0) return 0;

    // Aantal niet-beantwoorde vragen
    const onvoltooid = totaalVragen - (aantalCorrect + aantalFouten);

    // Start met de max cappies en trek strafpunten af
    // Elke fout kosh 1 cappy, elke onvoltooide vraag kost 1 cappy
    let verdiend = maxCappies - aantalFouten - onvoltooid;

    return Math.max(0, verdiend);
};
