import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, CheckCircle2, ChevronDown, Search } from 'lucide-react';
import { useEventStore } from '../store/useEventStore';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { alertTime, formatAlertTime, formatNumber, formatPercent, getZoneStatus } from '../utils/monitoring';
import MonitoringHeader from '../components/MonitoringHeader';
import MobileControls from '../components/MobileControls';
import './monitoring.css';
import './local-workspace.css';

export default function AlertsPage() {
    const event = useEventStore(state => state.events[0]);
    const alerts = useEventStore(state => state.alerts);
    const status = useMonitoringData(event?.id);
    const [params, setParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState('all');
    const [sort, setSort] = useState('priority');
    if (!event) return null;

    const zoneId = params.get('zone') || 'all';
    const zones = new Map(event.zones.map(zone => [zone.id, zone]));
    const activeAlerts = [...new Map(alerts.filter(alert => !alert.resolved_at).map(alert => [alert.id, alert])).values()];
    const critical = activeAlerts.filter(alert => alert.level === 'critical').length;
    const filtered = activeAlerts.filter(alert => {
        const zone = zones.get(alert.zone_id);
        return (level === 'all' || alert.level === level) && (zoneId === 'all' || alert.zone_id === zoneId) && `${alert.message} ${zone?.name ?? ''}`.toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl'));
    }).sort((a, b) => {
        const priority = sort === 'priority' ? Number(b.level === 'critical') - Number(a.level === 'critical') : 0;
        return priority || alertTime(b.triggered_at) - alertTime(a.triggered_at);
    });
    const clearFilters = () => { setSearch(''); setLevel('all'); setParams({}); };

    return (
        <div className="monitoring-page">
            <MonitoringHeader title="Aktywne alerty" event={event} status={status} />
            <nav className="local-source-nav" aria-label="Źródło alertów"><Link to="/alerts" aria-current="page">Dane z API</Link><Link to="/alerts/demo">Demo lokalne</Link></nav>
            <p className="local-notice">Historia, checklisty i zamykanie zgłoszeń są na razie dostępne w trybie demo. Ten widok pokazuje rzeczywiste aktywne alerty z API.</p>
            <MobileControls>
            <dl className="monitoring-stats">
                <div><dt>Aktywne alerty</dt><dd>{activeAlerts.length}</dd></div>
                <div><dt>Krytyczne</dt><dd className="text-danger">{critical}</dd></div>
                <div><dt>Ostrzeżenia</dt><dd className="text-warning">{activeAlerts.filter(alert => alert.level === 'warning').length}</dd></div>
                <div><dt>Strefy z alertem</dt><dd>{new Set(activeAlerts.map(alert => alert.zone_id)).size}</dd></div>
            </dl>
            <div className="monitoring-toolbar">
                <label className="monitoring-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Szukaj alertu" placeholder="Szukaj alertu lub strefy…" value={search} onChange={e => setSearch(e.target.value)} /></label>
                <label className="monitoring-select">Strefa<select aria-label="Strefa" value={zoneId} onChange={e => setParams(e.target.value === 'all' ? {} : { zone: e.target.value })}><option value="all">Wszystkie strefy</option>{event.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}{zoneId !== 'all' && !zones.has(zoneId) && <option value={zoneId}>Nieznana strefa</option>}</select></label>
                <label className="monitoring-select">Sortowanie<select aria-label="Sortowanie" value={sort} onChange={e => setSort(e.target.value)}><option value="priority">Najwyższy priorytet</option><option value="newest">Najnowsze</option></select></label>
            </div>
            <div className="monitoring-section-heading">
                <div className="monitoring-segments" role="group" aria-label="Poziom alertów">
                    <button aria-pressed={level === 'all'} onClick={() => setLevel('all')}>Wszystkie</button>
                    <button aria-pressed={level === 'critical'} onClick={() => setLevel('critical')}>Krytyczne</button>
                    <button aria-pressed={level === 'warning'} onClick={() => setLevel('warning')}>Ostrzeżenia</button>
                </div>
                <p className="monitoring-muted" role="status">Wyniki: {filtered.length}</p>
            </div>
            </MobileControls>
            {!status.updatedAt && status.loading && <p role="status" className="monitoring-empty">Pobieranie aktywnych alertów…</p>}
            {!filtered.length && status.updatedAt && <div className="monitoring-empty"><CheckCircle2 size={32} className={activeAlerts.length ? '' : 'text-safe'} aria-hidden="true" /><h2>{activeAlerts.length ? 'Brak pasujących alertów' : 'Brak aktywnych alertów'}</h2><p>{activeAlerts.length ? 'Zmień filtry, aby zobaczyć pozostałe zgłoszenia.' : 'Nie zarejestrowano aktywnych alertów dla tego wydarzenia.'}</p>{(search || level !== 'all' || zoneId !== 'all') && <button className="monitoring-text-button" onClick={clearFilters}>Wyczyść filtry</button>}</div>}
            <section className="monitoring-alert-list" aria-label="Lista aktywnych alertów">
                {filtered.map(alert => {
                    const zone = zones.get(alert.zone_id);
                    const isCritical = alert.level === 'critical';
                    return (
                        <details key={alert.id} className={`monitoring-alert ${isCritical ? 'critical' : 'warning'}`}>
                            <summary>
                                <AlertTriangle size={21} className={isCritical ? 'text-danger' : 'text-warning'} aria-hidden="true" />
                                <div className="monitoring-alert-content"><div className="monitoring-alert-meta"><span className={`monitoring-badge ${isCritical ? 'critical' : 'warning'}`}>{isCritical ? 'Krytyczny' : 'Ostrzeżenie'}</span><span>{zone?.name ?? 'Nieznana strefa'}</span></div><h2>{alert.message}</h2><p className="monitoring-muted">Zgłoszono: {formatAlertTime(alert.triggered_at)}</p></div>
                                <ChevronDown size={18} className="monitoring-chevron" aria-hidden="true" />
                            </summary>
                            <div className="monitoring-alert-detail">
                                <dl><div><dt>Status zgłoszenia</dt><dd>Aktywny</dd></div><div><dt>Aktualna liczba osób</dt><dd>{zone ? `${formatNumber(zone.current_count)} / ${formatNumber(zone.capacity)}` : 'Brak danych'}</dd></div><div><dt>Aktualne obciążenie</dt><dd>{zone ? formatPercent(getZoneStatus(zone).percent) : 'Brak danych'}</dd></div></dl>
                                <Link className="monitoring-zone-link" to="/map">Przejdź do stref <ArrowUpRight size={16} aria-hidden="true" /></Link>
                            </div>
                        </details>
                    );
                })}
            </section>
        </div>
    );
}
