import { lazy, Suspense, useRef, useState } from 'react';
import { Save } from 'lucide-react';
import { saveDemoZone, validateZone } from '../api/eventWorkspace';
import { canEdit } from '../api/demoAuth';
import { useDemoSession } from '../store/useDemoSession';
import { useWorkspaceStore } from '../store/useWorkspaceStore';
import LocalDialog from './LocalDialog';
import { Field } from './WorkspaceUI';

const VenuePlan = lazy(() => import('./VenuePlan'));
function emptyArea(zones) {
    for (let y = 0; y <= 95; y += 5) for (let x = 0; x <= 95; x += 5) {
        const area = { x, y, width: 5, height: 5 };
        if (!validateZone({ name: 'Nowa strefa', capacity: 100, alert_threshold: 90, area }, zones).area) return area;
    }
    return { x: 0, y: 0, width: 10, height: 10 };
}
export default function ZoneEditor({ event, zone, onClose }) {
    const session = useDemoSession(state => state.session);
    const update = useWorkspaceStore(state => state.update);
    const [values, setValues] = useState(() => zone ? { ...zone, area: { ...zone.area } } : { name: '', capacity: 100, alert_threshold: 90, area: emptyArea(event.zones) });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const form = useRef(null);
    const others = event.zones.filter(item => item.id !== zone?.id);
    const change = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors({}); setError(''); };
    const submit = async e => {
        e.preventDefault();
        if (busy || !canEdit(session)) return;
        const next = validateZone(values, others); setErrors(next);
        if (Object.keys(next).length) { form.current.elements.namedItem(Object.keys(next)[0])?.focus(); return; }
        setBusy(true);
        try { await update(() => saveDemoZone(event.id, zone?.id, values)); onClose('Zapisano strefę lokalnie.'); }
        catch (reason) { setError(reason.message); }
        finally { setBusy(false); }
    };
    const draft = { ...values, id: zone?.id ?? 'draft', name: values.name || 'Nowa strefa', current_count: zone?.current_count ?? 0, capacity: Number(values.capacity), area: Object.fromEntries(Object.entries(values.area).map(([key, value]) => [key, Number(value)])) };
    const validArea = Object.values(draft.area).every(Number.isFinite) && draft.area.width > 0 && draft.area.height > 0;
    return <LocalDialog title={zone ? 'Edycja strefy demo' : 'Nowa strefa demo'} busy={busy} onClose={() => onClose()}><form ref={form} onSubmit={submit} noValidate>
        <fieldset disabled={busy || !canEdit(session)} className="demo-form-fields">
            <Field label="Nazwa strefy" name="name" maxLength={100} value={values.name} error={errors.name} onChange={e => change('name', e.target.value)} />
            <div className="event-form-grid"><Field label="Pojemność (osoby)" name="capacity" type="number" min="1" max="1000000" value={values.capacity} error={errors.capacity} onChange={e => change('capacity', e.target.value)} /><Field label="Próg krytyczny (%)" name="alert_threshold" type="number" min="71" max="100" value={values.alert_threshold} error={errors.alert_threshold} onChange={e => change('alert_threshold', e.target.value)} /></div>
            <h3 className="workspace-section-title">Obszar na planie · 100 × 100</h3>
            <div className="event-form-grid">{[['x', 'Od lewej (X)'], ['y', 'Od góry (Y)'], ['width', 'Szerokość'], ['height', 'Wysokość']].map(([key, label]) => <Field key={key} label={label} name={key} type="number" min={key === 'x' || key === 'y' ? 0 : 5} max="100" value={values.area[key]} error={errors[key]} onChange={e => change('area', { ...values.area, [key]: e.target.value })} />)}</div>
            {errors.area && <p role="alert" className="local-field-error">{errors.area}</p>}
            <div className="venue-preview"><Suspense fallback={<p>Ładowanie planu...</p>}><VenuePlan zones={validArea ? [...others, draft] : others} selectedId={draft.id} /></Suspense></div>
        </fieldset>
        {error && <p role="alert" className="monitoring-error">{error}</p>}
        <footer className="local-actions"><button type="button" className="local-button" disabled={busy} onClick={() => onClose()}>Anuluj</button><button className="local-button primary" disabled={busy || !canEdit(session)}><Save size={16} />{busy ? 'Zapisywanie...' : 'Zapisz strefę lokalnie'}</button></footer>
    </form></LocalDialog>;
}
