import { lazy, Suspense, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Pencil } from 'lucide-react';
import { useEventStore } from '../store/useEventStore';
import { useDemoSession } from '../store/useDemoSession';
import { useWorkspace } from '../hooks/useWorkspace';
import { canEdit } from '../api/demoAuth';
import { formatNumber, formatPercent, getZoneStatus } from '../utils/monitoring';
import { getDemoZoneStatus } from '../utils/demoZones';
import { WorkspaceHeader, WorkspaceState } from '../components/WorkspaceUI';
import ZoneEditor from '../components/ZoneEditor';

const ZoneHistory = lazy(() => import('../components/ZoneHistory'));
const VenuePlan = lazy(() => import('../components/VenuePlan'));

function ZoneDetails({ event, zone, live = false }) {
    const session = useDemoSession(state => state.session);
    const [editing, setEditing] = useState(false);
    const [notice, setNotice] = useState('');
    if (!zone || !event) return <div className="monitoring-empty"><h1>Nie znaleziono strefy</h1><Link className="local-text-button" to={live ? '/map' : '/map/demo'}>Wróć do stref</Link></div>;
    const status = live ? getZoneStatus(zone) : getDemoZoneStatus(zone);
    return <div className="monitoring-page local-workspace event-workspace"><Link className="local-text-button" to={live ? '/map' : `/map/demo?event=${encodeURIComponent(event.id)}`}><ArrowLeft size={16} />Strefy i mapa</Link>
        {live ? <header className="monitoring-header"><div><p className="monitoring-eyebrow">{event.name} · dane z API</p><h1>{zone.name}</h1></div></header> : <WorkspaceHeader title={zone.name} subtitle={`${event.name} · ${event.venue}`}>{canEdit(session) && <button className="local-button" onClick={() => setEditing(true)}><Pencil size={16} />Edytuj strefę</button>}</WorkspaceHeader>}
        {notice && <p role="status" className="local-success local-result-message">{notice}</p>}
        <span className={`monitoring-badge ${status.level}`}>{status.label}</span>
        <dl className="monitoring-stats zone-detail-stats"><div><dt>Obciążenie</dt><dd style={{ color: status.color }}>{formatPercent(status.percent)}</dd></div><div><dt>Osoby w strefie</dt><dd>{formatNumber(zone.current_count)}</dd></div><div><dt>Pojemność</dt><dd>{formatNumber(zone.capacity)}</dd></div><div><dt>Wolne miejsca</dt><dd>{formatNumber(Math.max(0, zone.capacity - zone.current_count))}</dd></div></dl>
        <section className="workspace-section"><h2>Historia obciążenia</h2>{live ? <p className="local-notice">Historia pomiarów z API nie jest jeszcze podłączona. <Link to="/map/demo" className="local-text-button">Otwórz strefy z historią demo</Link></p> : <Suspense fallback={<p role="status">Ładowanie wykresu...</p>}><ZoneHistory key={`${event.id}-${zone.id}`} eventId={event.id} zone={zone} /></Suspense>}</section>
        {!live && <section className="workspace-section"><h2>Położenie na planie</h2><p className="monitoring-muted">Próg ostrzegania: 70% · Próg krytyczny: {zone.alert_threshold}%</p><Suspense fallback={<p>Ładowanie planu...</p>}><VenuePlan zones={event.zones} selectedId={zone.id} /></Suspense><p className="venue-caption">Schemat demonstracyjny · nie jest planem ewakuacji</p></section>}
        {live && <Link className="local-button" to={`/alerts?zone=${encodeURIComponent(zone.id)}`}>Alerty tej strefy</Link>}
        {editing && canEdit(session) && <ZoneEditor event={event} zone={zone} onClose={message => { setEditing(false); if (message) setNotice(message); }} />}
    </div>;
}
function DemoDetail() {
    const { eventId, zoneId } = useParams();
    const { data, error, load } = useWorkspace();
    if (!data) return <WorkspaceState error={error} retry={load} />;
    const event = data.events.find(item => item.id === eventId);
    return <ZoneDetails key={zoneId} event={event} zone={event?.zones.find(item => item.id === zoneId)} />;
}
function LiveDetail() {
    const { zoneId } = useParams();
    const event = useEventStore(state => state.events[0]);
    return <ZoneDetails key={zoneId} live event={event} zone={event?.zones?.find(item => String(item.id) === zoneId)} />;
}
export default function ZoneDetailsPage({ live = false }) { return live ? <LiveDetail /> : <DemoDetail />; }
