import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, FlaskConical, Plus, RotateCcw, Search } from 'lucide-react';
import { createDemoAlert, DEMO_ALERTS_KEY, getDemoAlerts, resetDemoAlerts, resolveDemoAlert, updateDemoChecklist } from '../api/alertsDemo';
import { alertTime, formatAlertTime } from '../utils/monitoring';
import LocalDialog from '../components/LocalDialog';
import DemoAlertForm from '../components/DemoAlertForm';
import MobileControls from '../components/MobileControls';
import { useDemoSession } from '../store/useDemoSession';
import { canEdit } from '../api/demoAuth';
import './monitoring.css';
import './local-workspace.css';

export default function DemoAlertsPage() {
    const session = useDemoSession(state => state.session);
    const readOnly = !canEdit(session);
    const [model, setModel] = useState(null);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    const [tab, setTab] = useState('active');
    const [search, setSearch] = useState('');
    const [zoneId, setZoneId] = useState('all');
    const [level, setLevel] = useState('all');
    const [sort, setSort] = useState('priority');
    const [modal, setModal] = useState(null);
    const [reload, setReload] = useState(0);
    const mounted = useRef(false);
    const pending = useRef(false);

    useEffect(() => {
        mounted.current = true;
        let cancelled = false;
        const load = () => getDemoAlerts().then(data => { if (!cancelled) setModel(data); }).catch(() => { if (!cancelled) setError('Nie udało się wczytać zgłoszeń. Spróbuj ponownie.'); });
        load();
        const onStorage = event => { if (event.key === DEMO_ALERTS_KEY || event.key === null) load(); };
        window.addEventListener('storage', onStorage);
        return () => { cancelled = true; mounted.current = false; window.removeEventListener('storage', onStorage); };
    }, [reload]);

    const perform = async (operation, message) => {
        if (pending.current || readOnly) return false;
        pending.current = true; setBusy(true); setError(''); setNotice('');
        try {
            const next = await operation();
            if (!mounted.current) return false;
            setModel(next); setNotice(message);
            return true;
        } catch (reason) {
            if (mounted.current) setError(reason.message || 'Nie udało się zapisać zmiany lokalnie.');
            return false;
        } finally {
            pending.current = false;
            if (mounted.current) setBusy(false);
        }
    };
    const clearFilters = () => { setSearch(''); setZoneId('all'); setLevel('all'); };
    const openModal = value => { setError(''); setModal(value); };
    const closeModal = () => { if (!busy) { setModal(null); setError(''); } };

    if (!model) return <div className="monitoring-page local-workspace"><h1 className="text-2xl font-bold mb-6">Alerty demonstracyjne</h1>{error ? <div role="alert"><p>{error}</p><button className="local-button" onClick={() => { setError(''); setReload(value => value + 1); }}>Spróbuj ponownie</button></div> : <p role="status">Ładowanie zgłoszeń…</p>}</div>;

    const zones = new Map(model.zones.map(zone => [zone.id, zone]));
    const active = model.alerts.filter(alert => !alert.resolved_at);
    const history = model.alerts.filter(alert => alert.resolved_at);
    const source = tab === 'active' ? active : history;
    const filtered = source.filter(alert => (zoneId === 'all' || alert.zone_id === zoneId) && (level === 'all' || alert.level === level)
        && `${alert.message} ${zones.get(alert.zone_id)?.name ?? ''} ${alert.resolution_note}`.toLocaleLowerCase('pl').includes(search.trim().toLocaleLowerCase('pl')))
        .sort((a, b) => (sort === 'priority' ? Number(b.level === 'critical') - Number(a.level === 'critical') : 0)
            || alertTime(tab === 'history' ? b.resolved_at : b.triggered_at) - alertTime(tab === 'history' ? a.resolved_at : a.triggered_at));
    const submitModal = async input => {
        const created = modal.type === 'create';
        const ok = await perform(() => created ? createDemoAlert(input) : resolveDemoAlert(modal.alert.id, input), created ? 'Dodano zgłoszenie demo. Zapis tylko lokalny.' : 'Zamknięto zgłoszenie demo i przeniesiono je do historii. Zapis tylko lokalny.');
        if (ok) { setModal(null); clearFilters(); setSort('newest'); setTab(created ? 'active' : 'history'); }
    };

    return (
        <div className="monitoring-page local-workspace demo-alerts-page">
            <header className="monitoring-header"><div><p className="monitoring-eyebrow">{model.event.name}</p><h1>Alerty</h1><p className="monitoring-muted">Zgłoszenia i historia działań</p></div><span className="local-badge"><FlaskConical size={16} aria-hidden="true" />Demo lokalne</span></header>
            <nav className="local-source-nav" aria-label="Źródło alertów"><Link to="/alerts">Dane z API</Link><Link to="/alerts/demo" aria-current="page">Demo lokalne</Link></nav>
            {model.warning && <p className="monitoring-error" role="alert">{model.warning}</p>}
            {!modal && error && <p className="monitoring-error" role="alert">{error}</p>}
            {notice && <p className="local-success local-result-message" role="status"><Check size={16} aria-hidden="true" />{notice}</p>}
            <MobileControls label="Filtry i działania">
            <dl className="monitoring-stats"><div><dt>Aktywne alerty</dt><dd>{active.length}</dd></div><div><dt>Krytyczne</dt><dd className="text-danger">{active.filter(alert => alert.level === 'critical').length}</dd></div><div><dt>Rozwiązane</dt><dd className="text-safe">{history.length}</dd></div><div><dt>Strefy z alertem</dt><dd>{new Set(active.map(alert => alert.zone_id)).size}</dd></div></dl>
            {readOnly && <p className="local-notice">Tryb obserwatora. <Link to="/login" className="local-text-button">Zaloguj demo, aby edytować zgłoszenia</Link></p>}
            <div className="demo-alert-actions"><div className="monitoring-segments" role="group" aria-label="Status zgłoszeń"><button aria-pressed={tab === 'active'} onClick={() => setTab('active')}>Aktywne ({active.length})</button><button aria-pressed={tab === 'history'} onClick={() => { setTab('history'); setSort('newest'); }}>Historia ({history.length})</button></div>{!readOnly && <div className="local-actions"><button className="local-button" onClick={() => openModal({ type: 'reset' })} disabled={busy}><RotateCcw size={16} aria-hidden="true" />Przywróć przykłady</button><button className="local-button primary" onClick={() => openModal({ type: 'create' })} disabled={busy || model.blocked}><Plus size={16} aria-hidden="true" />Nowy alert demo</button></div>}</div>
            <div className="monitoring-toolbar">
                <label className="monitoring-search"><Search size={18} aria-hidden="true" /><input type="search" aria-label="Szukaj zgłoszenia demo" placeholder="Szukaj zgłoszenia…" value={search} onChange={event => setSearch(event.target.value)} /></label>
                <label className="monitoring-select">Strefa<select aria-label="Strefa" value={zoneId} onChange={event => setZoneId(event.target.value)}><option value="all">Wszystkie strefy</option>{model.zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}</select></label>
                <label className="monitoring-select">Poziom<select aria-label="Poziom" value={level} onChange={event => setLevel(event.target.value)}><option value="all">Wszystkie poziomy</option><option value="critical">Krytyczne</option><option value="warning">Ostrzeżenia</option></select></label>
                <label className="monitoring-select">Sortowanie<select aria-label="Sortowanie" value={sort} onChange={event => setSort(event.target.value)}><option value="priority">Najwyższy priorytet</option><option value="newest">Najnowsze</option></select></label>
            </div>
            </MobileControls>
            <div className="monitoring-section-heading"><h2><span className="mobile-section-number mobile-only">01</span> {tab === 'active' ? 'Aktywne zgłoszenia' : 'Historia zgłoszeń'}</h2><span className="monitoring-muted" role="status">Wyniki: {filtered.length}</span></div>
            {!filtered.length && !model.blocked && <div className="monitoring-empty"><CheckCircle2 size={30} aria-hidden="true" /><h2>{source.length ? 'Brak pasujących zgłoszeń' : tab === 'active' ? 'Brak aktywnych zgłoszeń demo' : 'Historia jest pusta'}</h2>{(search || zoneId !== 'all' || level !== 'all') && <button className="local-text-button" onClick={clearFilters}>Wyczyść filtry</button>}</div>}
            <section className="monitoring-alert-list" aria-label="Lista zgłoszeń demo">
                {filtered.map(alert => <details key={alert.id} className={`monitoring-alert ${alert.resolved_at ? 'resolved' : alert.level}`}>
                    <summary>{alert.resolved_at ? <CheckCircle2 size={21} className="text-safe" aria-hidden="true" /> : <AlertTriangle size={21} className={alert.level === 'critical' ? 'text-danger' : 'text-warning'} aria-hidden="true" />}<div className="monitoring-alert-content"><div className="monitoring-alert-meta"><span className={`monitoring-badge ${alert.resolved_at ? 'safe' : alert.level}`}>{alert.resolved_at ? 'Rozwiązany' : alert.level === 'critical' ? 'Krytyczny' : 'Ostrzeżenie'}</span><span>{zones.get(alert.zone_id)?.name}</span><span>DEMO</span></div><h2>{alert.message}</h2><p className="monitoring-muted">{alert.resolved_at ? 'Zamknięto' : 'Zgłoszono'}: {formatAlertTime(alert.resolved_at || alert.triggered_at)}</p></div><ChevronDown size={18} className="monitoring-chevron" aria-hidden="true" /></summary>
                    <div className="monitoring-alert-detail">
                        <dl><div><dt>Zgłoszono</dt><dd>{formatAlertTime(alert.triggered_at)}</dd></div><div><dt>Poziom zgłoszenia</dt><dd>{alert.level === 'critical' ? 'Krytyczny' : 'Ostrzeżenie'}</dd></div>{alert.resolved_at && <div><dt>Zamknął / zamknęła</dt><dd>{alert.resolved_by}</dd></div>}</dl>
                        <fieldset className="demo-checklist" disabled={readOnly || busy || Boolean(alert.resolved_at) || model.blocked}><legend><span className="desktop-nav-label">Czynności</span><span className="mobile-only">Protokół reagowania</span> · {alert.completed_steps.length}/{model.checklist.length}</legend>{model.checklist.map(step => <label key={step.id}><input type="checkbox" checked={alert.completed_steps.includes(step.id)} onChange={event => { const checked = event.target.checked; perform(() => updateDemoChecklist(alert.id, step.id, checked), 'Zapisano czynności lokalnie.'); }} /><span>{step.label}</span></label>)}</fieldset>
                        {alert.resolved_at ? <div className="demo-resolution-note"><h3>Notatka z rozwiązania</h3><p>{alert.resolution_note}</p></div> : !readOnly && <button className="local-button" onClick={() => openModal({ type: 'resolve', alert })} disabled={busy || model.blocked}><Check size={16} aria-hidden="true" />Oznacz jako rozwiązany</button>}
                    </div>
                </details>)}
            </section>
            <button type="button" className="mobile-alert-history mobile-disclosure-toggle" onClick={() => { setTab(tab === 'active' ? 'history' : 'active'); clearFilters(); }}>{tab === 'active' ? `Historia · ostatnio rozwiązane (${history.length})` : `Wróć do aktywnych (${active.length})`}</button>
            {modal && <LocalDialog title={modal.type === 'create' ? 'Nowe zgłoszenie demo' : modal.type === 'resolve' ? 'Rozwiązanie zgłoszenia demo' : 'Przywrócenie przykładów'} busy={busy} onClose={closeModal}>
                {modal.type === 'reset' ? <div><p className="demo-resolution-context">Twoje lokalne zgłoszenia demo, historia i odhaczone czynności zostaną zastąpione przykładami. Rzeczywiste alerty i ustawienia nie zostaną zmienione.</p>{error && <p className="monitoring-error" role="alert">{error}</p>}<footer className="local-actions"><button className="local-button" onClick={closeModal} disabled={busy}>Anuluj</button><button className="local-button primary" disabled={busy} onClick={async () => { if (await perform(() => resetDemoAlerts(), 'Przywrócono lokalne dane przykładowe.')) { setModal(null); setTab('active'); clearFilters(); } }}><RotateCcw size={16} aria-hidden="true" />Przywróć dane demo</button></footer></div>
                    : <DemoAlertForm type={modal.type} zones={model.zones} alert={modal.alert} busy={busy} error={error} onSubmit={submitModal} onCancel={closeModal} />}
            </LocalDialog>}
        </div>
    );
}
