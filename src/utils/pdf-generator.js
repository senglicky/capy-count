'use client';

export const printTaakPDF = (titel, vragen) => {
    if (!vragen || vragen.length === 0) {
        alert('Geen vragen gevonden voor deze taak.');
        return;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <html>
            <head>
                <title>${titel || 'Maaltafels Toets'}</title>
                <style>
                    body { font-family: sans-serif; padding: 40px; }
                    h1 { text-align: center; color: #333; }
                    .info { margin-bottom: 30px; border-bottom: 2px solid #eee; padding-bottom: 10px; }
                    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
                    .vraag { font-size: 1.2rem; padding: 5px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <h1>${titel || 'Maaltafels Toets'}</h1>
                <div class="info">
                    <p><strong>Naam:</strong> ......................................................</p>
                    <p><strong>Datum:</strong> .....................................................</p>
                </div>
                <div class="grid">
                    ${vragen.map(v => `<div class="vraag">${v.vraag} = ......</div>`).join('')}
                </div>
                <div class="no-print" style="margin-top: 50px; text-align: center;">
                    <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Printen / Opslaan als PDF</button>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
};
