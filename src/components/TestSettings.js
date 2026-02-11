'use client';

export default function TestSettings({ staat, dispatch }) {
    return (
        <>
            <section className="section">
                <label className="section-title">Welke tafels wil je oefenen?</label>
                <div className="button-grid">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                            key={num}
                            className={`btn btn-outline ${staat.geselecteerdeTafels.includes(num) ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'TOGGLE_TAFEL', waarde: num })}
                        >
                            {num}
                        </button>
                    ))}
                </div>
            </section>

            <section className="section">
                <label className="section-title">Enkel vermenigvuldigen of ook delen?</label>
                <div className="option-group">
                    <button
                        className={`btn btn-outline ${staat.operaties === 'maal' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_OPERATIES', waarde: 'maal' })}
                    >
                        Alleen x
                    </button>
                    <button
                        className={`btn btn-outline ${staat.operaties === 'beide' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_OPERATIES', waarde: 'beide' })}
                    >
                        x en ÷
                    </button>
                </div>
            </section>

            <section className="section">
                <label className="section-title">Hoe wil je oefenen?</label>
                <div className="option-group">
                    <button
                        className={`btn btn-outline ${staat.modus === 'vrij' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_MODUS', waarde: 'vrij' })}
                    >
                        Vrij
                    </button>
                    <button
                        className={`btn btn-outline ${staat.modus === '2m' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_MODUS', waarde: '2m' })}
                    >
                        2 min
                    </button>
                    <button
                        className={`btn btn-outline ${staat.modus === '1m' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_MODUS', waarde: '1m' })}
                    >
                        1 min
                    </button>
                    <button
                        className={`btn btn-outline ${staat.modus === '30s' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_MODUS', waarde: '30s' })}
                    >
                        30 sec
                    </button>
                </div>
            </section>

            <section className="section">
                <label className="section-title">Tot hoe ver?</label>
                <div className="option-group">
                    <button
                        className={`btn btn-outline ${staat.bereik === 10 ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_BEREIK', waarde: 10 })}
                    >
                        Tot x10
                    </button>
                    <button
                        className={`btn btn-outline ${staat.bereik === 20 ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_BEREIK', waarde: 20 })}
                    >
                        Tot x20
                    </button>
                </div>
            </section>

            <section className="section">
                <label className="section-title">Wanneer wil je de verbetering zien?</label>
                <div className="option-group">
                    <button
                        className={`btn btn-outline ${staat.correctie === 'direct' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_CORRECTIE', waarde: 'direct' })}
                    >
                        Meteen (2de kans)
                    </button>
                    <button
                        className={`btn btn-outline ${staat.correctie === 'einde' ? 'active' : ''}`}
                        onClick={() => dispatch({ type: 'SET_CORRECTIE', waarde: 'einde' })}
                    >
                        Aan het einde
                    </button>
                </div>
            </section>

            <section className="section">
                <label className="section-title">Hoeveel vragen?</label>
                <div className="option-group">
                    {[10, 20, 30, 50].map((n) => (
                        <button
                            key={n}
                            className={`btn btn-outline ${staat.aantalVragen === n ? 'active' : ''}`}
                            onClick={() => dispatch({ type: 'SET_AANTAL', waarde: n })}
                        >
                            {n}
                        </button>
                    ))}
                </div>
            </section>
        </>
    );
}
