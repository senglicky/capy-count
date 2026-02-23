'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { berekenMaxCappies, berekenVerdiendeCappies } from '@/utils/cappy-utils';

export default function Game({ instellingen, opStop }) {
    const [vragen, setVragen] = useState([]);
    const [huidigeIndex, setHuidigeIndex] = useState(0);
    const [antwoord, setAntwoord] = useState('');
    const [foutmelding, setFoutmelding] = useState('');
    const [score, setScore] = useState(0);
    const [fouten, setFouten] = useState([]);
    const [status, setStatus] = useState('laden'); // laden, spelen, resultaten
    const [tijd, setTijd] = useState(0);
    const [isTweedeKans, setIsTweedeKans] = useState(false);
    const [vraagStartTime, setVraagStartTime] = useState(Date.now());
    const [vraagResultaten, setVraagResultaten] = useState([]);
    const [bezigMetOpslaan, setBezigMetOpslaan] = useState(false);
    const [verdiendeCappies, setVerdiendeCappies] = useState(0);

    const timerRef = useRef(null);
    const sessionStartTime = useRef(Date.now());

    // Vragen genereren bij de start
    useEffect(() => {
        if (instellingen.vragen && instellingen.vragen.length > 0) {
            // Gebruik de vragen die de leraar heeft klaargezet
            setVragen(instellingen.vragen);
        } else {
            // Genereer willekeurige vragen (vrije oefening)
            const nieuweVragen = [];
            const deTafels = instellingen.geselecteerdeTafels;

            for (let i = 0; i < instellingen.aantalVragen; i++) {
                const tafel = deTafels[Math.floor(Math.random() * deTafels.length)];
                const vermenigvuldiger = Math.floor(Math.random() * instellingen.bereik) + 1;

                let type = instellingen.operaties === 'beide'
                    ? (Math.random() > 0.5 ? 'maal' : 'deel')
                    : instellingen.operaties;

                let vraagTekst = '';
                let correctAntwoord = 0;

                if (type === 'maal') {
                    vraagTekst = `${vermenigvuldiger} x ${tafel}`;
                    correctAntwoord = vermenigvuldiger * tafel;
                } else {
                    const product = vermenigvuldiger * tafel;
                    vraagTekst = `${product} : ${tafel}`;
                    correctAntwoord = vermenigvuldiger;
                }

                nieuweVragen.push({ vraag: vraagTekst, antwoord: correctAntwoord, type });
            }
            setVragen(nieuweVragen);
        }

        setStatus('spelen');
        setVraagStartTime(Date.now());

        // Timer initialiseren
        if (instellingen.modus !== 'vrij') {
            const seconden = instellingen.modus === '30s' ? 30 : (instellingen.modus === '1m' ? 60 : 120);
            setTijd(seconden);
        }
    }, [instellingen]);

    // Timer effect
    useEffect(() => {
        if (status === 'spelen' && instellingen.modus !== 'vrij' && tijd > 0) {
            timerRef.current = setInterval(() => {
                setTijd((t) => {
                    if (t <= 1) {
                        clearInterval(timerRef.current);
                        afronden();
                        return 0;
                    }
                    return t - 1;
                });
            }, 1000);
        }

        return () => clearInterval(timerRef.current);
    }, [status, instellingen.modus, tijd]);

    const valideerAntwoord = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        const huidig = vragen[huidigeIndex];
        const ingevoerd = parseInt(antwoord);
        const nu = Date.now();
        const tijdMs = nu - vraagStartTime;

        const resultaat = {
            vraag: huidig.vraag,
            antwoord_gegeven: antwoord,
            tijd_ms: tijdMs,
            pogingen: isTweedeKans ? 2 : 1,
            is_correct: ingevoerd === huidig.antwoord
        };

        if (ingevoerd === huidig.antwoord) {
            // Goed antwoord
            setScore(s => s + 1);
            const nieuweResultaten = [...vraagResultaten, resultaat];
            setVraagResultaten(nieuweResultaten);
            verderNaarVolgende(nieuweResultaten, score + 1);
        } else {
            // Fout antwoord
            if (instellingen.correctie === 'direct' && !isTweedeKans) {
                setFoutmelding('Niet helemaal goed. Probeer het nog een keer!');
                setIsTweedeKans(true);
                setAntwoord('');
            } else {
                // Definitief fout
                setFouten([...fouten, { ...huidig, jouwAntwoord: antwoord }]);
                const nieuweResultaten = [...vraagResultaten, resultaat];
                setVraagResultaten(nieuweResultaten);
                verderNaarVolgende(nieuweResultaten, score);
            }
        }
    };

    const handleNumpadClick = (val) => {
        if (val === 'Wis') {
            setAntwoord('');
        } else if (val === 'OK') {
            if (antwoord !== '') {
                valideerAntwoord();
            }
        } else {
            // Voorkom extreem lange invoer
            if (antwoord.length < 5) {
                setAntwoord(prev => prev + val);
            }
        }
    };

    const verderNaarVolgende = (nieuweResultaten, actueleScore) => {
        setAntwoord('');
        setFoutmelding('');
        setIsTweedeKans(false);
        setVraagStartTime(Date.now());

        if (huidigeIndex + 1 < vragen.length) {
            setHuidigeIndex(i => i + 1);
        } else {
            afronden(nieuweResultaten, actueleScore);
        }
    };

    const afronden = async (finaleResultaten, finaleScore) => {
        // Gebruik de huidige state als argumenten ontbreken (bv. bij timer expiry)
        const resultaten = finaleResultaten || vraagResultaten;
        const eindScore = finaleScore !== undefined ? finaleScore : score;

        setStatus('resultaten');
        clearInterval(timerRef.current);
        await slaGegevensOp(resultaten, eindScore);
    };

    const slaGegevensOp = async (finaleResultaten, finaleScore) => {
        const userJson = localStorage.getItem('user');
        if (!userJson) return;
        const studentInfo = JSON.parse(userJson);

        setBezigMetOpslaan(true);
        const totaalTijd = (Date.now() - sessionStartTime.current) / 1000;

        // Cappy berekening op basis van resultaten (vermijd stale state)
        const aantalFouten = finaleResultaten.filter(r => !r.is_correct).length;
        const aantalNietIngeleverd = vragen.length - finaleResultaten.length;
        const totaleStraf = aantalFouten + aantalNietIngeleverd;

        const maxPotentieel = berekenMaxCappies(instellingen);
        const verdiend = berekenVerdiendeCappies(
            maxPotentieel,
            finaleScore,
            vragen.length,
            totaleStraf
        );
        setVerdiendeCappies(verdiend);

        const { data: oefening, error } = await supabase.from('oefeningen').insert([{
            student_id: studentInfo.id,
            score: finaleScore,
            totaal_tijd: Math.round(totaalTijd),
            instellingen: instellingen,
            taak_id: instellingen.taakId || null,
            verdiende_cappies: verdiend
        }]).select().single();

        if (!error && oefening) {
            const resultatenMetId = finaleResultaten.map(r => ({ ...r, oefening_id: oefening.id }));
            await supabase.from('vraag_resultaten').insert(resultatenMetId);

            // Update het cappies saldo in de database
            if (verdiend > 0) {
                // Haal actuele saldo op om race conditions (enigszins) te beperken
                const { data: userData, error: userError } = await supabase
                    .from('gebruikers')
                    .select('cappies')
                    .eq('id', studentInfo.id)
                    .single();

                if (!userError && userData) {
                    const huidigSaldo = userData.cappies || 0;
                    const nieuwSaldo = huidigSaldo + verdiend;

                    const { error: updateError } = await supabase
                        .from('gebruikers')
                        .update({ cappies: nieuwSaldo })
                        .eq('id', studentInfo.id);

                    if (!updateError) {
                        // Update lokale wallet info voor instant feedback
                        const updatedUser = { ...studentInfo, cappies: nieuwSaldo };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    } else {
                        console.error('Fout bij bijwerken saldo:', updateError);
                    }
                }
            }
        }
        setBezigMetOpslaan(false);
    };

    if (status === 'laden') return <div className="container"><h1>Laden...</h1></div>;

    if (status === 'resultaten') {
        return (
            <div className="container">
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {JSON.parse(localStorage.getItem('user'))?.avatars?.afbeelding_url && (
                            <img
                                src={JSON.parse(localStorage.getItem('user')).avatars.afbeelding_url}
                                alt="Avatar"
                                style={{ width: '50px', height: '50px', borderRadius: '50%', border: '3px solid var(--primary-color)' }}
                            />
                        )}
                        <h1>Goed gedaan, {instellingen.naam}!</h1>
                    </div>
                </header>

                <main className="card">
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#f0f9ff', padding: '1.5rem 2.5rem', borderRadius: '20px', border: '2px solid var(--primary-color)' }}>
                            <img src="/cappycoin.png" alt="Cappy" style={{ width: '48px', height: '48px' }} />
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ display: 'block', fontSize: '1rem', color: '#666' }}>Je verdiende:</span>
                                <span style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--primary-color)' }}>+{verdiendeCappies}</span>
                            </div>
                        </div>
                        <h2>Je score: {score} van de {vragen.length}</h2>
                    </div>

                    {fouten.length > 0 ? (
                        <div style={{ textAlign: 'left', marginTop: '2rem' }}>
                            <h3 style={{ color: 'var(--error)' }}>Deze vonden we moeilijk:</h3>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                                {fouten.map((f, i) => (
                                    <li key={i} style={{ padding: '0.5rem', fontSize: '1.2rem', borderBottom: '1px solid #eee' }}>
                                        {f.vraag} = <span style={{ color: 'var(--success)' }}>{f.antwoord}</span>
                                        <span style={{ fontSize: '0.9rem', color: '#888', marginLeft: '1rem' }}>
                                            (Jouw antwoord: {f.jouwAntwoord})
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div style={{ marginTop: '2rem' }}>
                            <h3 style={{ color: 'var(--success)' }}>Foutloos! Super goed gewerkt!</h3>
                        </div>
                    )}

                    <div style={{ marginTop: '3rem' }}>
                        <button className="btn btn-primary" onClick={opStop}>
                            Opnieuw Spelen
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const huidigeVraag = vragen[huidigeIndex];

    return (
        <div className="container">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {JSON.parse(localStorage.getItem('user'))?.avatars?.afbeelding_url && (
                        <img
                            src={JSON.parse(localStorage.getItem('user')).avatars.afbeelding_url}
                            alt="Avatar"
                            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid var(--primary-color)' }}
                        />
                    )}
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{instellingen.naam}</p>
                </div>
                <p style={{ fontSize: '1.2rem' }}>Vraag {huidigeIndex + 1} / {vragen.length}</p>
                <p style={{ fontSize: '1.2rem', color: tijd < 10 && instellingen.modus !== 'vrij' ? 'var(--error)' : 'inherit' }}>
                    {instellingen.modus !== 'vrij' ? `Tijd: ${tijd}s` : 'Vrije oefening'}
                </p>
            </header>

            <main className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem' }}>
                <div style={{ fontSize: '4rem', fontWeight: '600' }}>
                    {huidigeVraag.vraag} = ?
                </div>

                <form onSubmit={valideerAntwoord} style={{ width: '100%', maxWidth: '300px' }}>
                    <input
                        type="number"
                        className="input-field"
                        style={{ textAlign: 'center', fontSize: '3rem' }}
                        value={antwoord}
                        onChange={(e) => setAntwoord(e.target.value)}
                        autoFocus
                        required
                        autoComplete="off"
                    />
                    {foutmelding && <p style={{ color: 'var(--error)', fontWeight: '600', marginBottom: '1rem' }}>{foutmelding}</p>}
                    <button type="submit" className="btn btn-secondary" style={{ width: '100%', fontSize: '1.5rem', display: 'none' }}>
                        Antwoord!
                    </button>
                </form>

                {/* Numeriek Toetsenbord */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '1rem',
                    width: '100%',
                    maxWidth: '350px',
                    marginTop: '1rem'
                }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button
                            key={n}
                            type="button"
                            className="btn btn-outline"
                            style={{ fontSize: '2rem', padding: '1.2rem', minHeight: '80px' }}
                            onClick={() => handleNumpadClick(n.toString())}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '1.2rem', padding: '1.2rem', color: 'var(--error)', minHeight: '80px' }}
                        onClick={() => handleNumpadClick('Wis')}
                    >
                        WIS
                    </button>
                    <button
                        key={0}
                        type="button"
                        className="btn btn-outline"
                        style={{ fontSize: '2rem', padding: '1.2rem', minHeight: '80px' }}
                        onClick={() => handleNumpadClick('0')}
                    >
                        0
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{ fontSize: '1.5rem', padding: '1.2rem', minHeight: '80px' }}
                        onClick={() => handleNumpadClick('OK')}
                    >
                        OK
                    </button>
                </div>

                <button className="btn btn-outline" style={{ marginTop: '2rem' }} onClick={opStop}>
                    Stoppen
                </button>
            </main>
        </div>
    );
}
