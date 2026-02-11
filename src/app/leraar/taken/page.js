'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ArrowLeft, BookOpen, Clock, Target } from 'lucide-react';

export default function LeraarTaken() {
    const [taken, setTaken] = useState([]);
    const [laden, setLaden] = useState(true);
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
        haalTaken(u.id);
    };

    const haalTaken = async (leraarId) => {
        setLaden(true);
        const { data, error } = await supabase
            .from('taken')
            .select('*, klassen(naam)')
            .eq('leraar_id', leraarId)
            .order('created_at', { ascending: false });

        if (!error) setTaken(data);
        setLaden(false);
    };

    const verwijderTaak = async (id) => {
        if (!confirm('Weet je zeker dat je deze taak wilt verwijderen?')) return;

        const { error } = await supabase.from('taken').delete().eq('id', id);
        if (error) {
            alert('Fout bij verwijderen: ' + error.message);
        } else {
            setTaken(taken.filter(t => t.id !== id));
        }
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => router.push('/leraar')}><ArrowLeft size={18} /></button>
                    <h1 style={{ margin: 0 }}>Taken Beheren</h1>
                </div>
                <button className="btn btn-primary" onClick={() => router.push('/leraar/taken/nieuw')}>
                    <Plus size={18} style={{ marginRight: '0.5rem' }} /> Nieuwe Toets
                </button>
            </header>

            <div className="grid">
                {taken.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: '5rem' }}>
                        <BookOpen size={64} color="#ccc" style={{ marginBottom: '1rem' }} />
                        <p>Je hebt nog geen taken aangemaakt.</p>
                        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => router.push('/leraar/taken/nieuw')}>
                            Maak je eerste toets!
                        </button>
                    </div>
                ) : (
                    taken.map(t => (
                        <div key={t.id} className="card" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <h2 style={{ margin: 0 }}>{t.titel}</h2>
                                    <span style={{ padding: '0.2rem 0.6rem', background: 'var(--primary-color)', color: 'white', borderRadius: '20px', fontSize: '0.8rem' }}>
                                        {t.klassen?.naam}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', gap: '1.5rem', color: '#666', fontSize: '0.9rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Clock size={14} /> {t.instellingen.modus === 'vrij' ? 'Vrij' : t.instellingen.modus}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                        <Target size={14} /> {t.instellingen.aantalVragen} vragen
                                    </span>
                                    <span>Tafels: {t.instellingen.geselecteerdeTafels.join(', ')}</span>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button className="btn btn-outline" style={{ color: 'var(--error)' }} onClick={() => verwijderTaak(t.id)}>
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
