'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ChevronRight, Clock, Target } from 'lucide-react';

export default function MijnTaken() {
    const [taken, setTaken] = useState([]);
    const [laden, setLaden] = useState(true);
    const [user, setUser] = useState(null);
    const router = useRouter();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            router.push('/login');
            return;
        }
        const u = JSON.parse(savedUser);
        setUser(u);
        haalTaken(u.klas_id, u.id);
    }, []);

    const haalTaken = async (klasId, userId) => {
        if (!klasId) {
            setLaden(false);
            return;
        }

        // 1. Alle taken voor de klas ophalen
        const { data: alleTaken, error: takenError } = await supabase
            .from('taken')
            .select('*, gebruikers!taken_leraar_id_fkey(voornaam, naam)')
            .eq('klas_id', klasId)
            .order('created_at', { ascending: false });

        if (takenError) {
            console.error('Fout bij ophalen taken:', takenError);
            setLaden(false);
            return;
        }

        // 2. Reeds gemaakte taken voor deze student ophalen
        const { data: gemaakteOefeningen, error: oefeningError } = await supabase
            .from('oefeningen')
            .select('taak_id')
            .eq('student_id', userId)
            .not('taak_id', 'is', null);

        if (oefeningError) {
            console.error('Fout bij ophalen gemaakte oefeningen:', oefeningError);
            setTaken(alleTaken);
        } else {
            const gemaakteIds = gemaakteOefeningen.map(o => o.taak_id);
            // toon alleen taken die nog NIET zijn gemaakt
            const openTaken = alleTaken.filter(t => !gemaakteIds.includes(t.id));
            setTaken(openTaken);
        }

        setLaden(false);
    };

    const startTaak = (taak) => {
        localStorage.setItem('actieveTaak', JSON.stringify({
            ...taak.instellingen,
            vragen: taak.vragen, // De vaste vragenlijst doorgeven
            naam: user.voornaam,
            titel: taak.titel,
            taakId: taak.id
        }));
        router.push('/');
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <header style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                <button className="btn btn-outline" onClick={() => router.push('/')}><ArrowLeft size={18} /></button>
                <h1 style={{ margin: 0 }}>Mijn taken</h1>
            </header>

            <main>
                {taken.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                        <BookOpen size={64} color="#ccc" style={{ marginBottom: '1rem' }} />
                        <p>Er zijn momenteel geen taken voor jouw klas.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => router.push('/')}>
                            Ga terug naar vrij oefenen
                        </button>
                    </div>
                ) : (
                    taken.map(t => (
                        <div
                            key={t.id}
                            className="card"
                            style={{
                                marginBottom: '1.5rem',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                cursor: 'pointer',
                                transition: 'transform 0.2s'
                            }}
                            onClick={() => startTaak(t)}
                        >
                            <div>
                                <h2 style={{ margin: 0, color: 'var(--primary-color)' }}>{t.titel}</h2>
                                <p style={{ margin: '0.3rem 0', fontSize: '0.9rem', color: '#666' }}>
                                    Klaargezet door {t.gebruikers?.voornaam || 'de leraar'}
                                </p>
                                <div style={{ display: 'flex', gap: '1.5rem', color: '#888', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Clock size={12} /> {t.instellingen.modus === 'vrij' ? 'Vrij' : t.instellingen.modus}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Target size={12} /> {t.instellingen.aantalVragen} vragen
                                    </span>
                                </div>
                            </div>
                            <ChevronRight size={24} color="var(--primary-color)" />
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
