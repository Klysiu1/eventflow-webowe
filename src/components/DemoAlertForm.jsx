import { useRef, useState } from 'react';
import { Check, Plus, RotateCcw } from 'lucide-react';
import { validateManualAlert, validateResolution } from '../api/alertsDemo';
import { loadSettings } from '../api/settings';

export default function DemoAlertForm({ type, zones, alert, busy, error, onSubmit, onCancel }) {
    const [input, setInput] = useState(() => type === 'create'
        ? { zone_id: '', level: 'warning', message: '' }
        : { resolved_by: loadSettings().settings.profile.name || '', resolution_note: '' });
    const [errors, setErrors] = useState({});
    const ref = useRef(null);
    const change = event => { setInput(previous => ({ ...previous, [event.target.name]: event.target.value })); setErrors({}); };
    const submit = event => {
        event.preventDefault();
        const nextErrors = type === 'create' ? validateManualAlert(input) : validateResolution(input);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length) { ref.current?.elements.namedItem(Object.keys(nextErrors)[0])?.focus(); return; }
        onSubmit(input);
    };
    const fieldError = key => errors[key] && <p id={`demo-${key}-error`} className="local-field-error" role="alert">{errors[key]}</p>;
    const accessibility = key => ({ 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `demo-${key}-error` : undefined });
    return (
        <form onSubmit={submit} noValidate ref={ref}>
            <p className="local-notice compact">Tryb demonstracyjny. Zapis tylko w tej przeglądarce.</p>
            {alert && <p className="demo-resolution-context">{alert.message}</p>}
            <fieldset disabled={busy} className="demo-form-fields">
                {type === 'create' ? <>
                    <div className="local-field"><label htmlFor="demo-zone">Strefa</label><select id="demo-zone" name="zone_id" value={input.zone_id} onChange={change} {...accessibility('zone_id')}><option value="">Wybierz strefę</option>{zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select>{fieldError('zone_id')}</div>
                    <div className="local-field"><label htmlFor="demo-level">Poziom alertu</label><select id="demo-level" name="level" value={input.level} onChange={change} {...accessibility('level')}><option value="warning">Ostrzeżenie</option><option value="critical">Krytyczny</option></select>{fieldError('level')}</div>
                    <div className="local-field"><label htmlFor="demo-message">Opis zgłoszenia</label><textarea id="demo-message" name="message" rows={4} maxLength={500} value={input.message} onChange={change} {...accessibility('message')} /><span className="local-character-count">{input.message.length}/500</span>{fieldError('message')}</div>
                </> : <>
                    <div className="local-field"><label htmlFor="demo-resolver">Osoba zamykająca</label><input id="demo-resolver" name="resolved_by" maxLength={80} value={input.resolved_by} onChange={change} {...accessibility('resolved_by')} />{fieldError('resolved_by')}</div>
                    <div className="local-field"><label htmlFor="demo-resolution">Notatka z rozwiązania</label><textarea id="demo-resolution" name="resolution_note" rows={4} maxLength={1000} value={input.resolution_note} onChange={change} {...accessibility('resolution_note')} /><span className="local-character-count">{input.resolution_note.length}/1000</span>{fieldError('resolution_note')}</div>
                </>}
            </fieldset>
            {error && <p className="monitoring-error" role="alert">{error}</p>}
            <footer className="local-actions"><button className="local-button" type="button" disabled={busy} onClick={onCancel}><RotateCcw size={16} aria-hidden="true" />Anuluj</button><button className="local-button primary" type="submit" disabled={busy}>{type === 'create' ? <Plus size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{busy ? 'Zapisywanie…' : type === 'create' ? 'Dodaj alert demo' : 'Zamknij alert lokalnie'}</button></footer>
        </form>
    );
}
