import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatNumber, formatPercent, getZoneStatus } from '../utils/monitoring';

export default function ZoneCard({ zone, status = getZoneStatus(zone), detailsTo = `/map/${encodeURIComponent(zone.id)}`, hideAlerts = false }) {
    return (
        <article className="monitoring-zone" style={{ '--zone-color': status.color }}>
            <span className={`monitoring-badge ${status.level}`}>{status.label}</span>
            <h2>{zone.name}</h2>
            <p className="monitoring-percent">{formatPercent(status.percent)}</p>
            <p className="monitoring-muted">{formatNumber(zone.current_count)} / {formatNumber(zone.capacity)} osób</p>
            <div className="monitoring-progress" role="meter" aria-label={`Zapełnienie: ${zone.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(status.percent ?? 0, 100)} aria-valuetext={formatPercent(status.percent)}>
                <span style={{ width: `${Math.min(status.percent ?? 0, 100)}%` }} />
            </div>
            <Link className="monitoring-zone-link" to={detailsTo}>Szczegóły strefy <ArrowUpRight size={16} aria-hidden="true" /></Link>
            {!hideAlerts && <Link className="monitoring-zone-link" to={`/alerts?zone=${encodeURIComponent(zone.id)}`}>Alerty strefy <ArrowUpRight size={16} aria-hidden="true" /></Link>}
        </article>
    );
}
