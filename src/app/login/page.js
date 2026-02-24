'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Login() {
    const [rol, setRol] = useState('student');
    const [identivicatie, setIdentivicatie] = useState(''); // e-mail of naam
    const [wachtwoord, setWachtwoord] = useState('');
    const [fout, setFout] = useState('');
    const [laden, setLaden] = useState(false);
    const router = useRouter();

    const handleLogin = async (e) => {
        e.preventDefault();
        setFout('');
        setLaden(true);

        try {
            if (rol === 'student' || rol === 'leraar') {
                // Studenten en leraren loggen in met naam en wachtwoord (simpel)
                const { data, error } = await supabase
                    .from('gebruikers')
                    .select('*')
                    .eq('voornaam', identivicatie)
                    .eq('wachtwoord_plain', wachtwoord)
                    .eq('rol', rol)
                    .single();

                if (error || !data) {
                    throw new Error('Naam of wachtwoord niet correct.');
                }

                localStorage.setItem('user', JSON.stringify(data));
                router.push(rol === 'student' ? '/' : '/leraar');
            } else {
                // Admin via echte Supabase Auth
                let loginEmail = identivicatie;

                // Als het geen e-mail lijkt te zijn, zoek dan de bijbehorende e-mail in de gebruikers tabel
                if (!identivicatie.includes('@')) {
                    const { data: mapping, error: mappingError } = await supabase
                        .from('gebruikers')
                        .select('email')
                        .eq('gebruikersnaam', identivicatie)
                        .eq('rol', 'admin')
                        .single();

                    if (mappingError || !mapping?.email) {
                        throw new Error('Gebruikersnaam niet gevonden.');
                    }
                    loginEmail = mapping.email;
                }

                const { data, error } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password: wachtwoord,
                });

                if (error) throw error;

                // Rol controleren
                const { data: profiel } = await supabase
                    .from('gebruikers')
                    .select('rol')
                    .eq('auth_id', data.user.id)
                    .single();

                if (profiel?.rol === rol) {
                    router.push(`/${rol}`);
                } else {
                    await supabase.auth.signOut();
                    throw new Error('Je hebt niet de juiste rol voor deze login.');
                }
            }
        } catch (err) {
            setFout(err.message);
        } finally {
            setLaden(false);
        }
    };

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            minHeight: '100dvh',
            padding: '1rem',
            background: 'var(--background-color)'
        }}>
            <main className="card" style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                overflow: 'hidden',
                width: '100%',
                maxWidth: '1000px',
                minHeight: 'unset',
                alignItems: 'stretch',
                textAlign: 'left',
                margin: '1rem'
            }}>
                <style jsx>{`
                    @media (min-width: 768px) {
                        main {
                            flex-direction: row !important;
                            height: 600px;
                        }
                        .form-container {
                            border-right: 1px solid #eee;
                            border-bottom: none !important;
                        }
                        .logo-container {
                            max-height: none !important;
                        }
                    }
                    @media (max-height: 600px) and (max-width: 767px) {
                        .logo-container {
                            display: none !important;
                        }
                    }
                `}</style>

                {/* Linker kant: Formulier */}
                <div className="form-container" style={{
                    flex: 1,
                    padding: 'clamp(1.5rem, 5vw, 3rem)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderBottom: '1px solid #eee'
                }}>
                    <h1 style={{ textAlign: 'center', marginBottom: '1.5rem', color: 'var(--text-color)', fontSize: 'clamp(2rem, 5vw, 3rem)' }}>Inloggen</h1>

                    <div className="option-group" style={{ justifyContent: 'center', marginBottom: '2.5rem' }}>
                        {['student', 'leraar', 'admin'].map((r) => (
                            <button
                                key={r}
                                className={`btn btn-outline ${rol === r ? 'active' : ''}`}
                                onClick={() => setRol(r)}
                                style={{ flex: 1, padding: '0.8rem' }}
                            >
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleLogin} style={{ width: '100%' }}>
                        <div className="section" style={{ marginBottom: '1.5rem' }}>
                            <label className="section-title">
                                {rol === 'admin' ? 'Gebruikersnaam of E-mail' : 'Voornaam'}
                            </label>
                            <input
                                type="text"
                                className="input-field"
                                value={identivicatie}
                                onChange={(e) => setIdentivicatie(e.target.value)}
                                required
                                style={{ maxWidth: '100%', marginBottom: 0 }}
                            />
                        </div>

                        <div className="section" style={{ marginBottom: '1.5rem' }}>
                            <label className="section-title">Wachtwoord</label>
                            <input
                                type="password"
                                className="input-field"
                                value={wachtwoord}
                                onChange={(e) => setWachtwoord(e.target.value)}
                                required
                                style={{ maxWidth: '100%', marginBottom: 0 }}
                            />
                        </div>

                        {fout && <p style={{ color: 'var(--error)', marginBottom: '1.5rem', fontWeight: '600' }}>{fout}</p>}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            style={{ width: '100%', padding: '1.2rem', fontSize: '1.5rem' }}
                            disabled={laden}
                        >
                            {laden ? 'Laden...' : 'Start'}
                        </button>
                    </form>
                </div>

                {/* Rechter kant: Logo */}
                <div className="logo-container" style={{
                    flex: 1,
                    background: '#fcfcfc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    maxHeight: '300px' // Limit logo height on mobile
                }}>
                    <img
                        src="/logo-master.png"
                        alt="Capy-Count Logo"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.05))'
                        }}
                    />
                </div>
            </main>
        </div>
    );
}
