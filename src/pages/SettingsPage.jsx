import { useRef, useState } from 'react';
import { Bell, Check, HardDrive, RotateCcw, Save, SlidersHorizontal, UserRound } from 'lucide-react';
import { defaultSettings, loadSettings, saveSettings, validateSettings } from '../api/settings';
import './monitoring.css';
import './local-workspace.css';

const notificationLabels = {
    critical: ['Alerty krytyczne', 'Preferencja dla zgłoszeń o najwyższym priorytecie'],
    warning: ['Ostrzeżenia', 'Preferencja dla zgłoszeń o zbliżaniu się do limitu'],
    sound: ['Sygnał dźwiękowy', 'Preferencja dźwięku nowych zgłoszeń'],
    browser: ['Powiadomienia przeglądarki', 'Preferencja powiadomień poza stroną'],
};

export default function SettingsPage() {
    const [saved, setSaved] = useState(loadSettings);
    const [values, setValues] = useState(() => structuredClone(saved.settings));
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const formRef = useRef(null);
    const dirty = JSON.stringify(values) !== JSON.stringify(saved.settings);
    const change = (group, key, value) => {
        setValues(previous => ({ ...previous, [group]: { ...previous[group], [key]: value } }));
        setErrors({}); setMessage(''); setSaveError('');
    };
    const cancel = () => { setValues(structuredClone(saved.settings)); setErrors({}); setMessage(''); setSaveError(''); };
    const submit = async event => {
        event.preventDefault();
        if (saving) return;
        const nextErrors = validateSettings(values);
        setErrors(nextErrors); setMessage(''); setSaveError('');
        if (Object.keys(nextErrors).length) {
            formRef.current?.elements.namedItem(Object.keys(nextErrors)[0])?.focus();
            return;
        }
        setSaving(true);
        try {
            const next = await saveSettings(values);
            setSaved(next); setValues(structuredClone(next.settings));
            setMessage('Zapisano lokalnie w tej przeglądarce.');
        } catch (error) { setSaveError(error.message); }
        finally { setSaving(false); }
    };
    const warning = Number(values.thresholds.warning);
    const critical = Number(values.thresholds.critical);
    const validThresholds = Number.isInteger(warning) && Number.isInteger(critical) && warning >= 1 && warning < critical && critical <= 100;

    return (
        <div className="monitoring-page local-workspace settings-page">
            <header className="monitoring-header"><div><p className="monitoring-eyebrow">Panel organizatora</p><h1>Ustawienia</h1><p className="monitoring-muted">Profil i preferencje</p></div><span className="local-badge"><HardDrive size={16} aria-hidden="true" />Zapis lokalny</span></header>
            {saved.warning && <p className="monitoring-error" role="alert">{saved.warning}</p>}
            <form ref={formRef} onSubmit={submit} noValidate>
                <fieldset disabled={saving} className="settings-fieldset">
                    <section className="settings-section" aria-labelledby="profile-heading">
                        <div className="settings-section-title"><UserRound size={21} aria-hidden="true" /><h2 id="profile-heading">Profil organizatora</h2></div>
                        <div className="settings-fields">
                            {[
                                ['name', 'Imię i nazwisko', 'text', 'name', 80],
                                ['email', 'Adres e-mail', 'email', 'email', 254],
                                ['organization', 'Organizacja (opcjonalnie)', 'text', 'organization', 120],
                            ].map(([key, label, type, autoComplete, maxLength]) => <div className="local-field" key={key}><label htmlFor={`settings-${key}`}>{label}</label><input id={`settings-${key}`} name={key} type={type} autoComplete={autoComplete} maxLength={maxLength} value={values.profile[key]} onChange={event => change('profile', key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errors[key] && <p id={`${key}-error`} className="local-field-error" role="alert">{errors[key]}</p>}</div>)}
                        </div>
                    </section>
                    <section className="settings-section" aria-labelledby="notifications-heading">
                        <div className="settings-section-title"><Bell size={21} aria-hidden="true" /><h2 id="notifications-heading">Powiadomienia</h2></div>
                        <div>{Object.entries(notificationLabels).map(([key, [label, description]]) => <label className="settings-toggle" key={key}><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" role="switch" aria-label={label} checked={values.notifications[key]} onChange={event => change('notifications', key, event.target.checked)} /></label>)}</div>
                    </section>
                    <section className="settings-section" aria-labelledby="thresholds-heading">
                        <div className="settings-section-title"><SlidersHorizontal size={21} aria-hidden="true" /><h2 id="thresholds-heading">Progi ostrzegania</h2></div>
                        <div>
                            <div className="settings-threshold-fields">{[['warning', 'Próg ostrzegania (%)', 1, 99], ['critical', 'Próg krytyczny (%)', 2, 100]].map(([key, label, min, max]) => <div className="local-field" key={key}><label htmlFor={`settings-${key}`}>{label}</label><input id={`settings-${key}`} name={key} type="number" min={min} max={max} step="1" value={values.thresholds[key]} onChange={event => change('thresholds', key, event.target.value)} aria-invalid={Boolean(errors[key])} aria-describedby={errors[key] ? `${key}-error` : undefined} />{errors[key] && <p id={`${key}-error`} className="local-field-error" role="alert">{errors[key]}</p>}</div>)}</div>
                            {validThresholds && <div className="settings-threshold-preview" aria-label="Podgląd progów"><div className="settings-threshold-bar"><span style={{ width: `${warning}%` }} /><span style={{ width: `${critical - warning}%` }} /><span style={{ width: `${100 - critical}%` }} /></div><ul><li><i className="bg-safe" />Poniżej {warning}%</li><li><i className="bg-warning" />Od {warning}% do poniżej {critical}%</li><li><i className="bg-danger" />Od {critical}%</li></ul></div>}
                            <button type="button" className="local-text-button" onClick={() => { setValues(previous => ({ ...previous, notifications: { ...defaultSettings.notifications }, thresholds: { ...defaultSettings.thresholds } })); setErrors({}); setMessage(''); setSaveError(''); }}><RotateCcw size={15} aria-hidden="true" />Przywróć domyślne preferencje</button>
                        </div>
                    </section>
                </fieldset>
                <footer className="settings-save-bar">
                    <div aria-live="polite">{message ? <p className="local-success"><Check size={16} aria-hidden="true" />{message}</p> : <p className="monitoring-muted">{dirty ? 'Niezapisane zmiany' : saved.savedAt ? `Ostatni zapis: ${new Date(saved.savedAt).toLocaleString('pl-PL')}` : 'Brak zapisanego profilu'}</p>}{saveError && <p className="local-field-error" role="alert">{saveError}</p>}</div>
                    <div className="local-actions"><button className="local-button" type="button" onClick={cancel} disabled={!dirty || saving}><RotateCcw size={16} aria-hidden="true" />Cofnij zmiany</button><button className="local-button primary" type="submit" disabled={saving || (!dirty && Boolean(saved.savedAt))}><Save size={16} aria-hidden="true" />{saving ? 'Zapisywanie…' : 'Zapisz ustawienia'}</button></div>
                </footer>
            </form>
        </div>
    );
}
