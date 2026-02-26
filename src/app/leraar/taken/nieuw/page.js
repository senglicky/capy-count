'use client';

import { useReducer, useState, useEffect } from 'react';
import { initiëleStaat, reducer } from '@/app/state';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import TestSettings from '@/components/TestSettings';
import { printTaakPDFV3 } from '@/utils/pdf-generator-v3';
import { berekenMaxCappies } from '@/utils/cappy-utils';
import { genereerVragenLijstV3 } from '@/utils/question-generator-v3';

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

    const slaOp = async () => {
        if (!titel) {
            alert('Geef de taak een titel!');
            return;
        }
        if (staat.geselecteerdeTafels.length === 0) {
            alert('Kies minstens één tafel!');
            return;
        }

        setOpslaanLaden(true);
        const vragenlijst = genereerVragenLijstV3(staat);

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

        const vragen = genereerVragenLijstV3(staat);
        printTaakPDFV3(titel, vragen);
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => router.push('/leraar/taken')}><ArrowLeft size={18} /></button>
                    <h1 style={{ margin: 0 }}>Nieuwe Taak</h1>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#666', fontSize: '0.9rem' }}>
                        <span>Verdien tot:</span>
                        <img src="/cappycoin.png" alt="Cappy" style={{ width: '20px', height: '20px' }} />
                        <span style={{ fontWeight: 'bold' }}>{berekenMaxCappies(staat)}</span>
                    </div>
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
                    <label className="section-title">Titel van de taak</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Bijv: Weektaak Tafels 2, 5 en 10"
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
