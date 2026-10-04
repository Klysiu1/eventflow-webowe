import { ArrowRight, ShieldCheck } from 'lucide-react';
import { formatNumber } from '../utils/monitoring';

export default function SimulationFlow({ result, context }) {
    const flow = result.flow;
    if (!flow) return null;

    const source = context.zones.find(zone => zone.id === flow.sourceZoneId);
    const destinations = flow.destinationZoneIds.map(id => context.zones.find(zone => zone.id === id)?.name).filter(Boolean);
    const impact = result.zones.reduce((highest, zone) => {
        if (!highest) return zone;
        const zDelta = zone.afterPercent - zone.beforePercent;
        const hDelta = highest.afterPercent - highest.beforePercent;
        if (zDelta > hDelta) return zone;
        if (zDelta === hDelta && zone.afterPercent > highest.afterPercent) return zone;
        return highest;
    }, null);
    const change = impact ? Math.round((impact.afterPercent - impact.beforePercent) * 10) / 10 : null;
    const shortDestinations = flow.destinationZoneIds.map(id => { const zone = context.zones.find(item => item.id === id); return zone?.shortName ?? zone?.name; }).filter(Boolean);
    const steps = [
        { tone: 'source', title: source?.name ?? 'Brak danych strefy', shortTitle: source?.shortName ?? source?.name, description: flow.sourceAction },
        { tone: 'redirect', title: destinations.join(' i ') || 'Brak danych przejść', shortTitle: shortDestinations.join(' i '), description: 'Przekierowanie ruchu' },
        { tone: 'impact', title: impact?.name ?? 'Brak danych obciążenia', shortTitle: impact?.zoneId === 'demo-parking' ? 'Strefa D' : impact?.name, description: impact ? `Zmiana ${change > 0 ? '+' : ''}${formatNumber(change)} p.p. · obciążenie ${formatNumber(impact.afterPercent)}%` : 'Brak wyniku dla stref' },
    ];

    return (
        <section className="simulation-flow" aria-labelledby="simulation-flow-title">
            <div className="simulation-flow-heading">
                <h2 id="simulation-flow-title"><span className="mobile-section-number mobile-only">02</span> Przewidywany przepływ</h2>
                <span className="monitoring-muted">Analiza przepływu</span>
            </div>
            <ol className="simulation-flow-steps" aria-label="Etapy przepływu">
                {steps.map((step, index) => <li key={step.tone} className="simulation-flow-step">
                    <div className={`simulation-flow-card ${step.tone}`}>
                        <span className="simulation-flow-number" aria-hidden="true">{index + 1}</span>
                        <h3 aria-label={step.title}><span className="desktop-nav-label">{step.title}</span><span className="mobile-only">{step.shortTitle || step.title}</span></h3>
                        <p>{step.description}</p>
                    </div>
                    {index < steps.length - 1 && <ArrowRight className="simulation-flow-arrow" size={24} aria-hidden="true" />}
                </li>)}
            </ol>
            <aside className="simulation-flow-recommendation" aria-labelledby="simulation-recommendation-title">
                <ShieldCheck size={24} aria-hidden="true" />
                <div><h3 id="simulation-recommendation-title">Zalecane działania</h3><p>{flow.recommendation}</p></div>
            </aside>
        </section>
    );
}
