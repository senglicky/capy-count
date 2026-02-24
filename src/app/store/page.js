'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingBag, CheckCircle, Star } from 'lucide-react';

export default function AvatarStore() {
    const [user, setUser] = useState(null);
    const [cappies, setCappies] = useState(0);
    const [avatars, setAvatars] = useState([]);
    const [bezit, setBezit] = useState([]);
    const [laden, setLaden] = useState(true);
    const [bezig, setBezig] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (!savedUser) {
            router.push('/login');
            return;
        }
        const u = JSON.parse(savedUser);
        setUser(u);
        haalGegevens(u.id);
    }, []);

    const haalGegevens = async (userId) => {
        setLaden(true);

        // 1. Gebruiker cappies en actieve avatar ophalen
        const { data: profiel } = await supabase
            .from('gebruikers')
            .select('cappies, actieve_avatar_id')
            .eq('id', userId)
            .single();

        if (profiel) {
            setCappies(profiel.cappies);
            // Update lokale user state
            const updatedUser = { ...JSON.parse(localStorage.getItem('user')), ...profiel };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }

        // 2. Alle avatars ophalen
        const { data: avatarList } = await supabase
            .from('avatars')
            .select('*')
            .eq('is_actief', true)
            .order('prijs', { ascending: true });
        setAvatars(avatarList || []);

        // 3. Bezit ophalen
        const { data: bezitList } = await supabase
            .from('gebruiker_avatars')
            .select('avatar_id')
            .eq('gebruiker_id', userId);
        setBezit(bezitList?.map(b => b.avatar_id) || []);

        setLaden(false);
    };

    const koopAvatar = async (avatar) => {
        if (cappies < avatar.prijs) {
            alert('Je hebt niet genoeg cappies!');
            return;
        }

        setBezig(true);

        // 1. Toevoegen aan bezit
        const { error: insertError } = await supabase
            .from('gebruiker_avatars')
            .insert({ gebruiker_id: user.id, avatar_id: avatar.id });

        if (insertError) {
            alert('Fout bij aankoop: ' + insertError.message);
            setBezig(false);
            return;
        }

        // 2. Cappies aftrekken
        const nieuwSaldo = cappies - avatar.prijs;
        const { error: updateError } = await supabase
            .from('gebruikers')
            .update({ cappies: nieuwSaldo })
            .eq('id', user.id);

        if (updateError) {
            alert('Fout bij bijwerken saldo: ' + updateError.message);
        } else {
            setCappies(nieuwSaldo);
            setBezit([...bezit, avatar.id]);
            // Automatisch instellen als actief?
            setActief(avatar.id);
        }
        setBezig(false);
    };

    const setActief = async (avatarId) => {
        setBezig(true);
        const { error } = await supabase
            .from('gebruikers')
            .update({ actieve_avatar_id: avatarId })
            .eq('id', user.id);

        if (error) {
            alert('Fout bij instellen avatar: ' + error.message);
        } else {
            // Ook de afbeelding_url ophalen voor de lokale state
            const avatar = avatars.find(a => a.id === avatarId);
            const updatedUser = {
                ...user,
                actieve_avatar_id: avatarId,
                avatars: { afbeelding_url: avatar?.afbeelding_url }
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        setBezig(false);
    };

    if (laden) return <div className="container"><h1>Laden...</h1></div>;

    const opVoorraad = avatars.filter(a => !bezit.includes(a.id));
    const alInBezit = avatars.filter(a => bezit.includes(a.id));

    return (
        <div className="container" style={{ maxWidth: '1000px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="btn btn-outline" onClick={() => router.push('/')}><ArrowLeft size={18} /></button>
                    <h1 style={{ margin: 0 }}>Avatar Winkel</h1>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: '#fff', padding: '0.5rem 1.2rem', borderRadius: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
                    <img src="/cappycoin.png" alt="Cappy" style={{ width: '24px', height: '24px' }} />
                    <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{cappies}</span>
                </div>
            </header>

            <main>
                {/* Beschikbaar */}
                <section style={{ marginBottom: '3rem' }}>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <ShoppingBag size={24} /> Nieuwe Avatars
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        {opVoorraad.map(avatar => (
                            <div key={avatar.id} className="card" style={{ textAlign: 'center', padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <img src={avatar.afbeelding_url} alt={avatar.naam} style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '1rem', border: '4px solid #f0f0f0' }} />
                                <h3 style={{ margin: '0 0 0.5rem 0' }}>{avatar.naam}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1.5rem' }}>
                                    <img src="/cappycoin.png" alt="Cappy" style={{ width: '18px', height: '18px' }} />
                                    <span style={{ fontWeight: 'bold' }}>{avatar.prijs}</span>
                                </div>
                                <button
                                    className="btn btn-primary"
                                    style={{ width: '100%' }}
                                    onClick={() => koopAvatar(avatar)}
                                    disabled={bezig || cappies < avatar.prijs}
                                >
                                    Koop nu
                                </button>
                            </div>
                        ))}
                        {opVoorraad.length === 0 && <p>Je hebt alle beschikbare avatars al!</p>}
                    </div>
                </section>

                {/* Mijn Collectie */}
                <section>
                    <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Star size={24} color="var(--primary-color)" /> Mijn Collectie
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                        {alInBezit.map(avatar => {
                            const isActief = user?.actieve_avatar_id === avatar.id;
                            return (
                                <div key={avatar.id} className="card" style={{
                                    textAlign: 'center',
                                    padding: '1.5rem',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    border: isActief ? '4px solid var(--primary-color)' : '1px solid #eee',
                                    background: isActief ? 'rgba(14, 165, 233, 0.05)' : '#fff'
                                }}>
                                    {isActief && (
                                        <div style={{ position: 'absolute', top: '10px', right: '10px', color: 'var(--primary-color)' }}>
                                            <CheckCircle size={24} fill="currentColor" color="white" />
                                        </div>
                                    )}
                                    <img src={avatar.afbeelding_url} alt={avatar.naam} style={{ width: '120px', height: '120px', borderRadius: '50%', marginBottom: '1rem' }} />
                                    <h3 style={{ margin: '0 0 1rem 0' }}>{avatar.naam}</h3>
                                    {isActief ? (
                                        <span style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>Huidige Avatar</span>
                                    ) : (
                                        <button
                                            className="btn btn-outline"
                                            style={{ width: '100%' }}
                                            onClick={() => setActief(avatar.id)}
                                            disabled={bezig}
                                        >
                                            Gebruiken
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </section>
            </main>
        </div>
    );
}
