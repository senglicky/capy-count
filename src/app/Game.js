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

    // Prevent body scroll when game is active
    useEffect(() => {
        document.body.classList.add('no-scroll');
        return () => document.body.classList.remove('no-scroll');
    }, []);

    if (status === 'laden') return <div className="game-layout"><h1>Laden...</h1></div>;

    if (status === 'resultaten') {
        return (
            <div className="game-layout" style={{ overflowY: 'auto', background: '#f8fafc' }}>
                <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0.5rem 0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {JSON.parse(localStorage.getItem('user'))?.avatars?.afbeelding_url && (
                            <img
                                src={JSON.parse(localStorage.getItem('user')).avatars.afbeelding_url}
                                alt="Avatar"
                                style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid var(--primary-color)' }}
                            />
                        )}
                        <h2 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--secondary-color)' }}>Goed gedaan, {instellingen.naam}!</h2>
                    </div>
                </header>

                <main className="card" style={{ textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(87, 142, 126, 0.05)', padding: '1.5rem 3rem', borderRadius: '30px', border: '2px solid rgba(87, 142, 126, 0.1)' }}>
                            <img src="/cappycoin.png" alt="Cappy" style={{ width: '40px', height: '40px' }} />
                            <div style={{ textAlign: 'left' }}>
                                <span style={{ display: 'block', fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>Je verdiende:</span>
                                <span style={{ fontSize: '2.4rem', fontWeight: '900', color: 'var(--primary-color)' }}>+{verdiendeCappies}</span>
                            </div>
                        </div>
                        <h3 style={{ fontSize: '1.4rem', color: 'var(--text-color)', marginTop: '1rem' }}>Je score: <span style={{ color: 'var(--secondary-color)' }}>{score}</span> van de {vragen.length}</h3>
                    </div>

                    {fouten.length > 0 ? (
                        <div style={{ textAlign: 'left', maxHeight: '30vh', overflowY: 'auto', paddingRight: '0.5rem', background: 'rgba(241, 245, 249, 0.3)', padding: '1.5rem', borderRadius: '20px' }}>
                            <h3 style={{ color: 'var(--error)', fontSize: '1rem', marginBottom: '1rem' }}>Deze vonden we moeilijk:</h3>
                            <ul style={{ listStyle: 'none', padding: 0, marginTop: '0.5rem' }}>
                                {fouten.map((f, i) => (
                                    <li key={i} style={{ padding: '0.6rem 0', fontSize: '1.1rem', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{f.vraag} = <span style={{ color: 'var(--success)', fontWeight: 'bold' }}>{f.antwoord}</span></span>
                                        <span style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                                            Jouw antwoord: {f.jouwAntwoord}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div style={{ margin: '2rem 0', background: 'rgba(132, 169, 140, 0.1)', padding: '1.5rem', borderRadius: '20px' }}>
                            <h3 style={{ color: 'var(--success)', fontSize: '1.5rem', margin: 0 }}>Foutloos! Super goed gewerkt! 🌟</h3>
                        </div>
                    )}

                    <div style={{ marginTop: '2.5rem' }}>
                        <button className="btn btn-primary" style={{ padding: '1rem 3rem', fontSize: '1.4rem', borderRadius: '30px' }} onClick={opStop}>
                            Klaar
                        </button>
                    </div>
                </main>
            </div>
        );
    }

    const huidigeVraag = vragen[huidigeIndex];

    return (
        <div className="game-layout" style={{ background: 'var(--background-color)', padding: '0.5rem' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.5rem',
                padding: '0.4rem 0.8rem',
                background: '#fff',
                borderRadius: '15px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {JSON.parse(localStorage.getItem('user'))?.avatars?.afbeelding_url && (
                        <img
                            src={JSON.parse(localStorage.getItem('user')).avatars.afbeelding_url}
                            alt="Avatar"
                            style={{ width: '28px', height: '28px', borderRadius: '50%', border: '2px solid var(--primary-color)' }}
                        />
                    )}
                    <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--secondary-color)' }}>{instellingen.naam}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: '700', color: '#64748b' }}>{huidigeIndex + 1}/{vragen.length}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <p style={{ fontSize: '0.85rem', margin: 0, fontWeight: '700', color: tijd < 10 && instellingen.modus !== 'vrij' ? 'var(--error)' : 'var(--secondary-color)' }}>
                        {instellingen.modus !== 'vrij' ? `${tijd}s` : 'Vrij'}
                    </p>
                    <button
                        onClick={opStop}
                        style={{
                            background: 'rgba(229, 152, 155, 0.1)',
                            border: 'none',
                            color: 'var(--error)',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '8px',
                            fontSize: '0.75rem',
                            fontWeight: '700',
                            cursor: 'pointer'
                        }}
                    >
                        STOP
                    </button>
                </div>
            </header>

            <main className="card game-card" style={{ boxShadow: '0 15px 40px rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.02)', borderRadius: '35px', padding: '1rem' }}>
                <div style={{
                    fontSize: 'clamp(2.5rem, 12vh, 6rem)',
                    fontWeight: '800',
                    lineHeight: '1',
                    textAlign: 'center',
                    color: 'var(--text-color)',
                    letterSpacing: '-2px',
                    marginBottom: '0.5rem'
                }}>
                    {huidigeVraag.vraag}
                </div>

                <div style={{ fontSize: '1.5rem', fontWeight: '300', color: '#cbd5e1', marginBottom: '0.2rem' }}>=</div>

                <form onSubmit={valideerAntwoord} style={{ width: '100%', maxWidth: '280px' }}>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="number"
                            className="input-field"
                            style={{
                                textAlign: 'center',
                                fontSize: 'clamp(1.8rem, 7vh, 3.5rem)',
                                margin: '0',
                                padding: '0.4rem',
                                border: '3px solid #e2e8f0',
                                borderRadius: '20px',
                                background: '#f8fafc',
                                color: 'var(--secondary-color)',
                                fontWeight: '800'
                            }}
                            value={antwoord}
                            onChange={(e) => setAntwoord(e.target.value)}
                            autoFocus
                            required
                            autoComplete="off"
                            inputMode="numeric"
                        />
                    </div>
                    {foutmelding && (
                        <div style={{
                            marginTop: '0.5rem',
                            background: 'rgba(229, 152, 155, 0.1)',
                            padding: '0.5rem',
                            borderRadius: '12px',
                            border: '1px solid var(--error)',
                            animation: 'bounce 0.5s'
                        }}>
                            <p style={{ color: 'var(--error)', fontWeight: '600', textAlign: 'center', fontSize: '0.8rem', margin: 0 }}>{foutmelding}</p>
                        </div>
                    )}
                </form>

                {/* Numeriek Toetsenbord */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '0.4rem',
                    width: '100%',
                    maxWidth: '400px',
                    marginTop: '0.5rem',
                    flex: 1,
                    maxHeight: '340px',
                    minHeight: '200px'
                }}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                        <button
                            key={n}
                            type="button"
                            className="btn btn-outline"
                            style={{
                                fontSize: '2rem',
                                padding: '0',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid #e2e8f0',
                                borderRadius: '15px',
                                background: '#fff',
                                boxShadow: '0 3px 0 #e2e8f0'
                            }}
                            onClick={() => handleNumpadClick(n.toString())}
                            onMouseDown={(e) => { e.currentTarget.style.transform = 'translateY(2px)'; e.currentTarget.style.boxShadow = 'none'; }}
                            onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 3px 0 #e2e8f0'; }}
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        type="button"
                        className="btn btn-outline"
                        style={{
                            fontSize: '1.2rem',
                            fontWeight: '800',
                            color: 'var(--error)',
                            border: '2px solid rgba(229, 152, 155, 0.3)',
                            borderRadius: '20px',
                            background: 'rgba(229, 152, 155, 0.05)',
                            boxShadow: '0 4px 0 rgba(229, 152, 155, 0.1)'
                        }}
                        onClick={() => handleNumpadClick('Wis')}
                    >
                        WIS
                    </button>
                    <button
                        key={0}
                        type="button"
                        className="btn btn-outline"
                        style={{
                            fontSize: '2rem',
                            border: '2px solid #e2e8f0',
                            borderRadius: '20px',
                            background: '#fff',
                            boxShadow: '0 4px 0 #e2e8f0'
                        }}
                        onClick={() => handleNumpadClick('0')}
                    >
                        0
                    </button>
                    <button
                        type="button"
                        className="btn btn-primary"
                        style={{
                            fontSize: '1.8rem',
                            borderRadius: '20px',
                            boxShadow: '0 6px 0 #467064' // Darker sage for 3D effect
                        }}
                        onClick={() => handleNumpadClick('OK')}
                    >
                        OK
                    </button>
                </div>

                <button className="btn btn-outline" style={{ display: 'none' }} onClick={opStop}>
                    Stoppen
                </button>
            </main>
        </div>
    );
}
