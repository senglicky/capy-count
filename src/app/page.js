'use client';

import { useReducer, useState, useEffect } from 'react';
import { initiëleStaat, reducer } from './state';
import Game from './Game';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { LogOut, Star } from 'lucide-react';
import TestSettings from '@/components/TestSettings';

import { berekenMaxCappies } from '@/utils/cappy-utils';

export default function Home() {
  const [staat, dispatch] = useReducer(reducer, initiëleStaat);
  const [bezigMetSpelen, setBezigMetSpelen] = useState(false);
  const [taskOverride, setTaskOverride] = useState(null);
  const [user, setUser] = useState(null);
  const [cappies, setCappies] = useState(0);
  const [hasPendingTasks, setHasPendingTasks] = useState(false);
  const [stats, setStats] = useState({ totaal: 0, gemiddelde: 0 });
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
      haalStatistieken(u.id);
      checkPendingTasks(u.klas_id, u.id);

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
    // Haal zowel cappies als de actieve avatar op
    // We gebruiken de expliciete relatienaam actieve_avatar_id
    const { data, error } = await supabase
      .from('gebruikers')
      .select('cappies, actieve_avatar_id, avatars!gebruikers_actieve_avatar_id_fkey(afbeelding_url)')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Fout bij ophalen cappies/avatar:', error);
    }

    if (data) {
      setCappies(data.cappies);
      // Let op: Supabase nest de data onder de alias/tabelnaam
      // Als de join werkt, staat de afbeelding in data.avatars.afbeelding_url
      const u = JSON.parse(localStorage.getItem('user'));
      const updatedUser = { ...u, ...data };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const haalStatistieken = async (userId) => {
    const { data, error } = await supabase
      .from('oefeningen')
      .select('score, instellingen')
      .eq('student_id', userId);

    if (error) {
      console.error('Fout bij ophalen statistieken:', error);
      return;
    }

    if (data && data.length > 0) {
      const totaalGames = data.length;
      let totaalPunten = 0;
      let totaalMogelijk = 0;

      data.forEach(oefening => {
        totaalPunten += oefening.score;
        // Gebruik aantalVragen uit instellingen, fallback naar 10 als het ontbreekt
        const vragenInDezeOefening = oefening.instellingen?.aantalVragen || 10;
        totaalMogelijk += vragenInDezeOefening;
      });

      const gemiddelde = Math.round((totaalPunten / totaalMogelijk) * 100);
      setStats({ totaal: totaalGames, gemiddelde });
    }
  };

  const checkPendingTasks = async (klasId, userId) => {
    if (!klasId) return;

    // 1. Alle taken voor de klas ophalen
    const { data: alleTaken } = await supabase
      .from('taken')
      .select('id')
      .eq('klas_id', klasId);

    if (!alleTaken || alleTaken.length === 0) return;

    // 2. Reeds gemaakte taken voor deze student ophalen
    const { data: gemaakteOefeningen } = await supabase
      .from('oefeningen')
      .select('taak_id')
      .eq('student_id', userId)
      .not('taak_id', 'is', null);

    const gemaakteIds = gemaakteOefeningen?.map(o => o.taak_id) || [];
    const openTaken = alleTaken.filter(t => !gemaakteIds.includes(t.id));

    setHasPendingTasks(openTaken.length > 0);
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
      if (user) {
        haalCappies(user.id);
        if (typeof haalStatistieken === 'function') haalStatistieken(user.id);
      }
    }} />;
  }

  return (
    <div className="container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ color: 'var(--primary-color)', marginBottom: '0.5rem' }}>Capy-Count</h2>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Maaltafels Oefenen</h1>
          <p>Hoi {user?.voornaam}! Klaar om te oefenen?</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              onClick={() => router.push('/store')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: '#fff',
                padding: '0.4rem 1rem',
                borderRadius: '30px',
                boxShadow: '0 2px 5px rgba(0,0,0,0.1)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                border: '2px solid transparent'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'transparent'; }}
            >
              <img src="/cappycoin.png" alt="Cappy" style={{ width: '24px', height: '24px' }} />
              <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>{cappies}</span>
            </div>

            <button
              className={`btn btn-primary ${hasPendingTasks ? 'btn-pulse' : ''}`}
              style={{ padding: '0.6rem 1.2rem', fontSize: '1rem' }}
              onClick={() => router.push('/taken')}
            >
              Mijn taken
            </button>

            <button
              className="btn btn-outline"
              style={{ padding: '0.6rem', borderRadius: '50%', minWidth: '42px', minHeight: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={logout}
            >
              <LogOut size={18} />
            </button>
          </div>


          {/* Gecombineerd Capy-Paspoort */}
          <div
            onClick={() => router.push('/store')}
            style={{
              background: '#fef3c7', // Papier-achtig geel
              padding: '1.5rem',
              borderRadius: '20px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
              border: '2px solid #d97706',
              textAlign: 'left',
              minWidth: '350px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'center',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              borderBottom: '8px solid #d97706' // Extra dikke onderkant voor "boekje" effect
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {/* Watermerk effect */}
            <div style={{
              position: 'absolute',
              bottom: '-20px',
              right: '-10px',
              opacity: 0.1,
              transform: 'rotate(-15deg)',
              pointerEvents: 'none'
            }}>
              <img src="/cappycoin.png" alt="" style={{ width: '150px' }} />
            </div>

            {/* Pasfoto gedeelte */}
            <div style={{ position: 'relative' }}>
              {user?.avatars?.afbeelding_url ? (
                <img
                  src={user.avatars.afbeelding_url}
                  alt="Je Avatar"
                  style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '10px', // Minder rond voor pasfoto effect
                    border: '3px solid #fff',
                    background: '#fff',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <div style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '10px',
                  border: '3px solid #eee',
                  background: '#f9f9f9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ccc',
                  fontSize: '2rem',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.1)'
                }}>
                  ?
                </div>
              )}
              {/* Stempel effect over foto */}
              <div style={{
                position: 'absolute',
                bottom: '-5px',
                right: '-5px',
                background: 'rgba(217, 119, 6, 0.8)',
                color: 'white',
                fontSize: '0.6rem',
                fontWeight: 'bold',
                padding: '2px 6px',
                borderRadius: '5px',
                transform: 'rotate(-10deg)',
                border: '1px solid white'
              }}>
                GEKEURD
              </div>
            </div>

            {/* Gegevens gedeelte */}
            <div style={{ flex: 1, zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: '0 0 0.8rem 0', fontSize: '1.2rem', color: '#92400e', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
                  PASPOORT
                </h3>
                <Star size={20} color="#d97706" fill="#d97706" />
              </div>

              <div style={{ fontSize: '1rem', color: '#451a03', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                <p style={{ margin: 0, borderBottom: '1px solid rgba(217, 119, 6, 0.2)', paddingBottom: '2px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#b45309', display: 'block', textTransform: 'uppercase' }}>Naam</span>
                  <strong>{user?.voornaam || 'Student'}</strong>
                </p>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                  <p style={{ margin: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: '#b45309', display: 'block', textTransform: 'uppercase' }}>Oefeningen</span>
                    <strong>{stats.totaal}</strong>
                  </p>
                  <p style={{ margin: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: '#b45309', display: 'block', textTransform: 'uppercase' }}>Gem. Score</span>
                    <strong style={{ color: stats.gemiddelde >= 80 ? 'var(--success)' : 'inherit' }}>{stats.gemiddelde}%</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
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
