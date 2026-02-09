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
                const { data, error } = await supabase.auth.signInWithPassword({
                    email: identivicatie,
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
            padding: '2rem',
            background: 'var(--background-color)'
        }}>
            <main className="card" style={{
                display: 'flex',
                flexDirection: 'row',
                padding: 0,
                overflow: 'hidden',
                width: '1200px',
                height: '600px',
                alignItems: 'stretch',
                textAlign: 'left',
                margin: 0
            }}>
                {/* Linker kant: Formulier */}
                <div style={{
                    flex: 1,
                    padding: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    borderRight: '1px solid #eee'
                }}>
                    <h1 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-color)' }}>Inloggen</h1>

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
                                {rol === 'admin' ? 'E-mailadres' : 'Voornaam'}
                            </label>
                            <input
                                type={rol === 'admin' ? 'email' : 'text'}
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
                <div style={{
                    flex: 1,
                    background: '#fcfcfc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden'
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
