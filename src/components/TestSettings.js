'use client';

export default function TestSettings({ staat, dispatch }) {
    return (
        <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                <div className="settings-col">
                    <section className="section" style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                            <label className="section-title" style={{ marginBottom: 0 }}>Welke tafels?</label>
                            <button
                                className="btn btn-outline"
                                style={{ fontSize: '0.8rem', padding: '0.3rem 0.8rem' }}
                                onClick={() => dispatch({ type: 'SELECT_ALLE_TAFELS' })}
                            >
                                {staat.geselecteerdeTafels.length === 10 ? 'Selectie wissen' : 'Alles selecteren'}
                            </button>
                        </div>
                        <div className="button-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                                <button
                                    key={num}
                                    className={`btn btn-outline ${staat.geselecteerdeTafels.includes(num) ? 'active' : ''}`}
                                    onClick={() => dispatch({ type: 'TOGGLE_TAFEL', waarde: num })}
                                    style={{ padding: '0.8rem 0.2rem', fontSize: '1.1rem' }}
                                >
                                    {num}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="section" style={{ marginBottom: '1.5rem' }}>
                        <label className="section-title">Wat wil je doen?</label>
                        <div className="option-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                className={`btn btn-outline ${staat.operaties === 'maal' ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_OPERATIES', waarde: 'maal' })}
                                style={{ padding: '0.8rem' }}
                            >
                                Alleen x
                            </button>
                            <button
                                className={`btn btn-outline ${staat.operaties === 'beide' ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_OPERATIES', waarde: 'beide' })}
                                style={{ padding: '0.8rem' }}
                            >
                                x en ÷
                            </button>
                        </div>
                    </section>

                    <section className="section">
                        <label className="section-title">Tot hoe ver?</label>
                        <div className="option-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                className={`btn btn-outline ${staat.bereik === 10 ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_BEREIK', waarde: 10 })}
                                style={{ padding: '0.8rem' }}
                            >
                                Tot x10
                            </button>
                            <button
                                className={`btn btn-outline ${staat.bereik === 20 ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_BEREIK', waarde: 20 })}
                                style={{ padding: '0.8rem' }}
                            >
                                Tot x20
                            </button>
                        </div>
                    </section>
                </div>

                <div className="settings-col">
                    <section className="section" style={{ marginBottom: '1.5rem' }}>
                        <label className="section-title">Hoe lang?</label>
                        <div className="option-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            {[
                                { id: 'vrij', label: 'Vrij' },
                                { id: '2m', label: '2 min' },
                                { id: '1m', label: '1 min' },
                                { id: '30s', label: '30 sec' }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    className={`btn btn-outline ${staat.modus === m.id ? 'active' : ''}`}
                                    onClick={() => dispatch({ type: 'SET_MODUS', waarde: m.id })}
                                    style={{ padding: '0.8rem' }}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="section" style={{ marginBottom: '1.5rem' }}>
                        <label className="section-title">Verbetering?</label>
                        <div className="option-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <button
                                className={`btn btn-outline ${staat.correctie === 'direct' ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_CORRECTIE', waarde: 'direct' })}
                                style={{ padding: '0.8rem', fontSize: '0.9rem' }}
                            >
                                Meteen (2de kans)
                            </button>
                            <button
                                className={`btn btn-outline ${staat.correctie === 'einde' ? 'active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_CORRECTIE', waarde: 'einde' })}
                                style={{ padding: '0.8rem', fontSize: '0.9rem' }}
                            >
                                Aan het einde
                            </button>
                        </div>
                    </section>

                    <section className="section">
                        <label className="section-title">Hoeveel vragen?</label>
                        <div className="option-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                            {[10, 20, 30, 50].map((n) => (
                                <button
                                    key={n}
                                    className={`btn btn-outline ${staat.aantalVragen === n ? 'active' : ''}`}
                                    onClick={() => dispatch({ type: 'SET_AANTAL', waarde: n })}
                                    style={{ padding: '0.8rem 0.2rem' }}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}
