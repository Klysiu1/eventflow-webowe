import { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getDemoZoneHistory } from '../api/eventWorkspace';

export default function ZoneHistory({ eventId, zone }) {
    const [history, setHistory] = useState(null);
    const [error, setError] = useState('');
    const [range, setRange] = useState(60);
    useEffect(() => {
        let cancelled = false;
        getDemoZoneHistory(eventId, zone.id).then(result => { if (!cancelled) setHistory(result); }).catch(reason => { if (!cancelled) setError(reason.message); });
        return () => { cancelled = true; };
    }, [eventId, zone.id]);
    if (error) return <p className="monitoring-error" role="alert">{error}</p>;
    if (!history) return <p role="status">Ładowanie historii...</p>;
    if (!history.samples.length) return <p className="monitoring-empty">Brak próbek historii dla tej strefy. Nowe strefy nie otrzymują fikcyjnego ruchu.</p>;
    const end = Date.parse(history.samples.at(-1).logged_at);
    const samples = history.samples.filter(sample => Date.parse(sample.logged_at) >= end - range * 60000).map(sample => ({ ...sample, time: new Date(sample.logged_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }), percent: Math.round(sample.count / zone.capacity * 1000) / 10 }));
    return <><div className="monitoring-section-heading"><p className="monitoring-muted">Przykładowe pomiary · {new Date(end).toLocaleDateString('pl-PL')} · czas lokalny</p><div className="monitoring-segments" role="group" aria-label="Zakres historii">{[30, 60].map(minutes => <button key={minutes} aria-pressed={range === minutes} onClick={() => setRange(minutes)}>{minutes} min</button>)}</div></div><div className="zone-history-chart" role="img" aria-label={`Historia obciążenia: od ${samples[0].percent}% do ${samples.at(-1).percent}%. Przykładowe dane.`}><ResponsiveContainer width="100%" height="100%"><AreaChart data={samples} margin={{ top: 15, right: 15, left: 0, bottom: 5 }}><CartesianGrid stroke="#334155" strokeDasharray="3 3" /><XAxis dataKey="time" stroke="#a7b3c5" minTickGap={30} tick={{ fontSize: 12 }} /><YAxis stroke="#a7b3c5" width={45} domain={[0, max => Math.max(100, max)]} unit="%" tick={{ fontSize: 12 }} /><Tooltip contentStyle={{ background: '#1A202C', border: '1px solid #475569', borderRadius: 6 }} formatter={(value, name, props) => [`${value}% (${props.payload.count} osób)`, name]} /><ReferenceLine y={70} stroke="#D69E2E" strokeDasharray="5 4" /><ReferenceLine y={zone.alert_threshold ?? 90} stroke="#E53E3E" strokeDasharray="5 4" /><Area type="monotone" dataKey="percent" name="Obciążenie" stroke="#60a5fa" fill="#3182CE" fillOpacity={.18} strokeWidth={2} isAnimationActive={false} /></AreaChart></ResponsiveContainer></div><details className="history-table"><summary>Dane pomiarów</summary><div className="workspace-table-scroll"><table><thead><tr><th>Godzina</th><th>Osoby</th><th>Obciążenie</th></tr></thead><tbody>{samples.map(sample => <tr key={sample.logged_at}><td>{sample.time}</td><td>{sample.count.toLocaleString('pl-PL')}</td><td>{sample.percent}%</td></tr>)}</tbody></table></div></details></>;
}
