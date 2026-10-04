import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { ChartNoAxesCombined, ChevronRight, DoorClosed, FlaskConical, LoaderCircle, Music2, Play, RotateCcw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getSimulationContext, runSimulation, validateSimulationInput } from '../api/simulation';
import { formatNumber } from '../utils/monitoring';
import SimulationFlow from '../components/SimulationFlow';
import './monitoring.css';
import './simulation.css';

const scenarios = [
    { id: 'entrance_closure', name: 'Zamknięcie wejścia', Icon: DoorClosed, zoneType: 'entrance', people: '4800', duration: '10' },
    { id: 'concert_end', name: 'Koniec koncertu', Icon: Music2, zoneType: 'stage', people: '7800', duration: '10' },
];

function initialForm(context, scenario = scenarios[0]) {
    return { scenario: scenario.id, zoneId: context.zones.find(zone => zone.type === scenario.zoneType)?.id ?? '', peopleCount: scenario.people, durationMinutes: scenario.duration };
}

const mobileSnapshot = () => window.matchMedia('(max-width: 767px)').matches;
const subscribeMobile = listener => {
    const media = window.matchMedia('(max-width: 767px)');
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
};

export default function SimulationPage() {
    const isMobile = useSyncExternalStore(subscribeMobile, mobileSnapshot, () => false);
    const [context, setContext] = useState(null);
    const [form, setForm] = useState(null);
    const [result, setResult] = useState(null);
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [phase, setPhase] = useState('loading');
    const [reload, setReload] = useState(0);
    const [parametersExpanded, setParametersExpanded] = useState(false);
    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const activeRequest = useRef(null);
    const resultsHeading = useRef(null);

    useEffect(() => {
        const controller = new AbortController();
        getSimulationContext({ signal: controller.signal }).then(data => {
            if (controller.signal.aborted) return;
            setContext(data);
            setForm(initialForm(data));
            setError(null);
            setPhase('ready');
        }).catch(() => {
            if (!controller.signal.aborted) {
                setError('Nie udało się pobrać scenariuszy. Spróbuj ponownie.');
                setPhase('error');
            }
        });
        return () => { controller.abort(); activeRequest.current?.abort(); };
    }, [reload]);

    useEffect(() => {
        if (result) resultsHeading.current?.focus({ preventScroll: true });
    }, [result]);

    const changeForm = changes => {
        setForm(previous => ({ ...previous, ...changes }));
        setErrors({});
        setError(null);
        setResult(null);
        setPhase('ready');
        setDetailsExpanded(false);
    };

    const reset = () => {
        setParametersExpanded(false);
        setDetailsExpanded(false);
        activeRequest.current?.abort();
        activeRequest.current = null;
        setForm(initialForm(context));
        setResult(null);
        setErrors({});
        setError(null);
        setPhase('ready');
    };

    const submit = async event => {
        event.preventDefault();
        if (phase === 'running') return;
        const input = { eventId: context.event.id, scenario: form.scenario, zoneId: form.zoneId, peopleCount: Number(form.peopleCount), durationMinutes: Number(form.durationMinutes) };
        const nextErrors = validateSimulationInput(input, context);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) { setParametersExpanded(true); return; }
        const controller = new AbortController();
        activeRequest.current = controller;
        setPhase('running');
        setError(null);
        setResult(null);
        try {
            const nextResult = await runSimulation(input, { signal: controller.signal });
            if (activeRequest.current !== controller || controller.signal.aborted) return;
            setResult(nextResult);
            setPhase('complete');
        } catch {
            if (activeRequest.current !== controller || controller.signal.aborted) return;
            setError('Nie udało się uruchomić symulacji. Spróbuj ponownie.');
            setPhase('error');
        } finally {
            if (activeRequest.current === controller) activeRequest.current = null;
        }
    };

    if (!context || !form) return (
        <div className="monitoring-page simulation-page">
            <h1 className="text-2xl font-bold mb-6">Symulacja</h1>
            {error ? <div role="alert"><p>{error}</p><button className="simulation-button mt-4" onClick={() => { setError(null); setPhase('loading'); setReload(value => value + 1); }}><RotateCcw size={16} aria-hidden="true" />Spróbuj ponownie</button></div> : <p role="status">Ładowanie scenariuszy…</p>}
        </div>
    );

    const scenario = scenarios.find(item => item.id === form.scenario);
    const zones = context.zones.filter(zone => zone.type === scenario.zoneType);
    const resultZone = result && context.zones.find(zone => zone.id === result.parameters.zoneId);

    return (
        <div className="monitoring-page simulation-page">
            <header className="monitoring-header">
                <div><p className="monitoring-eyebrow">{context.event.name}</p><h1>Symulacja „co jeśli?”</h1><p className="monitoring-muted">Planowanie scenariuszy wydarzenia</p></div>
                {context.mode === 'demo' && <span className="simulation-demo-label"><FlaskConical size={16} aria-hidden="true" />Dane demonstracyjne</span>}
            </header>

            <div className="simulation-workspace">
                <form className="simulation-form" onSubmit={submit} noValidate aria-label="Parametry symulacji">
                    <fieldset disabled={phase === 'running'}>
                        <legend><span className="mobile-section-number mobile-only">01</span> Scenariusz</legend>
                        <button type="button" className="mobile-disclosure-toggle simulation-parameters-toggle" aria-expanded={parametersExpanded} aria-controls="simulation-parameters" onClick={() => setParametersExpanded(value => !value)}>{parametersExpanded ? 'Zwiń parametry' : 'Zmień parametry'}</button>
                        <div className="simulation-scenarios">
                            {scenarios.map(({ id, name, Icon }, index) => (
                                <label key={id} className={`simulation-scenario ${form.scenario === id ? 'selected' : ''}`}>
                                    <input type="radio" name="scenario" value={id} checked={form.scenario === id} onChange={() => changeForm(initialForm(context, scenarios.find(item => item.id === id)))} />
                                    <Icon size={22} aria-hidden="true" /><span className="simulation-scenario-letter mobile-only" aria-hidden="true">{index === 0 ? 'A' : 'B'}</span><span className="simulation-scenario-name">{name}</span><small className="simulation-scenario-description mobile-only">{id === 'entrance_closure' ? 'Przekierowanie ruchu' : 'Uczestnicy opuszczają scenę'}</small><span className="simulation-selection mobile-only" aria-hidden="true">Wybrany</span>
                                </label>
                            ))}
                        </div>
                        <div id="simulation-parameters" className={`simulation-fields ${parametersExpanded ? 'mobile-expanded' : ''}`}>
                            <label htmlFor="simulation-zone">{form.scenario === 'entrance_closure' ? 'Wejście do zamknięcia' : 'Strefa koncertu'}</label>
                            <select id="simulation-zone" value={form.zoneId} onChange={e => changeForm({ zoneId: e.target.value })} aria-invalid={Boolean(errors.zoneId)} aria-describedby={errors.zoneId ? 'zone-error' : undefined}>
                                {!zones.length && <option value="">Brak dostępnych stref</option>}
                                {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                            </select>
                            {errors.zoneId && <p id="zone-error" className="simulation-field-error" role="alert">{errors.zoneId}</p>}
                            <label htmlFor="simulation-people">Liczba osób</label>
                            <div className="simulation-input-unit"><input id="simulation-people" type="number" min="1" max="100000" step="1" value={form.peopleCount} onChange={e => changeForm({ peopleCount: e.target.value })} aria-invalid={Boolean(errors.peopleCount)} aria-describedby={errors.peopleCount ? 'people-error' : undefined} /><span>osób</span></div>
                            {errors.peopleCount && <p id="people-error" className="simulation-field-error" role="alert">{errors.peopleCount}</p>}
                            <label htmlFor="simulation-duration">Czas scenariusza</label>
                            <div className="simulation-input-unit"><input id="simulation-duration" type="number" min="1" max="120" step="1" value={form.durationMinutes} onChange={e => changeForm({ durationMinutes: e.target.value })} aria-invalid={Boolean(errors.durationMinutes)} aria-describedby={errors.durationMinutes ? 'duration-error' : undefined} /><span>min</span></div>
                            {errors.durationMinutes && <p id="duration-error" className="simulation-field-error" role="alert">{errors.durationMinutes}</p>}
                        </div>
                    </fieldset>
                    {error && <p className="monitoring-error" role="alert">{error}</p>}
                    <div className="simulation-actions">
                        <button type="submit" className="simulation-button primary" disabled={phase === 'running' || !zones.length}>{phase === 'running' ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}{phase === 'running' ? 'Uruchamianie…' : 'Uruchom symulację'}</button>
                        <button type="button" className="simulation-button" onClick={reset} title="Resetuj parametry i wyniki"><RotateCcw size={17} aria-hidden="true" />Resetuj</button>
                    </div>
                </form>

                <section className="simulation-results" aria-labelledby="simulation-results-title" aria-busy={phase === 'running'}>
                    <div className="simulation-results-heading"><h2 id="simulation-results-title" ref={resultsHeading} tabIndex={-1}>Wyniki scenariusza</h2><span className="simulation-phase" role="status">{phase === 'running' ? 'Uruchamianie' : result ? 'Gotowe' : 'Oczekuje na uruchomienie'}</span></div>
                    {!result ? <div className="simulation-empty"><ChartNoAxesCombined size={48} strokeWidth={1.25} aria-hidden="true" /><h3>{phase === 'running' ? 'Przygotowywanie wyników…' : 'Brak wyników'}</h3><p>{phase === 'running' ? 'Scenariusz jest w trakcie przetwarzania.' : 'Nie uruchomiono jeszcze scenariusza.'}</p><div className="simulation-empty-labels"><span>Obciążenie</span><span>Zagrożone strefy</span><span>Czas do przeciążenia</span></div></div> : <>
                        <p className="simulation-result-caption"><FlaskConical size={15} aria-hidden="true" />Kalkulacja dynamiczna · model inżynierii tłumu (Fruin LoS / Green Guide)</p>
                        <p className="simulation-run-summary">{scenarios.find(item => item.id === result.parameters.scenario)?.name}<ChevronRight size={14} aria-hidden="true" />{resultZone?.name ?? result.parameters.zoneId}<span>{formatNumber(result.parameters.peopleCount)} osób · {result.parameters.durationMinutes} min</span></p>
                        <dl className="simulation-metrics">
                            <div><dt>Szczytowe obciążenie</dt><dd className={result.summary.peakOccupancyPercent >= 90 ? 'text-danger' : result.summary.peakOccupancyPercent >= 70 ? 'text-warning' : 'text-success'}>{result.summary.peakOccupancyPercent}<small>%</small></dd></div>
                            <div><dt>Zagrożone strefy</dt><dd className={result.summary.zonesAtRisk > 0 ? 'text-warning' : 'text-success'}>{result.summary.zonesAtRisk}</dd><dd className="simulation-risk-zones"><span className="desktop-nav-label">{result.zones.filter(zone => zone.afterPercent >= 90).map(zone => zone.name).join(' · ') || 'Brak'}</span><span className="mobile-only">{result.zones.filter(zone => zone.afterPercent >= 90).map(zone => context.zones.find(item => item.id === zone.zoneId)?.shortName || zone.name).join(' · ') || 'Brak'}</span></dd></div>
                            <div><dt>Czas do progu 90%</dt><dd>{result.summary.timeToOverloadMinutes === null ? 'Brak' : <>{result.summary.timeToOverloadMinutes}<small>min</small></>}</dd></div>
                        </dl>
                        <button type="button" className="mobile-disclosure-toggle" aria-expanded={detailsExpanded} aria-controls="simulation-result-details" onClick={() => setDetailsExpanded(value => !value)}>{detailsExpanded ? 'Ukryj szczegóły' : 'Wykres i szczegóły'}</button>
                        <div id="simulation-result-details" className={detailsExpanded ? 'mobile-expanded' : ''}>
                        {(!isMobile || detailsExpanded) && <>
                        <section className="simulation-chart-section" aria-label="Przebieg obciążenia">
                            <div className="simulation-chart-heading"><h3>Przebieg obciążenia</h3><span className="monitoring-muted">Najbardziej obciążona strefa</span></div>
                            {result.timeline.length ? <><div className="simulation-chart">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <LineChart data={result.timeline} margin={{ top: 15, right: 20, bottom: 5, left: -15 }} accessibilityLayer>
                                        <CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false} />
                                        <XAxis dataKey="minute" type="number" domain={['dataMin', 'dataMax']} tickFormatter={value => `${value} min`} tick={{ fill: '#a7b3c5', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={24} />
                                        <YAxis domain={[0, maximum => Math.max(120, Math.ceil(maximum / 20) * 20)]} tickFormatter={value => `${value}%`} tick={{ fill: '#a7b3c5', fontSize: 11 }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #475569', borderRadius: 6, color: '#fff' }} labelFormatter={value => `${value} min`} formatter={value => [`${value}%`, 'Obciążenie']} />
                                        <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="5 5" />
                                        <Line type="linear" dataKey="occupancyPercent" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} activeDot={{ r: 6 }} isAnimationActive={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div><p className="simulation-chart-legend"><i />Próg krytyczny: 90%</p><details className="simulation-chart-data"><summary>Dane wykresu</summary><ul>{result.timeline.map(point => <li key={point.minute}>{point.minute} min: {point.occupancyPercent}%</li>)}</ul></details></> : <p className="monitoring-muted">Brak danych przebiegu.</p>}
                        </section>
                        <section className="simulation-zone-results" aria-label="Zmiana obciążenia stref">
                            <h3>Zmiana obciążenia stref</h3>
                            {result.zones.length ? <div className="simulation-table-scroll"><table><thead><tr><th scope="col">Strefa</th><th scope="col">Przed</th><th scope="col">Po</th><th scope="col">Zmiana</th><th scope="col">Status</th></tr></thead><tbody>{result.zones.map(zone => {
                                const delta = Math.round((zone.afterPercent - zone.beforePercent) * 10) / 10;
                                const level = zone.afterPercent >= 90 ? 'critical' : zone.afterPercent >= 70 ? 'warning' : 'safe';
                                return <tr key={zone.zoneId}><th scope="row">{zone.name}</th><td>{zone.beforePercent}%</td><td>{zone.afterPercent}%</td><td>{delta > 0 ? '+' : ''}{delta} p.p.</td><td><span className={`monitoring-badge ${level}`}>{level === 'critical' ? 'Krytyczna' : level === 'warning' ? 'Uwaga' : 'Bezpieczna'}</span></td></tr>;
                            })}</tbody></table></div> : <p className="monitoring-muted">Brak zmian w strefach.</p>}
                        </section>
                        </>}
                        </div>
                    </>}
                </section>
            </div>
            {result && <SimulationFlow result={result} context={context} />}
        </div>
    );
}
