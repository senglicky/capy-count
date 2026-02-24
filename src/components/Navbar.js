'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User } from 'lucide-react';

export default function Navbar() {
    const [user, setUser] = useState(null);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Haal gebruiker op uit localStorage
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        } else {
            setUser(null);
        }
    }, [pathname]); // Update als we van pagina wisselen

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
        router.push('/login');
    };

    // Verberg Navbar op de login pagina
    if (pathname === '/login') return null;

    return (
        <nav style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
            padding: '0.8rem 2.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.02)'
        }}>
            {/* Linkerkant: Logo & Naam */}
            <div
                onClick={() => {
                    const role = user?.rol;
                    if (role === 'admin') router.push('/admin');
                    else if (role === 'leraar') router.push('/leraar');
                    else router.push('/');
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.01)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <div style={{
                    background: 'rgba(87, 142, 126, 0.1)',
                    padding: '8px',
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <img src="/logo-master.png" alt="Logo" style={{ width: '30px', height: '30px', objectFit: 'contain' }} />
                </div>
                <span style={{
                    fontSize: '1.5rem',
                    fontWeight: '800',
                    color: 'var(--primary-color)',
                    letterSpacing: '-0.5px'
                }}>
                    Capy-Count
                </span>
            </div>

            {/* Rechterkant: Gebruiker & Logout */}
            {user && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        background: 'rgba(241, 245, 249, 0.6)',
                        padding: '0.5rem 1.2rem',
                        borderRadius: '25px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: 'var(--secondary-color)',
                        border: '1px solid rgba(0,0,0,0.03)'
                    }}>
                        <User size={18} color="var(--primary-color)" />
                        <span>Hoi, {user.voornaam}</span>
                    </div>

                    <button
                        onClick={logout}
                        style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '50%',
                            width: '44px',
                            height: '44px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            color: '#94a3b8'
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'var(--error)';
                            e.currentTarget.style.color = 'var(--error)';
                            e.currentTarget.style.background = 'rgba(229, 152, 155, 0.05)';
                            e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = '#e2e8f0';
                            e.currentTarget.style.color = '#94a3b8';
                            e.currentTarget.style.background = 'white';
                            e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Uitloggen"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            )}
        </nav>
    );
}
