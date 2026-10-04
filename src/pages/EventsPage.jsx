import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarDays, Check, Map, Pencil, Plus, Search } from 'lucide-react';
import { eventStatuses, selectDemoEvent } from '../api/eventWorkspace';
import { canEdit } from '../api/demoAuth';
import { useDemoSession } from '../store/useDemoSession';
import { useWorkspace } from '../hooks/useWorkspace';
import { ReadOnlyNotice, WorkspaceHeader, WorkspaceState } from '../components/WorkspaceUI';
import { formatNumber } from '../utils/monitoring';

export default function EventsPage() {
    const { data, error, load, update } = useWorkspace();
    const session = useDemoSession(state => state.session);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('all');
    const [actionError, setActionError] = useState('');
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();
    const select = async id => {
        if (busy) return;
        setBusy(true); setActionError('');
        try { await update(() => selectDemoEvent(id)); navigate('/map/demo'); }
        catch (reason) { setActionError(reason.message); }
        finally { setBusy(false); }
    };
    if (!data) return <WorkspaceState error={error} retry={load} />;
    const events = data.events.filter(event => `${event.name} ${event.venue}`.toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl')) && (status === 'all' || event.status === status));
    return <div className="monitoring-page local-workspace event-workspace"><WorkspaceHeader title="Wydarzenia" subtitle="Wydarzenia i plany obiektów">{canEdit(session) && <Link className="local-button primary" to="/events/new"><Plus size={16} />Nowe wydarzenie</Link>}</WorkspaceHeader>
        {!canEdit(session) && <ReadOnlyNotice />}
        <div className="monitoring-toolbar"><label className="monitoring-search"><Search size={18} /><input aria-label="Szukaj wydarzenia" type="search" placeholder="Szukaj wydarzenia lub obiektu" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="monitoring-select">Status<select value={status} onChange={e => setStatus(e.target.value)}><option value="all">Wszystkie</option>{Object.entries(eventStatuses).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label></div>
        {actionError && <p role="alert" className="monitoring-error">{actionError}</p>}
        <div className="monitoring-section-heading"><h2>Lista wydarzeń</h2><p className="monitoring-muted" role="status">Wyniki: {events.length}</p></div>
        {!events.length && <div className="monitoring-empty"><h2>Brak pasujących wydarzeń</h2><button className="local-text-button" onClick={() => { setSearch(''); setStatus('all'); }}>Wyczyść filtry</button></div>}
        <div className="event-list">{events.map(event => <article key={event.id} className={`event-item ${data.selectedEventId === event.id ? 'selected' : ''}`}><div className="event-item-heading"><CalendarDays size={22} aria-hidden="true" /><span className={`monitoring-badge ${event.status === 'active' ? 'safe' : 'unknown'}`}>{eventStatuses[event.status]}</span>{data.selectedEventId === event.id && <span className="event-selected"><Check size={14} />Wybrane</span>}</div><h2>{event.name}</h2><p className="monitoring-muted">{event.venue}</p><dl className="event-facts"><div><dt>Rozpoczęcie</dt><dd>{new Date(event.start_at).toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })}</dd></div><div><dt>Pojemność</dt><dd>{formatNumber(event.max_capacity)} osób</dd></div><div><dt>Strefy</dt><dd>{event.zones.length}</dd></div></dl><footer className="local-actions"><button className="local-button primary" disabled={busy} onClick={() => select(event.id)}><Map size={16} />Otwórz strefy</button>{canEdit(session) && <Link className="local-button" to={`/events/${event.id}/edit`}><Pencil size={16} />Edytuj</Link>}</footer></article>)}</div>
    </div>;
}
