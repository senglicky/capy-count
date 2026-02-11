'use client';

import { useReducer, useState, useEffect } from 'react';
import { initiëleStaat, reducer } from './state';
import Game from './Game';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import TestSettings from '@/components/TestSettings';

import { berekenMaxCappies } from '@/utils/cappy-utils';

export default function Home() {
  const [staat, dispatch] = useReducer(reducer, initiëleStaat);
  const [bezigMetSpelen, setBezigMetSpelen] = useState(false);
  const [taskOverride, setTaskOverride] = useState(null);
  const [user, setUser] = useState(null);
  const [cappies, setCappies] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
    } else {
      const u = JSON.parse(savedUser);
      setUser(u);
      dispatch({ type: 'SET_NAAM', waarde: u.voornaam });
      haalCappies(u.id);

      // Check of er een taak klaarstaat om te starten
      const actieveTaak = localStorage.getItem('actieveTaak');
      if (actieveTaak) {
        const taakData = JSON.parse(actieveTaak);
        localStorage.removeItem('actieveTaak');
        setTaskOverride(taakData);
        setBezigMetSpelen(true);
      }
    }
  }, []);

  const haalCappies = async (userId) => {
    const { data } = await supabase.from('gebruikers').select('cappies').eq('id', userId).single();
    if (data) setCappies(data.cappies);
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#fff', padding: '0.5rem 1rem', borderRadius: '30px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <img src="/cappycoin.png" alt="Cappy" style={{ width: '24px', height: '24px' }} />
            <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{cappies}</span>
          </div>
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

        <div style={{ marginTop: '3rem', display: 'flex', alignItems: 'center', gap: '2rem' }}>
          <button className="btn btn-primary" style={{ fontSize: '2rem', padding: '1.5rem 4rem' }} onClick={startOefening}>
            Start!
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#666' }}>
            <span>Verdien tot:</span>
            <img src="/cappycoin.png" alt="Cappy" style={{ width: '24px', height: '24px' }} />
            <span style={{ fontWeight: 'bold', fontSize: '1.5rem', color: 'var(--primary-color)' }}>{berekenMaxCappies(staat)}</span>
          </div>
        </div>
      </main>
    </div>
  );
}
