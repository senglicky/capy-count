'use client';

import { useReducer, useState, useEffect } from 'react';
import { initiëleStaat, reducer } from './state';
import Game from './Game';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import TestSettings from '@/components/TestSettings';

export default function Home() {
  const [staat, dispatch] = useReducer(reducer, initiëleStaat);
  const [bezigMetSpelen, setBezigMetSpelen] = useState(false);
  const [taskOverride, setTaskOverride] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
    } else {
      const u = JSON.parse(savedUser);
      setUser(u);
      dispatch({ type: 'SET_NAAM', waarde: u.voornaam });

      // Check of er een taak klaarstaat om te starten
      const actieveTaak = localStorage.getItem('actieveTaak');
      if (actieveTaak) {
        const taakData = JSON.parse(actieveTaak);
        localStorage.removeItem('actieveTaak');
        // We overschrijven de staat met de taak-instellingen en starten
        // Omdat dispatch asynchroon is, kunnen we beter direct de Game renderen met de taakData
        setTaskOverride(taakData);
        setBezigMetSpelen(true);
      }
    }
  }, []);

  const startOefening = () => {
    if (staat.geselecteerdeTafels.length === 0) {
      alert('Kies minstens één tafel!');
      return;
    }
    setBezigMetSpelen(true);
  };

  const logout = () => {
    localStorage.removeItem('user');
    router.push('/login');
  };

  if (bezigMetSpelen) {
    const instellingen = taskOverride || staat;
    return <Game instellingen={instellingen} opStop={() => {
      setBezigMetSpelen(false);
      setTaskOverride(null);
    }} />;
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Capy-Count</h2>
          <h1>Maaltafels Oefenen</h1>
          <p>Hoi {user?.voornaam}! Klaar om te oefenen?</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-primary" onClick={() => router.push('/taken')}>Mijn taken</button>
          <button className="btn btn-outline" onClick={logout}><LogOut size={20} /></button>
        </div>
      </header>

      <main className="card">
        <section className="section">
          <label className="section-title">Hoe heet je?</label>
          <input
            type="text"
            className="input-field"
            placeholder="Je voornaam..."
            value={staat.naam}
            onChange={(e) => dispatch({ type: 'SET_NAAM', waarde: e.target.value })}
          />
        </section>

        <TestSettings staat={staat} dispatch={dispatch} />

        <div style={{ marginTop: '3rem' }}>
          <button className="btn btn-primary" style={{ fontSize: '2rem', padding: '1.5rem 4rem' }} onClick={startOefening}>
            Start!
          </button>
        </div>
      </main>
    </div>
  );
}
