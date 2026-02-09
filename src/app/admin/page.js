'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { Plus, Users, School, Upload, Trash2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const [klassen, setKlassen] = useState([]);
    const [leraren, setLeraren] = useState([]);
    const [nieuweKlasNaam, setNieuweKlasNaam] = useState('');
    const [tab, setTab] = useState('klassen'); // klassen, leraren, leerlingen
    const [laden, setLaden] = useState(true);
    const router = useRouter();

    useEffect(() => {
        haalGegevensOp();
    }, []);

    const haalGegevensOp = async () => {
        setLaden(true);
        const { data: klassenData } = await supabase.from('klassen').select('*').order('naam');
        const { data: lerarenData } = await supabase.from('gebruikers').select('*').eq('rol', 'leraar');

        setKlassen(klassenData || []);
        setLeraren(lerarenData || []);
        setLaden(false);
    };

    const voegKlasToe = async (e) => {
        e.preventDefault();
        if (!nieuweKlasNaam) return;

        const { error } = await supabase.from('klassen').insert([{ naam: nieuweKlasNaam }]);
        if (error) {
            alert('Fout bij toevoegen klas: ' + error.message);
        } else {
            setNieuweKlasNaam('');
            haalGegevensOp();
        }
    };

    const verwijderKlas = async (id) => {
        if (!confirm('Weet je zeker dat je deze klas wilt verwijderen?')) return;
        const { error } = await supabase.from('klassen').delete().eq('id', id);
        if (error) alert(error.message);
        else haalGegevensOp();
    };

    const logout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                    <h2 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Capy-Count</h2>
                    <h1 style={{ margin: 0 }}>Admin Paneel</h1>
                </div>
                <button className="btn btn-outline" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <LogOut size={20} /> Uitloggen
                </button>
            </header>

            <div className="option-group" style={{ marginBottom: '2rem' }}>
                <button className={`btn btn-outline ${tab === 'klassen' ? 'active' : ''}`} onClick={() => setTab('klassen')}>
                    <School size={20} /> Klassen
                </button>
                <button className={`btn btn-outline ${tab === 'leraren' ? 'active' : ''}`} onClick={() => setTab('leraren')}>
                    <Users size={20} /> Leraren
                </button>
                <button className={`btn btn-outline ${tab === 'leerlingen' ? 'active' : ''}`} onClick={() => setTab('leerlingen')}>
                    <Upload size={20} /> Leerlingen (CSV)
                </button>
            </div>

            <main className="card">
                {tab === 'klassen' && (
                    <section>
                        <h2>Klassenbeheer</h2>
                        <form onSubmit={voegKlasToe} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                            <input
                                type="text"
                                className="input-field"
                                placeholder="Naam nieuwe klas (bijv. 2A)"
                                value={nieuweKlasNaam}
                                onChange={(e) => setNieuweKlasNaam(e.target.value)}
                                style={{ marginBottom: 0 }}
                            />
                            <button type="submit" className="btn btn-primary">
                                <Plus size={20} /> Toevoegen
                            </button>
                        </form>

                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {klassen.map((klas) => (
                                <li key={klas.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', borderBottom: '1px solid #eee' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '1.2rem', fontWeight: '600' }}>{klas.naam}</span>
                                        <button
                                            onClick={() => { setTab('leerlingen'); localStorage.setItem('admin_filter_klas', klas.id); }}
                                            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', padding: 0, fontSize: '0.9rem', textAlign: 'left' }}
                                        >
                                            Bekijk leerlingen
                                        </button>
                                    </div>
                                    <button onClick={() => verwijderKlas(klas.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                                        <Trash2 size={20} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {tab === 'leraren' && (
                    <section>
                        <h2>Leraarbeheer</h2>
                        <TeacherManagement klassen={klassen} onUpdate={haalGegevensOp} />
                    </section>
                )}

                {tab === 'leerlingen' && (
                    <section>
                        <h2>Leerlingen Import & Beheer</h2>
                        <StudentManagement klassen={klassen} />
                    </section>
                )}
            </main>
        </div>
    );
}

function TeacherManagement({ klassen, onUpdate }) {
    const [voornaam, setVoornaam] = useState('');
    const [naam, setNaam] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [geselecteerdeKlassen, setGeselecteerdeKlassen] = useState([]);
    const [bezig, setBezig] = useState(false);
    const [leraren, setLeraren] = useState([]);
    const [bewerkendeLeraarId, setBewerkendeLeraarId] = useState(null);

    useEffect(() => {
        haalLeraren();
    }, []);

    const haalLeraren = async () => {
        const { data } = await supabase
            .from('gebruikers')
            .select('*, leraar_klassen(klas_id)')
            .eq('rol', 'leraar');
        setLeraren(data || []);
    };

    const slaLeraarOp = async (e) => {
        e.preventDefault();
        setBezig(true);

        const leraarData = {
            voornaam,
            naam,
            rol: 'leraar'
        };

        if (wachtwoord) {
            leraarData.wachtwoord_plain = wachtwoord;
        }

        let leraarId = bewerkendeLeraarId;

        if (bewerkendeLeraarId) {
            // Update bestaande
            const { error } = await supabase.from('gebruikers').update(leraarData).eq('id', bewerkendeLeraarId);
            if (error) alert(error.message);
        } else {
            // Nieuwe aanmaken
            const { data, error } = await supabase.from('gebruikers').insert([leraarData]).select().single();
            if (error) alert(error.message);
            else leraarId = data.id;
        }

        if (leraarId) {
            // Klassen bijwerken: Eerst alles verwijderen, dan opnieuw toevoegen
            await supabase.from('leraar_klassen').delete().eq('leraar_id', leraarId);

            if (geselecteerdeKlassen.length > 0) {
                const koppelingen = geselecteerdeKlassen.map(klasId => ({
                    leraar_id: leraarId,
                    klas_id: klasId
                }));
                await supabase.from('leraar_klassen').insert(koppelingen);
            }

            resetForm();
            haalLeraren();
        }
        setBezig(false);
    };

    const resetForm = () => {
        setVoornaam('');
        setNaam('');
        setWachtwoord('');
        setGeselecteerdeKlassen([]);
        setBewerkendeLeraarId(null);
    };

    const startBewerken = (leraar) => {
        setBewerkendeLeraarId(leraar.id);
        setVoornaam(leraar.voornaam);
        setNaam(leraar.naam);
        setWachtwoord(''); // Wachtwoord niet tonen, alleen overschrijven indien ingevuld
        setGeselecteerdeKlassen(leraar.leraar_klassen?.map(lk => lk.klas_id) || []);
    };

    const verwijderLeraar = async (id) => {
        if (!confirm('Weet je zeker dat je deze leraar wilt verwijderen?')) return;
        const { error } = await supabase.from('gebruikers').delete().eq('id', id);
        if (error) alert(error.message);
        else haalLeraren();
    };

    const toggleKlas = (id) => {
        setGeselecteerdeKlassen(prev =>
            prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
        );
    };

    return (
        <div>
            <form onSubmit={slaLeraarOp} className="card" style={{ background: '#f9f9f9', marginBottom: '2rem' }}>
                <h3>{bewerkendeLeraarId ? 'Leraar bewerken' : 'Nieuwe leraar'}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <input type="text" className="input-field" placeholder="Voornaam" value={voornaam} onChange={e => setVoornaam(e.target.value)} required />
                    <input type="text" className="input-field" placeholder="Naam" value={naam} onChange={e => setNaam(e.target.value)} required />
                </div>
                <input
                    type="text"
                    className="input-field"
                    placeholder={bewerkendeLeraarId ? "Wachtwoord (leeg laten om niet te wijzigen)" : "Wachtwoord"}
                    value={wachtwoord}
                    onChange={e => setWachtwoord(e.target.value)}
                    required={!bewerkendeLeraarId}
                />

                <p style={{ margin: '1rem 0' }}>Koppel aan klassen:</p>
                <div className="option-group">
                    {klassen.map(k => (
                        <button key={k.id} type="button" className={`btn btn-outline ${geselecteerdeKlassen.includes(k.id) ? 'active' : ''}`} onClick={() => toggleKlas(k.id)}>
                            {k.naam}
                        </button>
                    ))}
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={bezig}>
                        {bewerkendeLeraarId ? 'Wijzigingen opslaan' : 'Leraar aanmaken'}
                    </button>
                    {bewerkendeLeraarId && (
                        <button type="button" className="btn btn-outline" onClick={resetForm}>Annuleren</button>
                    )}
                </div>
            </form>

            <ul style={{ listStyle: 'none', padding: 0 }}>
                {leraren.map(l => (
                    <li key={l.id} style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <strong>{l.voornaam} {l.naam}</strong>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                                Klassen: {l.leraar_klassen?.map(lk => klassen.find(k => k.id === lk.klas_id)?.naam).join(', ') || 'Geen'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => startBewerken(l)} className="btn btn-outline" style={{ padding: '0.5rem' }}>
                                Aanpassen
                            </button>
                            <button onClick={() => verwijderLeraar(l.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                                <Trash2 size={20} />
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function StudentManagement({ klassen }) {
    const [file, setFile] = useState(null);
    const [bezig, setBezig] = useState(false);
    const [modus, setModus] = useState('lijst'); // lijst, csv, manueel
    const [leerlingen, setLeerlingen] = useState([]);
    const [filterKlasId, setFilterKlasId] = useState('');

    // Handmatige / Bewerk velden
    const [naam, setNaam] = useState('');
    const [voornaam, setVoornaam] = useState('');
    const [klasId, setKlasId] = useState('');
    const [klasnummer, setKlasnummer] = useState('');
    const [wachtwoord, setWachtwoord] = useState('');
    const [bewerkendeLeerlingId, setBewerkendeLeerlingId] = useState(null);

    useEffect(() => {
        const storedFilter = localStorage.getItem('admin_filter_klas');
        if (storedFilter) {
            setFilterKlasId(storedFilter);
            localStorage.removeItem('admin_filter_klas');
        }
        haalLeerlingen();
    }, []);

    const haalLeerlingen = async () => {
        const { data } = await supabase
            .from('gebruikers')
            .select('*, klassen!gebruikers_klas_id_fkey(naam)')
            .eq('rol', 'student')
            .order('voornaam');
        setLeerlingen(data || []);
    };

    const resetForm = () => {
        setNaam(''); setVoornaam(''); setKlasId(''); setKlasnummer(''); setWachtwoord('');
        setBewerkendeLeerlingId(null);
        setModus('lijst');
    };

    const startBewerken = (l) => {
        setBewerkendeLeerlingId(l.id);
        setNaam(l.naam);
        setVoornaam(l.voornaam);
        setKlasId(l.klas_id);
        setKlasnummer(l.klasnummer || '');
        setWachtwoord(''); // Wachtwoord niet tonen
        setModus('manueel');
    };

    const verwijderLeerling = async (id) => {
        if (!confirm('Weet je zeker dat je deze leerling wilt verwijderen?')) return;
        const { error } = await supabase.from('gebruikers').delete().eq('id', id);
        if (error) alert(error.message);
        else haalLeerlingen();
    };

    const slaLeerlingOp = async (e) => {
        e.preventDefault();
        setBezig(true);

        const data = {
            naam,
            voornaam,
            klas_id: klasId,
            klasnummer: parseInt(klasnummer) || 0,
            rol: 'student'
        };
        if (wachtwoord) data.wachtwoord_plain = wachtwoord;

        if (bewerkendeLeerlingId) {
            const { error } = await supabase.from('gebruikers').update(data).eq('id', bewerkendeLeerlingId);
            if (error) alert(error.message);
            else { alert('Leerling bijgewerkt!'); resetForm(); haalLeerlingen(); }
        } else {
            const { error } = await supabase.from('gebruikers').insert([data]);
            if (error) alert(error.message);
            else { alert('Leerling toegevoegd!'); resetForm(); haalLeerlingen(); }
        }
        setBezig(false);
    };

    const handleUpload = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) setFile(selectedFile);
    };

    const verwerkCSV = () => {
        if (!file) return;
        setBezig(true);

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                const errors = [];
                let successCount = 0;

                for (const row of results.data) {
                    const { NAAM, VOORNAAM, KLAS, KLASNUMMER, WACHTWOORD } = row;
                    if (!NAAM || !VOORNAAM || !KLAS) continue;
                    const klas = klassen.find(k => k.naam.toLowerCase() === KLAS.toLowerCase());
                    if (!klas) {
                        errors.push(`Klas "${KLAS}" niet gevonden voor ${VOORNAAM} ${NAAM}`);
                        continue;
                    }
                    const { error } = await supabase.from('gebruikers').insert([{
                        naam: NAAM,
                        voornaam: VOORNAAM,
                        klas_id: klas.id,
                        klasnummer: parseInt(KLASNUMMER) || 0,
                        wachtwoord_plain: WACHTWOORD,
                        rol: 'student'
                    }]);
                    if (error) errors.push(`Fout bij ${VOORNAAM} ${NAAM}: ${error.message}`);
                    else successCount++;
                }

                alert(`Klaar! ${successCount} leerlingen toegevoegd.`);
                haalLeerlingen();
                setBezig(false);
            }
        });
    };

    const gefilterdeLeerlingen = filterKlasId
        ? leerlingen.filter(l => l.klas_id === filterKlasId)
        : leerlingen;

    return (
        <div>
            <div className="option-group" style={{ marginBottom: '1.5rem' }}>
                <button className={`btn btn-outline ${modus === 'lijst' ? 'active' : ''}`} onClick={() => setModus('lijst')}>Lijst</button>
                <button className={`btn btn-outline ${modus === 'csv' ? 'active' : ''}`} onClick={() => setModus('csv')}>CSV Upload</button>
                <button className={`btn btn-outline ${modus === 'manueel' ? 'active' : ''}`} onClick={() => setModus('manueel')}>Handmatig</button>
            </div>

            {modus === 'lijst' && (
                <div>
                    <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select className="input-field" value={filterKlasId} onChange={e => setFilterKlasId(e.target.value)} style={{ maxWidth: '300px', marginBottom: 0 }}>
                            <option value="">Alle klassen</option>
                            {klassen.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                        </select>
                        {filterKlasId && (
                            <button className="btn btn-outline" onClick={() => setFilterKlasId('')} style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                                Toon alle klassen
                            </button>
                        )}
                    </div>
                    <ul style={{ listStyle: 'none', padding: 0 }}>
                        {gefilterdeLeerlingen.map(l => (
                            <li key={l.id} style={{ padding: '1rem', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <strong>{l.voornaam} {l.naam}</strong> (nr. {l.klasnummer || '?'})
                                    <div style={{ fontSize: '0.9rem', color: '#666' }}>Klas: {l.klassen?.naam}</div>
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => startBewerken(l)} className="btn btn-outline" style={{ padding: '0.5rem' }}>Aanpassen</button>
                                    <button onClick={() => verwijderLeerling(l.id)} style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer' }}>
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {modus === 'csv' && (
                <div className="card" style={{ background: '#f9f9f9' }}>
                    <p style={{ marginBottom: '1rem' }}>Upload een CSV bestand met: NAAM, VOORNAAM, KLAS, KLASNUMMER, WACHTWOORD</p>
                    <input type="file" accept=".csv" onChange={handleUpload} className="input-field" />
                    <button className="btn btn-secondary" onClick={verwerkCSV} disabled={!file || bezig}>
                        {bezig ? 'Bezig...' : 'Verwerk CSV'}
                    </button>
                </div>
            )}

            {modus === 'manueel' && (
                <form onSubmit={slaLeerlingOp} className="card" style={{ background: '#f9f9f9' }}>
                    <h3>{bewerkendeLeerlingId ? 'Leerling bewerken' : 'Nieuwe leerling'}</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <input type="text" className="input-field" placeholder="Voornaam" value={voornaam} onChange={e => setVoornaam(e.target.value)} required />
                        <input type="text" className="input-field" placeholder="Naam" value={naam} onChange={e => setNaam(e.target.value)} required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: '1rem' }}>
                        <select className="input-field" value={klasId} onChange={e => setKlasId(e.target.value)} required>
                            <option value="">Selecteer klas...</option>
                            {klassen.map(k => <option key={k.id} value={k.id}>{k.naam}</option>)}
                        </select>
                        <input type="number" className="input-field" placeholder="Nr" value={klasnummer} onChange={e => setKlasnummer(e.target.value)} />
                    </div>
                    <input
                        type="text"
                        className="input-field"
                        placeholder={bewerkendeLeerlingId ? "Wachtwoord (leeg laten om niet te wijzigen)" : "Wachtwoord"}
                        value={wachtwoord}
                        onChange={e => setWachtwoord(e.target.value)}
                        required={!bewerkendeLeerlingId}
                    />
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={bezig}>
                            {bewerkendeLeerlingId ? 'Wijzigingen opslaan' : 'Leerling toevoegen'}
                        </button>
                        <button type="button" className="btn btn-outline" onClick={resetForm}>Annuleren</button>
                    </div>
                </form>
            )}
        </div>
    );
}
