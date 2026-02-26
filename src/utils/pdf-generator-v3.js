'use client';

/**
 * VERSION 3.1 - PDF Generator (REVERTED)
 * Layout: [Logo L]      [Titel M (gecentreerd)]      [Info R (naam/datum)]
 * Inclusief 1s render-vertraging voor fonts/logo.
 */
export const printTaakPDFV3 = (titel, vragen) => {
    if (!vragen || vragen.length === 0) {
        alert('Geen vragen gevonden voor deze taak (v3.1).');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up geblokkeerd! Sta pop-ups toe om de PDF te zien.');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html lang="nl">
        <head>
            <meta charset="UTF-8">
            <title>${titel || 'Maaltafels Taak'}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;500;600;700;800&display=swap" rel="stylesheet">
            <style>
                * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                
                @page { 
                    margin: 0; /* Verbergt browser kop- en voetteksten (URL, datum, etc.) */
                }
                
                body { 
                    font-family: 'Lexend', sans-serif; 
                    margin: 0;
                    padding: 2cm 1.5cm; /* Ruimere margens voor een betere look */
                    color: #1e293b;
                    background: white;
                    line-height: 1.2;
                }

                /* HEADER - Left: Logo+Title, Right: Name/Date */
                .header { 
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px; /* Meer ruimte onder header */
                    padding-bottom: 20px;
                    border-bottom: 3px solid #578e7e; /* Sage Green dikke lijn */
                }

                .header-left { 
                    display: flex; 
                    align-items: center; 
                    flex: 1; /* Allow title to take most of the space */
                    margin-right: 20px;
                }
                
                .header-right { 
                    display: flex; 
                    flex-direction: column; 
                    align-items: flex-end; 
                    gap: 8px; 
                    font-size: 0.9rem;
                    white-space: nowrap; /* Prevent info labels from wrapping */
                }

                .logo { height: 48px; width: auto; flex-shrink: 0; }

                h1 { 
                    margin: 0 0 0 20px; 
                    color: #578e7e; 
                    font-size: 1.6rem;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    line-height: 1.1;
                }

                .info-item { display: flex; align-items: center; gap: 8px; }
                .info-line { border-bottom: 1.5px dotted #94a3b8; width: 160px; display: inline-block; height: 1.1em; }
                
                /* GRID - Optimized for 50 questions */
                .grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    column-gap: 40px;
                    row-gap: 5px;
                }

                .vraag { 
                    font-size: 1.15rem; 
                    padding: 8px 0;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    font-weight: 500;
                }

                .q-num { color: #94a3b8; width: 30px; font-size: 0.8rem; font-weight: 400; flex-shrink: 0; }
                .dots { flex: 1; border-bottom: 2px dotted #e2e8f0; margin-left: 10px; min-width: 40px; }

                @media print { .no-print { display: none !important; } body { padding: 0; } }
                
                .no-print {
                    position: fixed; 
                    top: 50%; 
                    left: 50%; 
                    transform: translate(-50%, -50%); 
                    z-index: 1000;
                    background: white; 
                    padding: 25px 40px; 
                    border-radius: 16px;
                    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
                    text-align: center;
                    border: 3px solid #578e7e;
                }
                
                .loading-msg { color: #578e7e; font-weight: bold; margin-bottom: 15px; font-size: 1rem; }
                
                .print-btn {
                    background: #578e7e; color: white; border: none; padding: 14px 28px;
                    border-radius: 10px; font-weight: 700; cursor: pointer; font-family: 'Lexend', sans-serif;
                    font-size: 1.1rem;
                    transition: transform 0.2s;
                }
                .print-btn:hover { transform: scale(1.05); }
            </style>
        </head>
        <body>
            <div class="no-print">
                <div class="loading-msg">Document is klaar! ✨</div>
                <div style="font-size: 0.8rem; color: #64748b; margin-bottom: 15px;">
                    Tip: Vink "Achtergrondbeelden" aan in de printinstellingen voor het beste resultaat.
                </div>
                <button class="print-btn" onclick="window.print()">BEKIJK / PRINT PDF</button>
            </div>
            
            <div class="header">
                <div class="header-left">
                    <img src="${window.location.origin}/logo-master.png" class="logo" alt="Logo">
                    <h1>${titel || 'Maaltafels Taak'}</h1>
                </div>
                <div class="header-right">
                    <div class="info-item"><strong>Naam:</strong> <span class="info-line"></span></div>
                    <div class="info-item"><strong>Datum:</strong> <span class="info-line"></span></div>
                </div>
            </div>

            <div class="grid">
                ${vragen.map((v, i) => `
                    <div class="vraag">
                        <span class="q-num">${i + 1}.</span>
                        <span>${v.vraag} = </span>
                        <span class="dots"></span>
                    </div>
                `).join('')}
            </div>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);

    // Wacht 1 seconde zodat fonts en logo's geladen kunnen worden
    setTimeout(() => {
        printWindow.document.close();
        console.log("PDF v3.1 geladen en klaar om te printen (revert).");
    }, 1000);
};
