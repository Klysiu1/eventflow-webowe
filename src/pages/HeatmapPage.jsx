import { lazy, Suspense, useState } from 'react';
import { LayoutGrid, Map, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEventStore } from '../store/useEventStore';
import { useMonitoringData } from '../hooks/useMonitoringData';
import { getZoneStatus, formatNumber } from '../utils/monitoring';
import MonitoringHeader from '../components/MonitoringHeader';
import ZoneCard from '../components/ZoneCard';
import MobileControls from '../components/MobileControls';
import './monitoring.css';
import './local-workspace.css';

const ZoneMap = lazy(() => import('../components/ZoneMap'));

export default function HeatmapPage() {
    const event = useEventStore(state => state.events[0]);
    const status = useMonitoringData(event?.id);
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState('all');
    const [sort, setSort] = useState('occupancy');
    const [view, setView] = useState('grid');
    if (!event) return null;

    const zones = event.zones ?? [];
    const counts = zones.reduce((result, zone) => {
        result[getZoneStatus(zone).level] += 1;
        return result;
    }, { safe: 0, warning: 0, critical: 0, unknown: 0 });
    const filtered = zones.filter(zone => zone.name.toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl')) && (level === 'all' || getZoneStatus(zone).level === level))
        .sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name, 'pl') : (getZoneStatus(b).percent ?? -1) - (getZoneStatus(a).percent ?? -1));

    return (
        <div className="monitoring-page">
            <MonitoringHeader title="Strefy i mapa" event={event} status={status} />
            <MobileControls>
            <nav className="local-source-nav" aria-label="Źródło stref"><Link to="/map" aria-current="page">Dane z API</Link><Link to="/map/demo">Demo lokalne</Link></nav>
            <dl className="monitoring-stats">
                <div><dt>Monitorowane strefy</dt><dd>{zones.length}</dd></div>
                <div><dt>Bezpieczne</dt><dd className="text-safe">{counts.safe}</dd></div>
                <div><dt>Uwaga</dt><dd className="text-warning">{counts.warning}</dd></div>
                <div><dt>Krytyczne</dt><dd className="text-danger">{counts.critical}</dd></div>
            </dl>
            <div className="monitoring-toolbar">
                <label className="monitoring-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Szukaj strefy" placeholder="Szukaj strefy…" value={search} onChange={e => setSearch(e.target.value)} /></label>
                <label className="monitoring-select">Status<select aria-label="Status" value={level} onChange={e => setLevel(e.target.value)}><option value="all">Wszystkie</option><option value="safe">Bezpieczne</option><option value="warning">Uwaga</option><option value="critical">Krytyczne</option><option value="unknown">Brak danych</option></select></label>
                <label className="monitoring-select">Sortowanie<select aria-label="Sortowanie" value={sort} onChange={e => setSort(e.target.value)}><option value="occupancy">Największe obciążenie</option><option value="name">Nazwa A–Z</option></select></label>
                <div className="monitoring-segments" role="group" aria-label="Widok stref">
                    <button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={16} aria-hidden="true" />Strefy</button>
                    <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}><Map size={16} aria-hidden="true" />Mapa</button>
                </div>
            </div>
            </MobileControls>
            <div className="monitoring-section-heading"><h2>Obciążenie stref</h2><div className="mobile-only mobile-map-switch"><button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>Mapa</button><button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Lista</button></div><p className="monitoring-muted" role="status">{filtered.length} z {zones.length} stref · {formatNumber(zones.reduce((sum, zone) => sum + Number(zone.current_count), 0))} osób łącznie</p></div>
            {!filtered.length ? <div className="monitoring-empty"><h2>{zones.length ? 'Brak pasujących stref' : 'Brak stref w wydarzeniu'}</h2>{zones.length > 0 && <button className="monitoring-text-button" onClick={() => { setSearch(''); setLevel('all'); }}>Wyczyść filtry</button>}</div>
                : view === 'map' ? <Suspense fallback={<p role="status" className="monitoring-empty">Ładowanie mapy…</p>}><ZoneMap event={{ ...event, zones: filtered }} /></Suspense>
                    : <section className="monitoring-zone-grid" aria-label="Strefy wydarzenia">{filtered.map(zone => <ZoneCard key={zone.id} zone={zone} />)}</section>}
            <footer className="monitoring-legend" aria-label="Legenda obciążenia">
                <span><i className="bg-safe" />Poniżej 70% · Bezpieczna</span>
                <span><i className="bg-warning" />Od 70% do poniżej 90% · Uwaga</span>
                <span><i className="bg-danger" />Od 90% · Krytyczna</span>
            </footer>
        </div>
    );
}
