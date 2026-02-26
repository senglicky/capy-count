'use client';

/**
 * Genereert en print een PDF-taak met het Capy-Count thema.
 * Layout: [Logo L]  [Titel M]  [Info R]
 */
export const printTaakPDF = (titel, vragen) => {
    if (!vragen || vragen.length === 0) {
        alert('Geen vragen gevonden voor deze taak.');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Pop-up geblokkeerd! Sta pop-ups toe voor deze site om de PDF te printen.');
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
            <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600;700;800&display=swap" rel="stylesheet">
            <style>
                /* RESET & BASE */
                * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                @page { margin: 1cm; size: A4; }
                
                body { 
                    font-family: 'Lexend', sans-serif; 
                    margin: 0;
                    padding: 30px;
                    color: #1e293b;
                    background: white;
                    line-height: 1.2;
                }

                /* HEADER - 3 Columns: L: Logo, M: Title, R: Name/Date */
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                    margin-bottom: 35px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #e2e8f0;
                }

                .header-left { flex: 1; display: flex; justify-content: flex-start; }
                .header-middle { flex: 2; display: flex; justify-content: center; text-align: center; }
                .header-right { flex: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; font-size: 0.85rem; }

                .logo { height: 45px; width: auto; object-fit: contain; }

                h1 { 
                    margin: 0; 
                    color: #578e7e; 
                    font-size: 1.4rem;
                    font-weight: 800;
                    letter-spacing: -0.01em;
                    line-height: 1.1;
                }

                .info-item { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
                .info-line { border-bottom: 1px dotted #94a3b8; width: 140px; display: inline-block; height: 1.1em; }
                
                /* GRID - Optimized for 50 questions (17 rows x 3 cols) */
                .grid { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    column-gap: 40px;
                    row-gap: 0;
                }

                .vraag { 
                    font-size: 1.1rem; 
                    padding: 7px 0;
                    border-bottom: 1px solid #f1f5f9;
                    display: flex;
                    align-items: center;
                    font-weight: 500;
                }

                .q-num { color: #94a3b8; width: 28px; font-size: 0.75rem; font-weight: 400; flex-shrink: 0; }
                .vraag-tekst { white-space: nowrap; }
                .dots { flex: 1; border-bottom: 1.5px dotted #e2e8f0; margin-left: 8px; min-width: 30px; }
                
                /* NO FOOTER */
                
                /* PREVIEW CONTROLS */
                @media print { .no-print { display: none !important; } body { padding: 0; } }
                .no-print {
                    position: fixed; top: 15px; right: 15px; z-index: 1000;
                    background: white; padding: 10px; border-radius: 12px;
                    box-shadow: 0 8px 20px rgba(0,0,0,0.1);
                }
                .print-btn {
                    background: #3d5a80; color: white; border: none; padding: 10px 20px;
                    border-radius: 8px; font-weight: 700; cursor: pointer; font-family: 'Lexend', sans-serif;
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <button class="print-btn" onclick="window.print()">Print Taak</button>
            </div>
            
            <div class="header">
                <div class="header-left">
                    <img src="${window.location.origin}/logo-master.png" class="logo" alt="Logo">
                </div>
                <div class="header-middle">
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
                        <span class="vraag-tekst">${v.vraag} = </span>
                        <span class="dots"></span>
                    </div>
                `).join('')}
            </div>

            <script>
                // Logo fallback if server isn't serving it properly
                window.onload = () => {
                   const logo = document.querySelector('.logo');
                   if (logo && !logo.complete) {
                       logo.style.visibility = 'hidden';
                   }
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};
