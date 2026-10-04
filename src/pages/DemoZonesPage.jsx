import { lazy, Suspense, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Grid, LayoutGrid, Map, Pencil, Plus, Save, Search } from 'lucide-react';
import { saveDemoEvent, selectDemoEvent, validateZone } from '../api/eventWorkspace';
import { canEdit } from '../api/demoAuth';
import { useDemoSession } from '../store/useDemoSession';
import { useWorkspace } from '../hooks/useWorkspace';
import { ReadOnlyNotice, WorkspaceHeader, WorkspaceState } from '../components/WorkspaceUI';
import ZoneCard from '../components/ZoneCard';
import ZoneEditor from '../components/ZoneEditor';
import MobileControls from '../components/MobileControls';
import ZoneArranger from '../components/ZoneArranger';
import { getDemoZoneStatus } from '../utils/demoZones';

const VenuePlan = lazy(() => import('../components/VenuePlan'));

function ZonesContent({ event, data, update }) {
    const session = useDemoSession(state => state.session);
    const location = useLocation();
    const navigate = useNavigate();
    const [view, setView] = useState('plan');
    const [search, setSearch] = useState('');
    const [level, setLevel] = useState('all');
    const [selected, setSelected] = useState(null);
    const [editing, setEditing] = useState(false);
    const [notice, setNotice] = useState(location.state?.notice ?? '');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [arrangerZones, setArrangerZones] = useState(() => structuredClone(event.zones));

    const filtered = event.zones.filter(zone => zone.name.toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl')) && (level === 'all' || getDemoZoneStatus(zone).level === level));
    const selectedZone = filtered.find(zone => zone.id === selected);
    const counts = event.zones.reduce((counts, zone) => { counts[getDemoZoneStatus(zone).level] += 1; return counts; }, { safe: 0, warning: 0, critical: 0 });
    
    const selectEvent = async id => {
        if (busy) return;
        setBusy(true); setError('');
        try { await update(() => selectDemoEvent(id)); navigate('/map/demo', { replace: true }); }
        catch (reason) { setError(reason.message); }
        finally { setBusy(false); }
    };

    const saveArrangedZones = async () => {
        if (busy || !canEdit(session)) return;
        // Check zone validation
        for (let i = 0; i < arrangerZones.length; i++) {
            const z = arrangerZones[i];
            const others = arrangerZones.filter((_, idx) => idx !== i);
            const zErrors = validateZone(z, others);
            if (Object.keys(zErrors).length) {
                setError(`Błąd w strefie "${z.name || (i + 1)}": ${Object.values(zErrors)[0]}`);
                return;
            }
        }
        setBusy(true);
        setError('');
        try {
            await update(() => saveDemoEvent(event.id, { ...event, zones: arrangerZones }));
            setNotice('Zapisano układ stref na planie.');
            setView('plan');
        } catch (reason) {
            setError(reason.message);
        } finally {
            setBusy(false);
        }
    };

    const openArranger = () => {
        setArrangerZones(structuredClone(event.zones));
        setView('arranger');
        setError('');
    };

    const detailPath = zone => `/map/demo/${event.id}/${zone.id}`;
    return <div className="monitoring-page local-workspace event-workspace">
        <WorkspaceHeader compactMobile title="Strefy i mapa" subtitle={`${event.name} · ${event.venue}`}>
            {canEdit(session) && (
                <div className="local-actions">
                    <Link className="local-button" to={`/events/${event.id}/edit`} title="Przejdź do pełnej edycji wydarzenia">
                        <Pencil size={15} />Edytuj wydarzenie
                    </Link>
                    <button 
                        type="button" 
                        className={`local-button ${view === 'arranger' ? 'primary' : ''}`}
                        onClick={() => { if (view === 'arranger') setView('plan'); else openArranger(); }}
                    >
                        <Grid size={15} />{view === 'arranger' ? 'Widok planu' : 'Rozmieść strefy'}
                    </button>
                    <button className="local-button primary" onClick={() => setEditing(true)}>
                        <Plus size={16} />Dodaj strefę
                    </button>
                </div>
            )}
        </WorkspaceHeader>
        <MobileControls label="Wydarzenie i filtry">
        <nav className="local-source-nav" aria-label="Źródło stref"><Link to="/map">Dane z API</Link><Link to="/map/demo" aria-current="page">Demo lokalne</Link></nav>
        <div className="workspace-event-switch"><label className="local-field"><span>Wybrane wydarzenie demo</span><select aria-label="Wybrane wydarzenie demo" value={event.id} disabled={busy} onChange={e => selectEvent(e.target.value)}>{data.events.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Link to="/events" className="local-text-button">Wszystkie wydarzenia</Link></div>
        {!canEdit(session) && <ReadOnlyNotice />}
        {notice && <p role="status" className="local-success local-result-message">{notice}</p>}{error && <p role="alert" className="monitoring-error">{error}</p>}
        <dl className="monitoring-stats"><div><dt>Monitorowane strefy</dt><dd>{event.zones.length}</dd></div><div><dt>Bezpieczne</dt><dd className="text-safe">{counts.safe}</dd></div><div><dt>Uwaga</dt><dd className="text-warning">{counts.warning}</dd></div><div><dt>Krytyczne</dt><dd className="text-danger">{counts.critical}</dd></div></dl>
        <div className="monitoring-toolbar"><label className="monitoring-search"><Search size={18} /><input type="search" aria-label="Szukaj strefy demo" placeholder="Szukaj strefy" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="monitoring-select">Status<select value={level} onChange={e => setLevel(e.target.value)}><option value="all">Wszystkie</option><option value="safe">Bezpieczne</option><option value="warning">Uwaga</option><option value="critical">Krytyczne</option></select></label><div className="monitoring-segments" role="group" aria-label="Widok stref demo"><button aria-pressed={view === 'plan'} onClick={() => setView('plan')}><Map size={16} />Plan</button><button aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={16} />Karty</button><button aria-pressed={view === 'arranger'} onClick={openArranger}><Grid size={16} />Układ stref</button></div></div>
        </MobileControls>
        {view === 'arranger' ? (
            <div className="workspace-section">
                <ZoneArranger
                    zones={arrangerZones}
                    onChange={setArrangerZones}
                    maxCapacity={event.max_capacity}
                    readOnly={busy || !canEdit(session)}
                />
                {canEdit(session) && (
                    <footer className="settings-save-bar" style={{ marginTop: '20px' }}>
                        <button type="button" className="local-button" disabled={busy} onClick={() => { setArrangerZones(structuredClone(event.zones)); setView('plan'); }}>
                            Anuluj
                        </button>
                        <button type="button" className="local-button primary" disabled={busy} onClick={saveArrangedZones}>
                            <Save size={16} />
                            {busy ? 'Zapisywanie...' : 'Zapisz układ stref'}
                        </button>
                    </footer>
                )}
            </div>
        ) : (
            <>
                <div className="monitoring-section-heading"><h2><span className="mobile-section-number mobile-only">01</span> Heatmapa obciążeń</h2><div className="mobile-only mobile-map-switch"><button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>Mapa</button><button type="button" aria-pressed={view === 'grid'} onClick={() => setView('grid')}>Lista</button></div><p className="monitoring-muted" role="status">{filtered.length} z {event.zones.length} stref</p></div>
                {!filtered.length ? <div className="monitoring-empty"><h2>{event.zones.length ? 'Brak pasujących stref' : 'Wydarzenie nie ma jeszcze stref'}</h2>{event.zones.length > 0 && <button className="local-text-button" onClick={() => { setSearch(''); setLevel('all'); }}>Wyczyść filtry</button>}</div> : view === 'grid' ? <div className="monitoring-zone-grid">{filtered.map(zone => <ZoneCard key={zone.id} zone={zone} status={getDemoZoneStatus(zone)} detailsTo={detailPath(zone)} hideAlerts />)}</div> : <><Suspense fallback={<p role="status">Ładowanie planu...</p>}><VenuePlan zones={filtered} selectedId={selectedZone?.id} onSelect={setSelected} /></Suspense><p className="venue-caption">Schemat demonstracyjny obiektu · jednostki lokalne · nie jest planem ewakuacji</p><div className="venue-zone-index" aria-label="Strefy na planie">{filtered.map(zone => <button key={zone.id} aria-pressed={selectedZone?.id === zone.id} onClick={() => setSelected(zone.id)}><i style={{ background: getDemoZoneStatus(zone).color }} />{zone.name}</button>)}</div>{selectedZone && <div className="selected-zone-strip"><div><h3>{selectedZone.name}</h3><p className="monitoring-muted">{selectedZone.current_count.toLocaleString('pl-PL')} / {selectedZone.capacity.toLocaleString('pl-PL')} osób · {getDemoZoneStatus(selectedZone).label}</p></div><Link className="local-button primary" to={detailPath(selectedZone)}>Szczegóły strefy</Link></div>}</>}
                <footer className="monitoring-legend"><span><i className="bg-safe" />Poniżej 70% · Bezpieczna</span><span><i className="bg-warning" />Od 70% · Uwaga</span><span><i className="bg-danger" />Od progu strefy · Krytyczna (domyślnie 90%)</span></footer>
                {view === 'plan' && filtered.length > 0 && <section className="mobile-zone-summary mobile-only" aria-label="Obciążenie stref"><div className="monitoring-section-heading"><h2><span className="mobile-section-number">02</span> Obciążenie</h2><button className="local-text-button" onClick={() => setView('grid')}>Wszystkie {filtered.length} →</button></div><div className="monitoring-zone-grid">{[...filtered].sort((a, b) => getDemoZoneStatus(b).percent - getDemoZoneStatus(a).percent).slice(0, 4).map(zone => <ZoneCard key={zone.id} zone={zone} status={getDemoZoneStatus(zone)} detailsTo={detailPath(zone)} hideAlerts />)}</div></section>}
            </>
        )}
        {editing && canEdit(session) && <ZoneEditor event={event} onClose={message => { setEditing(false); if (message) setNotice(message); }} />}
    </div>;
}
export default function DemoZonesPage() {
    const { data, error, load, update } = useWorkspace();
    const [params] = useSearchParams();
    if (!data) return <WorkspaceState error={error} retry={load} />;
    const event = data.events.find(item => item.id === (params.get('event') || data.selectedEventId));
    if (!event) return <div className="monitoring-empty"><h1>Nie znaleziono wydarzenia</h1><Link to="/events" className="local-text-button">Wydarzenia</Link></div>;
    return <ZonesContent key={event.id} event={event} data={data} update={update} />;
}
