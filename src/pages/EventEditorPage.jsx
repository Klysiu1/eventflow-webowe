import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { canEdit } from '../api/demoAuth';
import { eventStatuses, saveDemoEvent, validateEvent, validateZone } from '../api/eventWorkspace';
import { useDemoSession } from '../store/useDemoSession';
import { useWorkspace } from '../hooks/useWorkspace';
import { Field, ReadOnlyNotice, WorkspaceHeader, WorkspaceState } from '../components/WorkspaceUI';
import ZoneArranger from '../components/ZoneArranger';

function EventForm({ event, update }) {
    const navigate = useNavigate();
    const session = useDemoSession(state => state.session);
    const [values, setValues] = useState(() => event 
        ? { ...event, zones: event.zones ? structuredClone(event.zones) : [] } 
        : { name: '', venue: '', start_at: '', end_at: '', max_capacity: '', status: 'planned', zones: [] }
    );
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const form = useRef(null);
    const change = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors({}); setError(''); };
    const handleZonesChange = (nextZones) => {
        setValues(previous => ({ ...previous, zones: nextZones }));
        setError('');
    };

    const submit = async e => {
        e.preventDefault(); if (busy || !canEdit(session)) return;
        const next = validateEvent(values); setErrors(next);
        if (Object.keys(next).length) { 
            form.current.elements.namedItem(Object.keys(next)[0])?.focus(); 
            return; 
        }

        // Validate zones
        if (values.zones?.length) {
            for (let i = 0; i < values.zones.length; i++) {
                const z = values.zones[i];
                const others = values.zones.filter((_, idx) => idx !== i);
                const zoneErrors = validateZone(z, others);
                if (Object.keys(zoneErrors).length) {
                    setError(`Błąd w strefie "${z.name || (i + 1)}": ${Object.values(zoneErrors)[0]}`);
                    return;
                }
            }
        }

        setBusy(true);
        try { 
            await update(() => saveDemoEvent(event?.id, values)); 
            navigate('/map/demo', { state: { notice: 'Zapisano wydarzenie i strefy na planie.' } }); 
        }
        catch (reason) { setError(reason.message); }
        finally { setBusy(false); }
    };

    return (
        <form className="event-editor" ref={form} onSubmit={submit} noValidate>
            <fieldset disabled={busy || !canEdit(session)} className="demo-form-fields">
                <Field label="Nazwa wydarzenia" name="name" maxLength={200} value={values.name} error={errors.name} onChange={e => change('name', e.target.value)} />
                <Field label="Obiekt" name="venue" maxLength={200} value={values.venue} error={errors.venue} onChange={e => change('venue', e.target.value)} />
                <div className="event-form-grid">
                    {[['start_at', 'Rozpoczęcie'], ['end_at', 'Zakończenie']].map(([key, label]) => (
                        <Field key={key} label={`${label} (czas lokalny)`} name={key} type="datetime-local" value={values[key]} error={errors[key]} onChange={e => change(key, e.target.value)} />
                    ))}
                    <Field label="Pojemność obiektu" name="max_capacity" type="number" min="1" max="1000000" value={values.max_capacity} error={errors.max_capacity} onChange={e => change('max_capacity', e.target.value)} />
                    <Field label="Status wydarzenia" name="status" value={values.status} error={errors.status} onChange={e => change('status', e.target.value)}>
                        {Object.entries(eventStatuses).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
                    </Field>
                </div>

                <div className="workspace-section">
                    <ZoneArranger
                        zones={values.zones || []}
                        onChange={handleZonesChange}
                        maxCapacity={Number(values.max_capacity) || 0}
                        readOnly={busy || !canEdit(session)}
                    />
                </div>
            </fieldset>

            {error && <p role="alert" className="monitoring-error">{error}</p>}

            <footer className="settings-save-bar">
                <Link className="local-button" to="/events">Anuluj</Link>
                <button className="local-button primary" disabled={busy || !canEdit(session)}>
                    <Save size={16} />
                    {busy ? 'Zapisywanie...' : `Zapisz wydarzenie ${values.zones?.length ? `i ${values.zones.length} stref` : ''} lokalnie`}
                </button>
            </footer>
        </form>
    );
}
export default function EventEditorPage() {
    const { eventId } = useParams();
    const { data, error, load, update } = useWorkspace();
    const session = useDemoSession(state => state.session);
    if (!data) return <WorkspaceState error={error} retry={load} />;
    const event = data.events.find(item => item.id === eventId);
    return <div className="monitoring-page local-workspace event-workspace"><Link className="local-text-button" to="/events"><ArrowLeft size={16} />Wydarzenia</Link><WorkspaceHeader title={eventId ? 'Edycja wydarzenia' : 'Nowe wydarzenie'} subtitle={event?.name ?? 'Dane wydarzenia'} />{!canEdit(session) ? <ReadOnlyNotice /> : eventId && !event ? <p role="alert">Nie znaleziono wydarzenia.</p> : <EventForm key={eventId ?? 'new'} event={event} update={update} />}</div>;
}
