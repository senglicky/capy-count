'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Users, BookOpen, LogOut, ChevronRight, Clock, Target, Trash2, TrendingUp, AlertCircle, CheckCircle, XCircle, Calendar, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TeacherDashboard() {
    const [user, setUser] = useState(null);
    const [klassen, setKlassen] = useState([]);
    const [geselecteerdeKlas, setGeselecteerdeKlas] = useState(null);
    const [leerlingen, setLeerlingen] = useState([]);
    const [geselecteerdeLeerling, setGeselecteerdeLeerling] = useState(null);
    const [historie, setHistorie] = useState([]);
    const [weergave, setWeergave] = useState('overzicht'); // overzicht, detail, analyse
    const [overzichtData, setOverzichtData] = useState([]);
    const [analyseData, setAnalyseData] = useState(null);
    const [analyseBereik, setAnalyseBereik] = useState('all'); // all, 30, 7
    const [laden, setLaden] = useState(true);

    // Student Detail Analytics States
    const [studentResultaten, setStudentResultaten] = useState([]);
    const [foutenPerTafel, setFoutenPerTafel] = useState({});
    const [foutenInclusiefEersteKans, setFoutenInclusiefEersteKans] = useState({});
    const [tijdPerTafel, setTijdPerTafel] = useState({});
    const [topFouten, setTopFouten] = useState([]);
    const [tweedeKansStats, setTweedeKansStats] = useState({ totaal: 0, succes: 0 });
    const [detailFilterBereik, setDetailFilterBereik] = useState('all'); // all, 30, 7
    const [alleStudentHistorie, setAlleStudentHistorie] = useState([]);
    const [alleStudentResultaten, setAlleStudentResultaten] = useState([]);

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
            .select('*, leraar_klassen(klas_id)')
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

    const selecteerLeerling = async (leerling, range = 'all') => {
        setWeergave('detail');
        setGeselecteerdeLeerling(leerling);
        setLaden(true);

        // 1. Oefeningen ophalen
        const { data: oefeningen } = await supabase
            .from('oefeningen')
            .select('*, taken(titel)')
            .eq('student_id', leerling.id)
            .order('datum', { ascending: false });
        setAlleStudentHistorie(oefeningen || []);

        // 2. Vraag resultaten ophalen voor analyse
        const { data: resultaten } = await supabase
            .from('vraag_resultaten')
            .select('*')
            .in('oefening_id', oefeningen?.map(o => o.id) || []);

        setAlleStudentResultaten(resultaten || []);
        filterEnAnalyseerStudent(oefeningen || [], resultaten || [], range);
        setLaden(false);
    };

    const filterEnAnalyseerStudent = (oefs, res, range) => {
        let gefilterdeOefs = [...oefs];
        if (range === '30' || range === '7') {
            const dagen = parseInt(range);
            const grens = new Date();
            grens.setDate(grens.getDate() - dagen);
            gefilterdeOefs = oefs.filter(o => new Date(o.datum) >= grens);
        }
        setHistorie(gefilterdeOefs);

        const oefIds = gefilterdeOefs.map(o => o.id);
        const gefilterdeRes = res.filter(r => oefIds.includes(r.oefening_id));
        setStudentResultaten(gefilterdeRes);
        analyseerStudentData(gefilterdeRes);
    };

    const wijzigDetailFilter = (range) => {
        setDetailFilterBereik(range);
        filterEnAnalyseerStudent(alleStudentHistorie, alleStudentResultaten, range);
    };

    const analyseerStudentData = (data) => {
        const fouten = {};
        const foutenInclusief = {};
        const tijden = {};
        const vraagFrequenties = {};
        let tkTotaal = 0;
        let tkSucces = 0;

        data.forEach(item => {
            const onderdelen = item.vraag.split(' ');
            const tafel = onderdelen[2];

            if (tafel) {
                // Fouten tellen (alleen uiteindelijke fouten)
                if (!item.is_correct) {
                    fouten[tafel] = (fouten[tafel] || 0) + 1;
                    vraagFrequenties[item.vraag] = (vraagFrequenties[item.vraag] || 0) + 1;
                }

                // Inclusief eerste kans fouten
                if (!item.is_correct || item.pogingen === 2) {
                    foutenInclusief[tafel] = (foutenInclusief[tafel] || 0) + 1;
                }

                if (!tijden[tafel]) tijden[tafel] = { totaal: 0, aantal: 0 };
                tijden[tafel].totaal += item.tijd_ms || 0;
                tijden[tafel].aantal += 1;
            }

            if (item.pogingen === 2) {
                tkTotaal++;
                if (item.is_correct) tkSucces++;
            }
        });

        const gemiddeldeTijden = {};
        Object.keys(tijden).forEach(tafel => {
            gemiddeldeTijden[tafel] = (tijden[tafel].totaal / tijden[tafel].aantal / 1000).toFixed(1);
        });

        const gesorteerdeFouten = Object.entries(vraagFrequenties)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([vraag, aantal]) => ({ vraag, aantal }));

        setFoutenPerTafel(fouten);
        setFoutenInclusiefEersteKans(foutenInclusief);
        setTijdPerTafel(gemiddeldeTijden);
        setTopFouten(gesorteerdeFouten);
        setTweedeKansStats({ totaal: tkTotaal, succes: tkSucces });
    };

    const laadAnalyse = async (range = analyseBereik) => {
        if (!geselecteerdeKlas || leerlingen.length === 0) return;
        setLaden(true);
        setWeergave('analyse');
        setAnalyseBereik(range);

        const leerlingIds = leerlingen.map(l => l.id);

        // 1. Haal oefeningen op met tijdfilter
        let query = supabase
            .from('oefeningen')
            .select('id, student_id, score, instellingen')
            .in('student_id', leerlingIds);

        if (range === '30' || range === '7') {
            const dagen = parseInt(range);
            const datumGrens = new Date();
            datumGrens.setDate(datumGrens.getDate() - dagen);
            query = query.gte('datum', datumGrens.toISOString());
        }

        const { data: oefeningen } = await query;
        const oefeningIds = oefeningen?.map(o => o.id) || [];

        // 2. Haal vraag resultaten op voor de gevonden oefeningen
        let resultaten = [];
        if (oefeningIds.length > 0) {
            const { data: resData } = await supabase
                .from('vraag_resultaten')
                .select('*, oefeningen(student_id)')
                .in('oefening_id', oefeningIds);
            resultaten = resData || [];
        }

        // Verwerk data
        const tafelStats = {};
        const studentStats = {};

        leerlingen.forEach(l => {
            studentStats[l.id] = {
                id: l.id,
                naam: `${l.voornaam} ${l.naam}`,
                totaalScore: 0,
                vragen: 0,
                cappies: l.cappies || 0
            };
        });

        oefeningen?.forEach(o => {
            if (studentStats[o.student_id]) {
                studentStats[o.student_id].totaalScore += o.score;
                studentStats[o.student_id].vragen += (o.instellingen?.aantalVragen || 10);
            }
        });

        resultaten?.forEach(r => {
            const onderdelen = r.vraag.split(' ');
            const tafel = onderdelen[2];
            if (!tafel) return;

            if (!tafelStats[tafel]) {
                tafelStats[tafel] = { tafel, fouten: 0, foutenInclusief: 0, totaalTijd: 0, aantal: 0, correct: 0 };
            }

            tafelStats[tafel].aantal++;
            tafelStats[tafel].totaalTijd += (r.tijd_ms || 0);
            if (r.is_correct) {
                tafelStats[tafel].correct++;
                if (r.pogingen === 2) {
                    tafelStats[tafel].foutenInclusief++;
                }
            } else {
                tafelStats[tafel].fouten++;
                tafelStats[tafel].foutenInclusief++;
            }
        });

        const studentRanking = Object.values(studentStats)
            .map(s => ({
                ...s,
                percentage: s.vragen > 0 ? Math.round((s.totaalScore / s.vragen) * 100) : 0
            }))
            .sort((a, b) => b.percentage - a.percentage || b.cappies - a.cappies);

        const tafelRanking = Object.values(tafelStats)
            .map(t => ({
                ...t,
                foutPercentage: Math.round((t.fouten / t.aantal) * 100),
                foutPercentageInclusief: Math.round((t.foutenInclusief / t.aantal) * 100),
                gemTijd: (t.totaalTijd / t.aantal / 1000).toFixed(1)
            }))
            .sort((a, b) => b.foutPercentage - a.foutPercentage);

        setAnalyseData({ studentRanking, tafelRanking });
        setLaden(false);
    };

    const verwijderResultaat = async (resultaatId) => {
        if (!confirm('Weet je zeker dat je dit resultaat wilt verwijderen?')) return;

        const { error } = await supabase
            .from('oefeningen')
            .delete()
            .eq('id', resultaatId);

        if (error) {
            alert('Fout bij verwijderen: ' + error.message);
        } else {
            setHistorie(historie.filter(o => o.id !== resultaatId));
            // Ook het overzicht updaten als we de klas verversen
            if (geselecteerdeKlas) selecteerKlas(geselecteerdeKlas);
        }
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
                    <button className={`btn ${weergave === 'analyse' ? 'btn-primary' : 'btn-outline'}`} onClick={laadAnalyse} disabled={!geselecteerdeKlas}>
                        <BarChart size={18} style={{ marginRight: '0.5rem' }} /> Klassenanalyse
                    </button>
                    <button className="btn btn-outline" onClick={() => router.push('/leraar/taken')}>
                        <BookOpen size={18} style={{ marginRight: '0.5rem' }} /> Taken Beheren
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
                                        <th style={{ padding: '1rem' }}>Wallet</th>
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
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                                    <img src="/cappycoin.png" alt="Cappy" style={{ width: '18px', height: '18px' }} />
                                                    <span style={{ fontWeight: 'bold' }}>{l.cappies || 0}</span>
                                                </div>
                                            </td>
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
                    ) : weergave === 'analyse' && analyseData ? (
                        <div className="card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h2>Analyse: {geselecteerdeKlas?.naam}</h2>
                                <button onClick={() => setWeergave('overzicht')} className="btn btn-outline">Terug naar Overzicht</button>
                            </div>

                            {/* Range Filter */}
                            <div style={{
                                display: 'inline-flex',
                                background: '#f1f5f9',
                                padding: '4px',
                                borderRadius: '12px',
                                marginBottom: '2rem'
                            }}>
                                {['all', '30', '7'].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => laadAnalyse(range)}
                                        style={{
                                            padding: '0.4rem 1.2rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: analyseBereik === range ? 'white' : 'transparent',
                                            color: analyseBereik === range ? 'var(--text-color)' : '#64748b',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            boxShadow: analyseBereik === range ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                            transition: 'all 0.2s',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {range === 'all' ? 'Alle tijd' : `${range} dagen`}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                                {/* Table Analysis */}
                                <div>
                                    <h3>Tafel Prestaties (Meeste Fouten)</h3>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                        <thead>
                                            <tr style={{ textAlign: 'left', borderBottom: '2px solid #eee' }}>
                                                <th style={{ padding: '0.8rem' }}>Tafel</th>
                                                <th style={{ padding: '0.8rem' }}>Fout %</th>
                                                <th style={{ padding: '0.8rem' }}>Fout % (incl. 1ste kans)</th>
                                                <th style={{ padding: '0.8rem' }}>Gem. Tijd</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analyseData.tafelRanking.map(t => (
                                                <tr key={t.tafel} style={{ borderBottom: '1px solid #eee' }}>
                                                    <td style={{ padding: '0.8rem' }}><strong>Tafel van {t.tafel}</strong></td>
                                                    <td style={{ padding: '0.8rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '5px',
                                                            background: t.foutPercentage > 20 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(132, 204, 22, 0.15)',
                                                            color: t.foutPercentage > 20 ? '#991b1b' : '#166534'
                                                        }}>
                                                            {t.foutPercentage}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.8rem' }}>
                                                        <span style={{
                                                            padding: '0.2rem 0.5rem',
                                                            borderRadius: '5px',
                                                            background: t.foutPercentageInclusief > 30 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(132, 204, 22, 0.15)',
                                                            color: t.foutPercentageInclusief > 30 ? '#991b1b' : '#166534'
                                                        }}>
                                                            {t.foutPercentageInclusief}%
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.8rem' }}>{t.gemTijd}s</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Student Ranking */}
                                <div>
                                    <h3>Leerling Ranking (Gem. Score)</h3>
                                    <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem' }}>
                                        {analyseData.studentRanking.map((s, i) => (
                                            <li
                                                key={s.id}
                                                onClick={() => selecteerLeerling(s)}
                                                style={{
                                                    padding: '1rem',
                                                    background: i < 3 ? 'rgba(255, 215, 0, 0.1)' : '#fff',
                                                    border: '1px solid #eee',
                                                    borderRadius: '10px',
                                                    marginBottom: '0.5rem',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                                }}
                                                onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.05)'; }}
                                                onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#94a3b8', width: '25px' }}>{i + 1}.</span>
                                                    <strong style={{ color: 'var(--primary-color)' }}>{s.naam}</strong>
                                                </div>
                                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{s.percentage}%</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Score</div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.2rem', fontWeight: 'bold' }}>
                                                            <img src="/cappycoin.png" alt="Cappy" style={{ width: '16px', height: '16px' }} />
                                                            {s.cappies}
                                                        </div>
                                                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Cappies</div>
                                                    </div>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    ) : geselecteerdeLeerling ? (
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                                <button onClick={() => setWeergave('overzicht')} className="btn btn-outline" style={{ padding: '0.4rem 0.8rem' }}>←</button>
                                <h2 style={{ margin: 0 }}>Resultaten van {geselecteerdeLeerling.voornaam} {geselecteerdeLeerling.naam}</h2>
                            </div>

                            {/* Range Filter for Student Detail */}
                            <div style={{
                                display: 'inline-flex',
                                background: '#f1f5f9',
                                padding: '4px',
                                borderRadius: '12px',
                                marginBottom: '2rem'
                            }}>
                                {['all', '30', '7'].map((range) => (
                                    <button
                                        key={range}
                                        onClick={() => wijzigDetailFilter(range)}
                                        style={{
                                            padding: '0.4rem 1.2rem',
                                            borderRadius: '10px',
                                            border: 'none',
                                            background: detailFilterBereik === range ? 'white' : 'transparent',
                                            color: detailFilterBereik === range ? 'var(--text-color)' : '#64748b',
                                            fontWeight: '600',
                                            cursor: 'pointer',
                                            boxShadow: detailFilterBereik === range ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                                            transition: 'all 0.2s',
                                            fontSize: '0.85rem'
                                        }}
                                    >
                                        {range === 'all' ? 'Alle tijd' : `${range} dagen`}
                                    </button>
                                ))}
                            </div>

                            {/* Analytics Cards (Ported from Profile) */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid #eee', padding: '1.2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--primary-color)', marginBottom: '1rem' }}>
                                        <TrendingUp size={20} />
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Success Rate</h3>
                                    </div>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                                        {tweedeKansStats.totaal > 0 ? Math.round((tweedeKansStats.succes / tweedeKansStats.totaal) * 100) : 0}%
                                    </div>
                                    <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.5rem 0 0' }}>Tweede kans succes rate</p>
                                </div>

                                <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid #eee', padding: '1.2rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--error)', marginBottom: '1rem' }}>
                                        <AlertCircle size={20} />
                                        <h3 style={{ margin: 0, fontSize: '1rem' }}>Meeste fouten</h3>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {topFouten.length > 0 ? topFouten.map((f, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                                <span>{f.vraag}</span>
                                                <span style={{ fontWeight: 'bold', color: 'var(--error)' }}>{f.aantal}x</span>
                                            </div>
                                        )) : <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.9rem' }}>Nog geen fouten!</p>}
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
                                <div className="card" style={{ border: '1px solid #eee', padding: '1.2rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Fouten trend per tafel</h3>
                                    <LineChart data={foutenPerTafel} />
                                </div>
                                <div className="card" style={{ border: '1px solid #eee', padding: '1.2rem' }}>
                                    <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Gem. tijd per tafel (sec)</h3>
                                    <BarChartComponent data={tijdPerTafel} />
                                </div>
                                <div className="card" style={{ border: '1px solid #eee', padding: '1.2rem', gridColumn: 'span 2' }}>
                                    <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>Fouten trends per tafel (inclusief 1ste kans fouten)</h3>
                                    <LineChart data={foutenInclusiefEersteKans} />
                                </div>
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
                                                                Taak: {oef.taken.titel}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ fontSize: '0.9rem' }}><Clock size={14} /> {oef.totaal_tijd}s</p>
                                                        <p style={{ fontSize: '0.9rem' }}><Target size={14} /> {oef.instellingen.operaties === 'maal' ? 'Alleen x' : 'x en ÷'}</p>
                                                    </div>
                                                    <button
                                                        className="btn btn-outline"
                                                        style={{ color: 'var(--error)', padding: '0.4rem', marginLeft: '0.5rem' }}
                                                        onClick={() => verwijderResultaat(oef.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
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

// Chart componenten (Gekopieerd uit ProfielPagina)
function LineChart({ data }) {
    const tafels = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
    const maxFouten = Math.max(...Object.values(data), 5);
    const height = 150;
    const width = 300;
    const padding = 20;

    const points = tafels.map((t, i) => {
        const x = padding + (i * (width - 2 * padding) / 9);
        const y = height - padding - ((data[t] || 0) * (height - 2 * padding) / maxFouten);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            {[0, 0.5, 1].map(p => (
                <line key={p} x1={padding} y1={padding + p * (height - 2 * padding)} x2={width - padding} y2={padding + p * (height - 2 * padding)} stroke="#e2e8f0" strokeWidth="1" />
            ))}
            <polyline fill="none" stroke="var(--error)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} style={{ filter: 'drop-shadow(0px 4px 4px rgba(229, 152, 155, 0.2))' }} />
            {tafels.map((t, i) => {
                const x = padding + (i * (width - 2 * padding) / 9);
                const y = height - padding - ((data[t] || 0) * (height - 2 * padding) / maxFouten);
                return (
                    <g key={t}>
                        <circle cx={x} cy={y} r="4" fill="var(--error)" />
                        <text x={x} y={height - 5} fontSize="8" textAnchor="middle" fill="#94a3b8">{t}</text>
                    </g>
                );
            })}
        </svg>
    );
}

function BarChartComponent({ data }) {
    const tafels = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
    const maxTijd = Math.max(...Object.values(data).map(Number), 5);
    const height = 150;
    const width = 300;
    const padding = 20;
    const barWidth = (width - 2 * padding) / 10 - 4;

    return (
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
            {[0, 0.5, 1].map(p => (
                <line key={p} x1={padding} y1={padding + p * (height - 2 * padding)} x2={width - padding} y2={padding + p * (height - 2 * padding)} stroke="#e2e8f0" strokeWidth="1" />
            ))}
            {tafels.map((t, i) => {
                const x = padding + (i * (width - 2 * padding) / 10);
                const barHeight = (parseFloat(data[t] || 0) * (height - 2 * padding) / maxTijd);
                const y = height - padding - barHeight;
                return (
                    <g key={t}>
                        <rect x={x} y={y} width={barWidth} height={barHeight} fill="var(--secondary-color)" rx="2" style={{ opacity: 0.8 }} />
                        <text x={x + barWidth / 2} y={height - 5} fontSize="8" textAnchor="middle" fill="#94a3b8">{t}</text>
                    </g>
                );
            })}
        </svg>
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
                                <td style={{ padding: '0.5rem' }}>
                                    {d.eerste_antwoord && (
                                        <span style={{ color: 'var(--error)', textDecoration: 'line-through', marginRight: '0.5rem', fontSize: '0.8rem' }}>
                                            {d.eerste_antwoord}
                                        </span>
                                    )}
                                    <span style={{ color: d.is_correct ? 'var(--success)' : 'var(--error)', fontWeight: d.pogingen === 2 ? 'bold' : 'normal' }}>
                                        {d.antwoord_gegeven} {d.is_correct ? '✓' : '✗'}
                                    </span>
                                </td>
                                <td style={{ padding: '0.5rem' }}>
                                    {d.pogingen} {d.pogingen === 2 && <span style={{ fontSize: '0.7rem', color: 'var(--secondary-color)', fontWeight: 'bold' }}>(2de kans)</span>}
                                </td>
                                <td style={{ padding: '0.5rem' }}>{(d.tijd_ms / 1000).toFixed(1)}s</td>
                            </tr>
                        ))}

                    </tbody>
                </table>
            )}
        </div>
    );
}
