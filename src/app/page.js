'use client';

import { useReducer, useState, useEffect } from 'react';
import { initiëleStaat, reducer } from './state';
import Game from './Game';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Star } from 'lucide-react';
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
      if (u.rol === 'admin') {
        router.push('/admin');
        return;
      }
      if (u.rol === 'leraar') {
        router.push('/leraar');
        return;
      }
      setUser(u);
      dispatch({ type: 'SET_NAAM', waarde: u.voornaam });
      haulCappies(u.id);
      haalStatistieken(u.id);
      checkPendingTasks(u.klas_id, u.id);

      const actieveTaak = localStorage.getItem('actieveTaak');
      if (actieveTaak) {
        const taakData = JSON.parse(actieveTaak);
        localStorage.removeItem('actieveTaak');
        setTaskOverride(taakData);
        setBezigMetSpelen(true);
      }
    }
  }, []);

  const haulCappies = async (userId) => {
    const { data, error } = await supabase
      .from('gebruikers')
      .select('cappies, actieve_avatar_id, avatars!gebruikers_actieve_avatar_id_fkey(afbeelding_url)')
      .eq('id', userId)
      .single();

    if (error) console.error('Fout bij ophalen cappies:', error);

    if (data) {
      setCappies(data.cappies);
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
        const vragenInDezeOefening = oefening.instellingen?.aantalVragen || 10;
        totaalMogelijk += vragenInDezeOefening;
      });

      const gemiddelde = Math.round((totaalPunten / totaalMogelijk) * 100);
      setStats({ totaal: totaalGames, gemiddelde });
    }
  };

  const checkPendingTasks = async (klasId, userId) => {
    if (!klasId) return;
    const { data: alleTaken } = await supabase.from('taken').select('id').eq('klas_id', klasId);
    if (!alleTaken || alleTaken.length === 0) return;
    const { data: gemaakteOefeningen } = await supabase.from('oefeningen').select('taak_id').eq('student_id', userId).not('taak_id', 'is', null);
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

  if (bezigMetSpelen) {
    const instellingen = taskOverride || staat;
    return <Game instellingen={instellingen} opStop={() => {
      setBezigMetSpelen(false);
      setTaskOverride(null);
      if (user) {
        haulCappies(user.id);
        haalStatistieken(user.id);
      }
    }} />;
  }

  return (
    <div className="container" style={{ position: 'relative', minHeight: 'calc(100vh - 70px)', paddingBottom: '4rem', paddingTop: '2.5rem' }}>
      {/* Subtle Background Logo */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        maxWidth: '1000px',
        opacity: 0.02,
        pointerEvents: 'none',
        zIndex: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <img src="/logo-master.png" alt="" style={{ width: '100%', height: 'auto' }} />
      </div>

      <header style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: '3rem',
        flexWrap: 'wrap',
        gap: '2.5rem',
        background: 'rgba(255,255,255,0.7)',
        padding: '2rem',
        borderRadius: '40px',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.03)',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          alignItems: 'center',
          width: '100%',
          maxWidth: '1000px'
        }}>
          {/* Passport Column */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div
              onClick={() => router.push('/store')}
              style={{
                background: '#f1f5f9', // Muted background instead of amber
                padding: '1.2rem 1.8rem',
                borderRadius: '24px',
                boxShadow: '0 12px 35px rgba(0,0,0,0.04)',
                border: '2px solid #cbd5e1', // Soft border
                textAlign: 'left',
                width: '100%',
                maxWidth: '380px',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                gap: '1.5rem',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                borderBottom: '7px solid #94a3b8' // Darker muted bottom
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-6px)';
                e.currentTarget.style.borderColor = 'var(--secondary-color)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderColor = '#cbd5e1';
              }}
            >
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                right: '-20px',
                opacity: 0.05,
                transform: 'rotate(-20deg)',
                pointerEvents: 'none'
              }}>
                <img src="/cappycoin.png" alt="" style={{ width: '160px' }} />
              </div>

              <div style={{ position: 'relative' }}>
                {user?.avatars?.afbeelding_url ? (
                  <img
                    src={user.avatars.afbeelding_url}
                    alt="Avatar"
                    style={{
                      width: '90px',
                      height: '90px',
                      borderRadius: '14px',
                      border: '4px solid #fff',
                      background: '#fff',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.05)',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '90px',
                    height: '90px',
                    borderRadius: '14px',
                    border: '4px solid #eee',
                    background: '#f9f9f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ccc',
                    fontSize: '2rem'
                  }}>
                    ?
                  </div>
                )}
                <div style={{
                  position: 'absolute',
                  bottom: '-8px',
                  right: '-8px',
                  background: 'var(--secondary-color)', // Muted blue instead of amber
                  color: 'white',
                  fontSize: '0.6rem',
                  fontWeight: '900',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  transform: 'rotate(-12deg)',
                  border: '2px solid white',
                  boxShadow: '2px 2px 5px rgba(0,0,0,0.05)'
                }}>
                  GEKEURD
                </div>
              </div>

              <div style={{ flex: 1, zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--secondary-color)', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '900' }}>
                    PASPOORT
                  </h3>
                  <Star size={18} color="var(--primary-color)" fill="var(--primary-color)" />
                </div>

                <div style={{ fontSize: '0.9rem', color: 'var(--text-color)', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <div style={{ borderBottom: '2px solid rgba(0, 0, 0, 0.05)', paddingBottom: '3px' }}>
                    <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', textTransform: 'uppercase', fontWeight: 'bold' }}>Naam</span>
                    <strong style={{ fontSize: '1.2rem' }}>{user?.voornaam || 'Student'}</strong>
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Games</span>
                      <strong>{stats.totaal}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Gem. Score</span>
                      <strong style={{ color: stats.gemiddelde >= 80 ? 'var(--success)' : 'inherit', fontSize: '1rem' }}>{stats.gemiddelde}%</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* New Simplified Action Column */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', alignItems: 'center' }}>
            {/* Wallet */}
            <div
              onClick={() => router.push('/store')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem',
                background: '#fff',
                padding: '1rem 2rem',
                borderRadius: '30px',
                boxShadow: '0 8px 20px rgba(0,0,0,0.03)',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                border: '2px solid #e2e8f0', // Soft border
                minWidth: '150px',
                justifyContent: 'center'
              }}
              onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = 'var(--primary-color)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
            >
              <img src="/cappycoin.png" alt="Cappy" style={{ width: '38px', height: '38px' }} />
              <span style={{ fontWeight: '950', fontSize: '2rem', color: 'var(--text-color)' }}>{cappies}</span>
            </div>

            {/* Tasks Button */}
            <button
              className={`btn btn-primary ${hasPendingTasks ? 'btn-pulse' : ''}`}
              style={{
                padding: '1rem 2.5rem',
                fontSize: '1.4rem',
                borderRadius: '35px',
                fontWeight: '900',
                boxShadow: '0 12px 25px rgba(87, 142, 126, 0.2)', // Updated shadow color
                minWidth: '220px'
              }}
              onClick={() => router.push('/taken')}
            >
              Mijn taken
            </button>
          </div>
        </div>
      </header>

      <main className="card" style={{
        padding: '3rem',
        position: 'relative',
        zIndex: 1,
        background: 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(15px)',
        borderRadius: '40px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.04)',
        border: '1px solid rgba(255,255,255,0.5)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          <TestSettings staat={staat} dispatch={dispatch} />
        </div>

        <div style={{
          marginTop: '4rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1.8rem',
          background: 'rgba(248, 250, 252, 0.4)',
          padding: '3.5rem',
          borderRadius: '35px',
          border: '2px dashed #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.4rem', color: '#64748b', fontWeight: '500' }}>Je kunt hiermee tot wel</span>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              background: '#fff',
              padding: '0.6rem 1.8rem',
              borderRadius: '25px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.03)',
              border: '2px solid rgba(87, 142, 126, 0.1)'
            }}>
              <img src="/cappycoin.png" alt="Cappy" style={{ width: '32px', height: '32px' }} />
              <span style={{ fontWeight: '950', fontSize: '2.2rem', color: 'var(--primary-color)' }}>{berekenMaxCappies(staat)}</span>
            </div>
            <span style={{ fontSize: '1.4rem', color: '#64748b', fontWeight: '500' }}>cappies verdienen!</span>
          </div>

          <button
            className="btn btn-primary"
            style={{
              fontSize: '2.5rem',
              padding: '1.5rem 8rem',
              boxShadow: '0 20px 50px -5px rgba(87, 142, 126, 0.3)',
              transform: 'translateY(0)',
              transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.4)',
              borderRadius: '60px',
              fontWeight: '900',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
            onClick={startOefening}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.boxShadow = '0 30px 60px -5px rgba(87, 142, 126, 0.4)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 50px -5px rgba(87, 142, 126, 0.3)'; }}
          >
            Start de Oefening!
          </button>
        </div>
      </main>
    </div>
  );
}
