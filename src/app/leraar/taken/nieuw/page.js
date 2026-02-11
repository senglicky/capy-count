'use client';

import { useReducer, useState, useEffect } from 'react';
import { initiëleStaat, reducer } from '@/app/state';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import TestSettings from '@/components/TestSettings';

export default function NieuweTaak() {
    const [staat, dispatch] = useReducer(reducer, initiëleStaat);
    const [klassen, setKlassen] = useState([]);
    const [geselecteerdeKlas, setGeselecteerdeKlas] = useState('');
    const [titel, setTitel] = useState('');
    const [laden, setLaden] = useState(true);
    const [opslaanLaden, setOpslaanLaden] = useState(false);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            router.push('/login');
            return;
        }
        const u = JSON.parse(savedUser);
        if (u.rol !== 'leraar') {
            router.push('/login');
            return;
        }
        setUser(u);

        // Klassen van de leraar ophalen
        const { data: leraarKlassen } = await supabase
            .from('leraar_klassen')
            .select('klassen(*)')
            .eq('leraar_id', u.id);

        const kList = leraarKlassen?.map(lk => lk.klassen) || [];
        setKlassen(kList);
        if (kList.length > 0) setGeselecteerdeKlas(kList[0].id);
        setLaden(false);
    };

    const genereerVragenLijst = () => {
        const vragen = [];
        const tafels = staat.geselecteerdeTafels;
        const operaties = staat.operaties;
        const bereik = staat.bereik;
        const aantal = staat.aantalVragen;

        for (let i = 0; i < aantal; i++) {
            const tafel = tafels[Math.floor(Math.random() * tafels.length)];
            const getal = Math.floor(Math.random() * bereik) + 1;
            const isDeel = operaties === 'beide' && Math.random() > 0.5;

            let vraagTekst = '';
            let correctAntwoord = 0;
            let type = '';

            if (isDeel) {
                const product = tafel * getal;
                vraagTekst = `${product} : ${tafel}`;
                correctAntwoord = getal;
                type = 'deel';
            } else {
                vraagTekst = `${getal} x ${tafel}`;
                correctAntwoord = getal * tafel;
                type = 'maal';
            }
            vragen.push({ vraag: vraagTekst, antwoord: correctAntwoord, type });
        }
        return vragen;
    };

    const slaOp = async () => {
        if (!titel) {
            alert('Geef de toets een titel!');
            return;
        }
        if (staat.geselecteerdeTafels.length === 0) {
            alert('Kies minstens één tafel!');
            return;
        }

        setOpslaanLaden(true);
        const vragenlijst = genereerVragenLijst();

        const { error } = await supabase.from('taken').insert({
            leraar_id: user.id,
            klas_id: geselecteerdeKlas,
            titel: titel,
            instellingen: staat,
            vragen: vragenlijst
        });

        if (error) {
            alert('Fout bij opslaan: ' + error.message);
        } else {
            router.push('/leraar/taken');
        }
        setOpslaanLaden(false);
    };

    const genereerPDF = () => {
        if (staat.geselecteerdeTafels.length === 0) {
            alert('Kies eerst de tafels!');
            return;
        }

        // Genereer vragen voor PDF (deze kunnen tijdelijk verschillen van opslaan als niet eerst opgeslagen)
        // Maar we gebruiken dezelfde logica. Tip: we zouden eigenlijk de opgeslagen vragen moeten gebruiken
        // als de taak al bestaat, maar hier is het voor een nieuwe taak.
        const vragen = genereerVragenLijst();

        // Open print window
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
                        <p style="color: red; font-weight: bold;">LET OP: Deze vragen zijn voor eenmalig printen. Sla de toets op om dezelfde vragen digitaal aan de leerlingen te geven.</p>
                        <button onclick="window.print()" style="padding: 10px 20px; cursor: pointer;">Printen / Opslaan als PDF</button>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => router.push('/leraar/taken')}><ArrowLeft size={18} /></button>
                    <h1 style={{ margin: 0 }}>Nieuwe Toets</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={genereerPDF}>
                        <FileText size={18} style={{ marginRight: '0.5rem' }} /> PDF / Print
                    </button>
                    <button className="btn btn-primary" onClick={slaOp} disabled={opslaanLaden}>
                        <Save size={18} style={{ marginRight: '0.5rem' }} /> {opslaanLaden ? 'Bezig...' : 'Opslaan'}
                    </button>
                </div>
            </header>

            <main className="card">
                <section className="section">
                    <label className="section-title">Titel van de toets</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Bijv: Weektoets Tafels 2, 5 en 10"
                        value={titel}
                        onChange={(e) => setTitel(e.target.value)}
                    />
                </section>

                <section className="section">
                    <label className="section-title">Voor welke klas?</label>
                    <select
                        className="input-field"
                        value={geselecteerdeKlas}
                        onChange={(e) => setGeselecteerdeKlas(e.target.value)}
                    >
                        {klassen.map(k => (
                            <option key={k.id} value={k.id}>{k.naam}</option>
                        ))}
                    </select>
                </section>

                <TestSettings staat={staat} dispatch={dispatch} />
            </main>
        </div>
    );
}
