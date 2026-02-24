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
    History
} from 'lucide-react';

export default function ProfielPagina() {
    const [user, setUser] = useState(null);
    const [oefeningen, setOefeningen] = useState([]);
    const [vraagResultaten, setVraagResultaten] = useState([]);
    const [laden, setLaden] = useState(true);
    const [foutenPerTafel, setFoutenPerTafel] = useState({});
    const [tijdPerTafel, setTijdPerTafel] = useState({});
    const [topFouten, setTopFouten] = useState([]);
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
            setOefeningen(oefeningenData || []);
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
                setVraagResultaten(resultatenData || []);
                analyseerData(resultatenData || []);
            }
        }

        setLaden(false);
    };

    const analyseerData = (data) => {
        const fouten = {};
        const tijden = {};
        const vraagFrequenties = {};

        data.forEach(item => {
            // Extraheer de tafel uit de vraag (bv "5 x 7" -> 7 is de tafel, "35 : 7" -> 7 is de tafel)
            const onderdelen = item.vraag.split(' ');
            const tafel = onderdelen[2]; // De tafel staat op index 2

            if (tafel) {
                // Fouten tellen
                if (!item.is_correct) {
                    fouten[tafel] = (fouten[tafel] || 0) + 1;

                    // Specifieke vragen tellen
                    vraagFrequenties[item.vraag] = (vraagFrequenties[item.vraag] || 0) + 1;
                }

                // Tijden bijhouden voor gemiddelde
                if (!tijden[tafel]) tijden[tafel] = { totaal: 0, aantal: 0 };
                tijden[tafel].totaal += item.tijd_ms || 0;
                tijden[tafel].aantal += 1;
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
        setTijdPerTafel(gemiddeldeTijden);
        setTopFouten(gesorteerdeFouten);
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
                    </div>

                    {/* History Section */}
                    <div className="card" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2rem' }}>
                            <History color="var(--primary-color)" size={24} />
                            <h3 style={{ margin: 0, fontSize: '1.3rem' }}>Oefenhistoriek</h3>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {oefeningen.length > 0 ? oefeningen.map((o) => (
                                <div key={o.id} style={{
                                    padding: '1.2rem',
                                    borderRadius: '15px',
                                    background: '#f8fafc',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
                                        <div style={{
                                            background: 'white',
                                            width: '50px',
                                            height: '50px',
                                            borderRadius: '12px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            border: '1px solid #e2e8f0'
                                        }}>
                                            <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: 'bold' }}>{new Date(o.datum).toLocaleDateString('nl-NL', { month: 'short' })}</span>
                                            <span style={{ fontSize: '1.1rem', fontWeight: '900', color: 'var(--secondary-color)' }}>{new Date(o.datum).getDate()}</span>
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{o.instellingen?.geselecteerdeTafels?.join(', ') ? `Tafels: ${o.instellingen.geselecteerdeTafels.join(', ')}` : 'Vrije oefening'}</div>
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
                                        <ArrowRight size={20} color="#cbd5e1" />
                                    </div>
                                </div>
                            )) : (
                                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                                    <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                    <p>Nog geen oefeningen gemaakt. Start vandaag nog!</p>
                                </div>
                            )}
                        </div>
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
