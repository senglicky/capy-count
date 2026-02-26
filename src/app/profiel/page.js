'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import {
    ChevronLeft,
    Calendar,
    Clock,
    Target,
    TrendingUp,
    AlertCircle,
    ArrowRight,
    Search,
    Filter,
    BarChart3,
    History,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    XCircle
} from 'lucide-react';

export default function ProfielPagina() {
    const [user, setUser] = useState(null);
    const [oefeningen, setOefeningen] = useState([]);
    const [vraagResultaten, setVraagResultaten] = useState([]);
    const [laden, setLaden] = useState(true);
    const [foutenPerTafel, setFoutenPerTafel] = useState({});
    const [foutenInclusiefEersteKans, setFoutenInclusiefEersteKans] = useState({});
    const [tijdPerTafel, setTijdPerTafel] = useState({});
    const [topFouten, setTopFouten] = useState([]);
    const [tweedeKansStats, setTweedeKansStats] = useState({ totaal: 0, succes: 0 });
    const [filterBereik, setFilterBereik] = useState('all'); // all, 30, 7
    const [alleOefeningen, setAlleOefeningen] = useState([]);
    const [alleVraagResultaten, setAlleVraagResultaten] = useState([]);

    // Pagination & Expansion State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const [expandedOefeningId, setExpandedOefeningId] = useState(null);

    const router = useRouter();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            router.push('/login');
        } else {
            const u = JSON.parse(savedUser);
            setUser(u);
            haalData(u.id);
        }
    }, []);

    useEffect(() => {
        if (user) {
            filterEnAnalyseer();
        }
    }, [filterBereik, alleOefeningen, alleVraagResultaten]);

    const haalData = async (userId) => {
        setLaden(true);

        // 1. Haal alle oefeningen op
        const { data: oefeningenData, error: oefError } = await supabase
            .from('oefeningen')
            .select('*')
            .eq('student_id', userId)
            .order('datum', { ascending: false });

        if (oefError) {
            console.error('Fout bij ophalen oefeningen:', oefError);
        } else {
            setAlleOefeningen(oefeningenData || []);
        }

        // 2. Haal alle vraag resultaten op (voor analyse)
        // We moeten eerst de IDs van de oefeningen hebben
        const oefeningIds = oefeningenData?.map(o => o.id) || [];

        if (oefeningIds.length > 0) {
            const { data: resultatenData, error: resError } = await supabase
                .from('vraag_resultaten')
                .select('*')
                .in('oefening_id', oefeningIds);

            if (resError) {
                console.error('Fout bij ophalen resultaten:', resError);
            } else {
                setAlleVraagResultaten(resultatenData || []);
            }
        }

        setLaden(false);
    };

    const filterEnAnalyseer = () => {
        let gefilterdeOefeningen = [...alleOefeningen];

        if (filterBereik === '30') {
            const dertigDagenGeleden = new Date();
            dertigDagenGeleden.setDate(dertigDagenGeleden.getDate() - 30);
            gefilterdeOefeningen = alleOefeningen.filter(o => new Date(o.datum) >= dertigDagenGeleden);
        } else if (filterBereik === '7') {
            const zevenDagenGeleden = new Date();
            zevenDagenGeleden.setDate(zevenDagenGeleden.getDate() - 7);
            gefilterdeOefeningen = alleOefeningen.filter(o => new Date(o.datum) >= zevenDagenGeleden);
        }

        setOefeningen(gefilterdeOefeningen);

        const oefeningIds = gefilterdeOefeningen.map(o => o.id);
        const gefilterdeResultaten = alleVraagResultaten.filter(r => oefeningIds.includes(r.oefening_id));

        setVraagResultaten(gefilterdeResultaten);
        analyseerData(gefilterdeResultaten);
        setCurrentPage(1); // Reset pagination
    };

    const analyseerData = (data) => {
        const fouten = {};
        const foutenInclusief = {};
        const tijden = {};
        const vraagFrequenties = {};
        let tkTotaal = 0;
        let tkSucces = 0;

        data.forEach(item => {
            // Extraheer de tafel uit de vraag (bv "5 x 7" -> 7 is de tafel, "35 : 7" -> 7 is de tafel)
            const onderdelen = item.vraag.split(' ');
            const tafel = onderdelen[2]; // De tafel staat op index 2

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

                // Tijden bijhouden voor gemiddelde
                if (!tijden[tafel]) tijden[tafel] = { totaal: 0, aantal: 0 };
                tijden[tafel].totaal += item.tijd_ms || 0;
                tijden[tafel].aantal += 1;
            }

            // Tweede kans analyse
            if (item.pogingen === 2) {
                tkTotaal++;
                if (item.is_correct) tkSucces++;
            }
        });

        // Gemiddelde tijd berekenen (in seconden)
        const gemiddeldeTijden = {};
        Object.keys(tijden).forEach(tafel => {
            gemiddeldeTijden[tafel] = (tijden[tafel].totaal / tijden[tafel].aantal / 1000).toFixed(1);
        });

        // Top 3 fouten sorteren
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

    if (laden) {
        return (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
                <div className="btn-pulse" style={{ fontSize: '1.5rem', color: 'var(--primary-color)', fontWeight: 'bold' }}>Gegevens analyseren...</div>
            </div>
        );
    }

    // Chart componenten (Eenvoudig met SVG)
    const LineChart = ({ data }) => {
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
                {/* Horizontal lines */}
                {[0, 0.5, 1].map(p => (
                    <line key={p} x1={padding} y1={padding + p * (height - 2 * padding)} x2={width - padding} y2={padding + p * (height - 2 * padding)} stroke="#e2e8f0" strokeWidth="1" />
                ))}
                {/* Polyline */}
                <polyline fill="none" stroke="var(--error)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" points={points} style={{ filter: 'drop-shadow(0px 4px 4px rgba(229, 152, 155, 0.2))' }} />
                {/* Dots */}
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
    };

    const BarChart = ({ data }) => {
        const tafels = Array.from({ length: 10 }, (_, i) => (i + 1).toString());
        const maxTijd = Math.max(...Object.values(data).map(Number), 5);
        const height = 150;
        const width = 300;
        const padding = 20;
        const barWidth = (width - 2 * padding) / 10 - 4;

        return (
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
                {/* Horizontal lines */}
                {[0, 0.5, 1].map(p => (
                    <line key={p} x1={padding} y1={padding + p * (height - 2 * padding)} x2={width - padding} y2={padding + p * (height - 2 * padding)} stroke="#e2e8f0" strokeWidth="1" />
                ))}
                {/* Bars */}
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
    };

    // Pagination Logic
    const totalPages = Math.ceil(oefeningen.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const huidigeOefeningen = oefeningen.slice(startIndex, startIndex + itemsPerPage);

    const getVragenVoorOefening = (oefeningId) => {
        return vraagResultaten.filter(vr => vr.oefening_id === oefeningId);
    };

    return (
        <div className="container" style={{ textAlign: 'left', paddingBottom: '5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem' }}>
                <button
                    onClick={() => router.push('/')}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        padding: '0.6rem 1rem',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        color: 'var(--text-color)',
                        fontWeight: '600',
                        transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.transform = 'translateX(-4px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateX(0)'; }}
                >
                    <ChevronLeft size={18} /> Terug
                </button>
                <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Mijn Profiel</h1>
                <div style={{ width: '80px' }}></div> {/* Spacer */}
            </div>

            {/* Range Filter */}
            <div style={{
                display: 'inline-flex',
                background: '#e2e8f0',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '2rem'
            }}>
                <button
                    onClick={() => setFilterBereik('all')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: filterBereik === 'all' ? 'white' : 'transparent',
                        color: filterBereik === 'all' ? 'var(--text-color)' : '#64748b',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: filterBereik === 'all' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    Alle tijd
                </button>
                <button
                    onClick={() => setFilterBereik('30')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: filterBereik === '30' ? 'white' : 'transparent',
                        color: filterBereik === '30' ? 'var(--text-color)' : '#64748b',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: filterBereik === '30' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    30 dagen
                </button>
                <button
                    onClick={() => setFilterBereik('7')}
                    style={{
                        padding: '0.5rem 1.5rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: filterBereik === '7' ? 'white' : 'transparent',
                        color: filterBereik === '7' ? 'var(--text-color)' : '#64748b',
                        fontWeight: '600',
                        cursor: 'pointer',
                        boxShadow: filterBereik === '7' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    7 dagen
                </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }}>
                {/* Links: Stats & Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* User Card */}
                    <div className="card" style={{ padding: '2rem', textAlign: 'center', marginBottom: 0 }}>
                        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '1rem' }}>
                            <img
                                src={user?.avatars?.afbeelding_url || '/avatars/capy_basic.png'}
                                alt="Avatar"
                                style={{ width: '120px', height: '120px', borderRadius: '50%', border: '5px solid var(--primary-color)', background: '#fff' }}
                            />
                            <div style={{ position: 'absolute', bottom: '5px', right: '5px', background: 'var(--secondary-color)', color: 'white', padding: '5px', borderRadius: '50%', border: '3px solid white' }}>
                                <Target size={16} />
                            </div>
                        </div>
                        <h2 style={{ margin: '0.5rem 0', fontSize: '1.5rem' }}>{user?.voornaam} {user?.naam}</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Account type: Student</p>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ background: 'rgba(87, 142, 126, 0.05)', padding: '1rem', borderRadius: '15px' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Totaal Oefeningen</span>
                                <strong style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}>{oefeningen.length}</strong>
                            </div>
                            <div style={{ background: 'rgba(61, 90, 128, 0.05)', padding: '1rem', borderRadius: '15px' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Totaal Cappies</span>
                                <strong style={{ fontSize: '1.4rem', color: 'var(--secondary-color)' }}>{user?.cappies || 0}</strong>
                            </div>
                        </div>

                        {tweedeKansStats.totaal > 0 && (
                            <div style={{ background: 'rgba(132, 169, 140, 0.05)', padding: '1rem', borderRadius: '15px', marginTop: '1rem' }}>
                                <span style={{ display: 'block', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Tweede Kans Succes</span>
                                <strong style={{ fontSize: '1.4rem', color: 'var(--primary-color)' }}>
                                    {Math.round((tweedeKansStats.succes / tweedeKansStats.totaal) * 100)}%
                                </strong>
                                <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                                    ({tweedeKansStats.succes}/{tweedeKansStats.totaal})
                                </span>
                            </div>
                        )}

                        <button
                            className="btn btn-secondary"
                            style={{ marginTop: '1.5rem', width: '100%', borderRadius: '15px', padding: '0.8rem' }}
                            onClick={() => router.push('/store')}
                        >
                            Naar de winkel
                        </button>
                    </div>

                    {/* Top Issues Card */}
                    <div className="card" style={{ padding: '1.5rem', background: 'rgba(229, 152, 155, 0.05)', border: '1px solid rgba(229, 152, 155, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
                            <AlertCircle color="var(--error)" size={20} />
                            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)' }}>Blijf Oefenen!</h3>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>Deze vragen vind je nog lastig:</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            {topFouten.length > 0 ? topFouten.map((f, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '0.6rem 1rem', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.02)' }}>
                                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{f.vraag}</span>
                                    <span style={{ color: 'var(--error)', fontSize: '0.8rem' }}>{f.aantal}x fout</span>
                                </div>
                            )) : (
                                <p style={{ fontSize: '0.9rem', color: 'var(--success)', fontWeight: 'bold' }}>Geen fouten gevonden! Lekker bezig! 🌟</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Rechts: Charts & History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {/* Charts Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="card" style={{ padding: '1.5rem', margin: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                                <TrendingUp color="var(--error)" size={20} />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Fouten per Tafel</h3>
                            </div>
                            <LineChart data={foutenPerTafel} />
                            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>Tafels 1 t/m 10</div>
                        </div>

                        <div className="card" style={{ padding: '1.5rem', margin: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                                <Clock color="var(--secondary-color)" size={20} />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Seconden per Tafel</h3>
                            </div>
                            <BarChart data={tijdPerTafel} />
                            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>Tafels 1 t/m 10</div>
                        </div>

                        <div className="card" style={{ padding: '1.5rem', margin: 0, gridColumn: 'span 2' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.5rem' }}>
                                <TrendingUp color="var(--error)" size={20} />
                                <h3 style={{ margin: 0, fontSize: '1rem' }}>Fouten per Tafel (inclusief 1ste kans fouten)</h3>
                            </div>
                            <LineChart data={foutenInclusiefEersteKans} />
                            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>Alle pogingen inclusief 1ste kans</div>
                        </div>
                    </div>

                    {/* History Section */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
                            <History color="var(--primary-color)" size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Oefenhistoriek</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {huidigeOefeningen.length > 0 ? huidigeOefeningen.map((o) => {
                                const isExpanded = expandedOefeningId === o.id;
                                const details = getVragenVoorOefening(o.id);

                                return (
                                    <div key={o.id} style={{
                                        borderRadius: '15px',
                                        background: isExpanded ? 'white' : '#f8fafc',
                                        border: isExpanded ? '2px solid var(--secondary-color)' : '1px solid #e2e8f0',
                                        boxShadow: isExpanded ? '0 10px 25px rgba(61, 90, 128, 0.1)' : 'none',
                                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                        overflow: 'hidden'
                                    }}>
                                        {/* Header Row (Always Visible) */}
                                        <div
                                            onClick={() => setExpandedOefeningId(isExpanded ? null : o.id)}
                                            style={{
                                                padding: '1.2rem',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                                <div style={{
                                                    background: isExpanded ? 'rgba(61, 90, 128, 0.05)' : 'white',
                                                    width: '50px',
                                                    height: '50px',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: isExpanded ? 'none' : '1px solid #e2e8f0'
                                                }}>
                                                    <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>{new Date(o.datum).toLocaleDateString('nl-NL', { month: 'short' })}</span>
                                                    <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--secondary-color)' }}>{new Date(o.datum).getDate()}</span>
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: isExpanded ? 'var(--secondary-color)' : 'inherit' }}>
                                                        {o.instellingen?.geselecteerdeTafels?.join(', ') ? `Tafels: ${o.instellingen.geselecteerdeTafels.join(', ')}` : 'Vrije oefening'}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.2rem' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Clock size={14} /> {Math.floor(o.totaal_tijd / 60)}m {o.totaal_tijd % 60}s</span>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}><Target size={14} /> {o.score} / {o.instellingen?.aantalVragen || 10}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                <div style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', color: 'var(--primary-color)', fontWeight: 'bold' }}>
                                                        <img src="/cappycoin.png" alt="" style={{ width: '18px' }} />
                                                        <span>+{o.verdiende_cappies || 0}</span>
                                                    </div>
                                                    <div style={{
                                                        fontSize: '0.75rem',
                                                        padding: '2px 8px',
                                                        borderRadius: '8px',
                                                        background: o.score / (o.instellingen?.aantalVragen || 10) >= 0.8 ? 'rgba(132, 169, 140, 0.1)' : 'rgba(229, 152, 155, 0.1)',
                                                        color: o.score / (o.instellingen?.aantalVragen || 10) >= 0.8 ? 'var(--primary-color)' : 'var(--error)',
                                                        fontWeight: 'bold',
                                                        marginTop: '0.4rem'
                                                    }}>
                                                        {Math.round((o.score / (o.instellingen?.aantalVragen || 10)) * 100)}%
                                                    </div>
                                                </div>
                                                <div style={{
                                                    background: isExpanded ? 'var(--secondary-color)' : 'white',
                                                    color: isExpanded ? 'white' : '#cbd5e1',
                                                    borderRadius: '50%',
                                                    padding: '4px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    border: isExpanded ? 'none' : '1px solid #e2e8f0'
                                                }}>
                                                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Expandable Details Row */}
                                        {isExpanded && (
                                            <div style={{
                                                padding: '1.5rem',
                                                background: '#f8fafc',
                                                borderTop: '1px solid #e2e8f0',
                                                display: 'grid',
                                                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                                                gap: '1rem'
                                            }}>
                                                {details.map((v, i) => (
                                                    <div key={i} style={{
                                                        background: 'white',
                                                        padding: '0.8rem',
                                                        borderRadius: '10px',
                                                        border: `1px solid ${v.is_correct ? 'rgba(132, 169, 140, 0.3)' : 'rgba(229, 152, 155, 0.3)'}`,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        alignItems: 'center',
                                                        gap: '0.5rem',
                                                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                                                    }}>
                                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-color)' }}>
                                                            {v.vraag}
                                                        </div>
                                                        <div style={{
                                                            display: 'flex',
                                                            flexDirection: 'column',
                                                            alignItems: 'center',
                                                            gap: '0.2rem',
                                                            fontWeight: '900',
                                                            color: v.is_correct ? 'var(--primary-color)' : 'var(--error)'
                                                        }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                {v.is_correct ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                                                {v.pogingen === 2 ? (
                                                                    <span style={{ fontSize: '0.9rem' }}>{v.antwoord_gegeven} (2e)</span>
                                                                ) : (
                                                                    v.antwoord_gegeven
                                                                )}
                                                            </div>
                                                            {v.eerste_antwoord && (
                                                                <div style={{ fontSize: '0.7rem', color: 'var(--error)', textDecoration: 'line-through' }}>
                                                                    1e: {v.eerste_antwoord}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {!v.is_correct && (
                                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                                (Corr: {eval(v.vraag.replace('x', '*').replace(':', '/'))})
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                                                            {v.tijd_ms ? (v.tijd_ms / 1000).toFixed(1) + 's' : '-'}
                                                        </div>
                                                    </div>
                                                ))}
                                                {details.length === 0 && (
                                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                                                        Geen detailresultaten beschikbaar voor deze oefening.
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            }) : (
                                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Nog geen oefeningen gemaakt. Start vandaag nog!</p>
                                </div>
                            )}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0' }}>
                                <button
                                    className="btn"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '10px',
                                        background: currentPage === 1 ? '#f1f5f9' : 'white',
                                        color: currentPage === 1 ? '#cbd5e1' : 'var(--text-color)',
                                        border: '1px solid #e2e8f0',
                                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Vorige
                                </button>
                                <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>
                                    Pagina {currentPage} van {totalPages}
                                </div>
                                <button
                                    className="btn"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    style={{
                                        padding: '0.6rem 1.2rem',
                                        borderRadius: '10px',
                                        background: currentPage === totalPages ? '#f1f5f9' : 'var(--secondary-color)',
                                        color: currentPage === totalPages ? '#cbd5e1' : 'white',
                                        border: currentPage === totalPages ? '1px solid #e2e8f0' : 'none',
                                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    Volgende
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
                .btn-pulse {
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 1; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
}
