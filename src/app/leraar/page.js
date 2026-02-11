'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Users, BookOpen, LogOut, ChevronRight, Clock, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
    const [user, setUser] = useState(null);
    const [klassen, setKlassen] = useState([]);
    const [geselecteerdeKlas, setGeselecteerdeKlas] = useState(null);
    const [leerlingen, setLeerlingen] = useState([]);
    const [geselecteerdeLeerling, setGeselecteerdeLeerling] = useState(null);
    const [historie, setHistorie] = useState([]);
    const [weergave, setWeergave] = useState('overzicht'); // overzicht, detail
    const [overzichtData, setOverzichtData] = useState([]);
    const [laden, setLaden] = useState(true);
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

        // Gebruiker info uit DB halen voor de meest recente gegevens (zoals klassen)
        const { data: profiel } = await supabase
            .from('gebruikers')
            .select('*, leraar_klassen(klas_id, klassen(naam))')
            .eq('id', u.id)
            .single();

        if (!profiel) {
            router.push('/login');
            return;
        }

        setUser(profiel);

        // Klassen ophalen
        const { data: leraarKlassen } = await supabase
            .from('leraar_klassen')
            .select('klassen(*)')
            .eq('leraar_id', profiel.id);

        const kList = leraarKlassen?.map(lk => lk.klassen) || [];
        setKlassen(kList);
        if (kList.length > 0 && !geselecteerdeKlas) selecteerKlas(kList[0]);
        setLaden(false);
    };

    const selecteerKlas = async (klas) => {
        setLaden(true);
        setGeselecteerdeKlas(klas);
        setGeselecteerdeLeerling(null);
        setWeergave('overzicht');

        // 1. Leerlingen ophalen
        const { data: leerlingenData } = await supabase
            .from('gebruikers')
            .select('*')
            .eq('klas_id', klas.id)
            .eq('rol', 'student')
            .order('voornaam');
        setLeerlingen(leerlingenData || []);

        // 2. Oefeningen ophalen voor het overzicht
        if (leerlingenData?.length > 0) {
            const ids = leerlingenData.map(l => l.id);
            const { data: oefeningen } = await supabase
                .from('oefeningen')
                .select('student_id, score, totaal_tijd, datum, instellingen')
                .in('student_id', ids);

            // Aggregeren
            const stats = leerlingenData.map(l => {
                const studentOefeningen = oefeningen.filter(o => o.student_id === l.id);
                const totaal = studentOefeningen.length;
                const gemScore = totaal > 0 ? (studentOefeningen.reduce((sum, o) => sum + o.score, 0) / studentOefeningen.reduce((sum, o) => sum + (o.instellingen?.aantalVragen || 10), 0) * 100).toFixed(0) : 0;
                const gemTijd = totaal > 0 ? (studentOefeningen.reduce((sum, o) => sum + o.totaal_tijd, 0) / totaal).toFixed(0) : 0;
                const laatste = totaal > 0 ? new Date(Math.max(...studentOefeningen.map(o => new Date(o.datum)))).toLocaleDateString('nl-NL') : '-';

                return { ...l, totaal, gemScore, gemTijd, laatste };
            });
            setOverzichtData(stats);
        } else {
            setOverzichtData([]);
        }
        setLaden(false);
    };

    const selecteerLeerling = async (leerling) => {
        setWeergave('detail');
        setGeselecteerdeLeerling(leerling);
        const { data } = await supabase
            .from('oefeningen')
            .select('*, taken(titel)')
            .eq('student_id', leerling.id)
            .order('datum', { ascending: false });
        setHistorie(data || []);
    };

    const logout = async () => {
        localStorage.removeItem('user');
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    return (
        <div className="container" style={{ maxWidth: '1200px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Capy-Count</h2>
                    <h1 style={{ margin: 0 }}>Leraar Dashboard</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-primary" onClick={() => router.push('/leraar/taken')}>
                        <BookOpen size={18} style={{ marginRight: '0.5rem' }} /> Toetsen Beheren
                    </button>
                    <span>Welkom, <strong>{user?.voornaam}</strong></span>
                    <button className="btn btn-outline" onClick={logout}><LogOut size={18} /></button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }}>
                {/* Zijbalk: Klassen & Leerlingen */}
                <aside>
                    <div className="card" style={{ padding: '1rem' }}>
                        <h3>Mijn Klassen</h3>
                        <div className="option-group" style={{ flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                            {klassen.map(k => (
                                <button
                                    key={k.id}
                                    className={`btn ${geselecteerdeKlas?.id === k.id ? 'btn-primary' : 'btn-outline'}`}
                                    style={{ width: '100%', textAlign: 'left' }}
                                    onClick={() => selecteerKlas(k)}
                                >
                                    {k.naam}
                                </button>
                            ))}
                        </div>

                        <h3 style={{ marginTop: '2rem' }}>Leerlingen ({geselecteerdeKlas?.naam})</h3>
                        <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                            {leerlingen.map(l => (
                                <li
                                    key={l.id}
                                    onClick={() => selecteerLeerling(l)}
                                    style={{
                                        padding: '0.8rem',
                                        cursor: 'pointer',
                                        borderRadius: '10px',
                                        background: geselecteerdeLeerling?.id === l.id ? '#eee' : 'transparent',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center'
                                    }}
                                >
                                    <span>{l.voornaam} {l.naam}</span>
                                    <ChevronRight size={16} color="#ccc" />
                                </li>
                            ))}
                        </ul>
                    </div>
                </aside>

                {/* Hoofdsectie: Overzicht of Detail */}
                <main>
                    {weergave === 'overzicht' ? (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                                <h2>Overzicht van {geselecteerdeKlas?.naam}</h2>
                                <span style={{ padding: '0.4rem 0.8rem', background: 'rgba(14, 165, 233, 0.1)', color: 'var(--secondary-color)', borderRadius: '20px', fontSize: '0.8rem' }}>
                                    {leerlingen.length} leerlingen
                                </span>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                        <th style={{ padding: '1rem' }}>Leerling</th>
                                        <th style={{ padding: '1rem' }}># Oef.</th>
                                        <th style={{ padding: '1rem' }}>Gem. Score</th>
                                        <th style={{ padding: '1rem' }}>Gem. Tijd</th>
                                        <th style={{ padding: '1rem' }}>Laatst</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overzichtData.map(l => (
                                        <tr key={l.id} style={{ borderBottom: '1px solid #eee' }}>
                                            <td style={{ padding: '1rem' }}>
                                                <strong>{l.voornaam} {l.naam}</strong>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{l.totaal}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <span style={{
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '5px',
                                                    background: l.totaal > 0 ? (l.gemScore > 80 ? 'rgba(132, 204, 22, 0.15)' : l.gemScore > 50 ? 'rgba(180, 141, 108, 0.15)' : 'rgba(239, 68, 68, 0.15)') : 'transparent',
                                                    color: l.totaal > 0 ? (l.gemScore > 80 ? '#166534' : l.gemScore > 50 ? '#854d0e' : '#991b1b') : '#999'
                                                }}>
                                                    {l.totaal > 0 ? `${l.gemScore}%` : '-'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '1rem' }}>{l.totaal > 0 ? `${l.gemTijd}s` : '-'}</td>
                                            <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#666' }}>{l.laatste}</td>
                                            <td style={{ padding: '1rem' }}>
                                                <button onClick={() => selecteerLeerling(l)} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                                                    Historie
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : geselecteerdeLeerling ? (
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <button onClick={() => setWeergave('overzicht')} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>←</button>
                                <h2 style={{ margin: 0 }}>Resultaten van {geselecteerdeLeerling.voornaam}</h2>
                            </div>

                            {historie.length === 0 ? (
                                <p style={{ marginTop: '2rem' }}>Nog geen oefeningen gemaakt.</p>
                            ) : (
                                <div style={{ marginTop: '2rem' }}>
                                    {historie.map(oef => (
                                        <div key={oef.id} className="card" style={{ marginBottom: '1rem', border: '1px solid #eee', background: '#fafafa' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div>
                                                    <p style={{ fontSize: '0.9rem', color: '#666' }}>{new Date(oef.datum).toLocaleString('nl-NL')}</p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                        <p style={{ fontSize: '1.2rem', fontWeight: 'bold', margin: 0 }}>Score: {oef.score} / {oef.instellingen.aantalVragen}</p>
                                                        {oef.taken && (
                                                            <span style={{ padding: '0.2rem 0.5rem', background: 'var(--primary-color)', color: 'white', borderRadius: '4px', fontSize: '0.75rem' }}>
                                                                Toets: {oef.taken.titel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <p style={{ fontSize: '0.9rem' }}><Clock size={14} /> {oef.totaal_tijd}s</p>
                                                    <p style={{ fontSize: '0.9rem' }}><Target size={14} /> {oef.instellingen.operaties === 'maal' ? 'Alleen x' : 'x en ÷'}</p>
                                                </div>
                                            </div>

                                            <div style={{
                                                marginTop: '1rem',
                                                padding: '0.6rem',
                                                background: '#fff',
                                                borderRadius: '8px',
                                                fontSize: '0.85rem',
                                                display: 'flex',
                                                flexWrap: 'wrap',
                                                gap: '0.8rem',
                                                border: '1px solid #eee'
                                            }}>
                                                <span><strong>Tafels:</strong> {oef.instellingen.geselecteerdeTafels?.join(', ')}</span>
                                                <span><strong>Bereik:</strong> tot x{oef.instellingen.bereik}</span>
                                                <span><strong>Modus:</strong> {oef.instellingen.modus}</span>
                                                <span><strong>Correctie:</strong> {oef.instellingen.correctie === 'direct' ? 'Direct' : 'Einde'}</span>
                                            </div>

                                            <ExerciseDetails id={oef.id} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                            <BarChart size={64} color="#ccc" style={{ marginBottom: '1rem' }} />
                            <p>Selecteer een leerling of klas om de resultaten te bekijken.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

function ExerciseDetails({ id }) {
    const [details, setDetails] = useState([]);
    const [open, setOpen] = useState(false);

    const haalDetails = async () => {
        if (open) {
            setOpen(false);
            return;
        }
        const { data } = await supabase.from('vraag_resultaten').select('*').eq('oefening_id', id);
        setDetails(data || []);
        setOpen(true);
    };

    return (
        <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }} onClick={haalDetails}>
                {open ? 'Details verbergen' : 'Bekijk details'}
            </button>
            {open && (
                <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                            <th style={{ padding: '0.5rem' }}>Vraag</th>
                            <th style={{ padding: '0.5rem' }}>Antwoord</th>
                            <th style={{ padding: '0.5rem' }}>Pogingen</th>
                            <th style={{ padding: '0.5rem' }}>Tijd</th>
                        </tr>
                    </thead>
                    <tbody>
                        {details.map(d => (
                            <tr key={d.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '0.5rem' }}>{d.vraag}</td>
                                <td style={{ padding: '0.5rem', color: d.is_correct ? 'var(--success)' : 'var(--error)' }}>
                                    {d.antwoord_gegeven} {d.is_correct ? '✓' : '✗'}
                                </td>
                                <td style={{ padding: '0.5rem' }}>{d.pogingen}</td>
                                <td style={{ padding: '0.5rem' }}>{(d.tijd_ms / 1000).toFixed(1)}s</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}
