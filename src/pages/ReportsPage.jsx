import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Download, FileChartColumn, Printer, RefreshCw } from 'lucide-react';
import { getEventReport, reportToCsv, validateReportRange } from '../api/reports';
import { eventStatuses } from '../api/eventWorkspace';
import { useWorkspace } from '../hooks/useWorkspace';
import { Field, WorkspaceHeader, WorkspaceState } from '../components/WorkspaceUI';
import { formatNumber, formatPercent } from '../utils/monitoring';
import ReportChart from '../components/ReportChart';
import './reports.css';

const numeric = value => value == null ? 'Brak danych' : formatNumber(Math.round(value * 10) / 10);

function EventReport({ event }) {
    const initialRange = { from: event.start_at.slice(0, 10), to: event.end_at.slice(0, 10) };
    const [draft, setDraft] = useState(initialRange);
    const [range, setRange] = useState(initialRange);
    const [attempt, setAttempt] = useState(0);
    const [state, setState] = useState({ phase: 'loading', report: null, error: '' });
    const [errors, setErrors] = useState({});
    const [format, setFormat] = useState('summary');
    const [exportMessage, setExportMessage] = useState('');
    const [exportError, setExportError] = useState('');
    const formRef = useRef(null);
    const activeKey = JSON.stringify([event, range, attempt]);
    useEffect(() => {
        const controller = new AbortController();
        getEventReport(event.id, range, { signal: controller.signal }).then(report => {
            if (!controller.signal.aborted) setState({ phase: 'ready', report, error: '', key: activeKey });
        }).catch(error => {
            if (!controller.signal.aborted) setState({ phase: 'error', report: null, error: error.message, key: activeKey });
        });
        return () => controller.abort();
    }, [event.id, range, activeKey]);
    const loading = state.key !== activeKey || state.phase === 'loading';
    const report = loading ? null : state.report;
    const dirty = draft.from !== range.from || draft.to !== range.to;
    const changeDate = (key, value) => { setDraft(previous => ({ ...previous, [key]: value })); setErrors({}); setExportMessage(''); setExportError(''); };
    const apply = e => {
        e.preventDefault(); const next = validateReportRange(draft); setErrors(next);
        if (Object.keys(next).length) { formRef.current.elements.namedItem(Object.keys(next)[0])?.focus(); return; }
        setRange({ ...draft }); setAttempt(value => value + 1); setExportMessage(''); setExportError('');
    };
    const exportReport = () => {
        if (!report?.summary.samples || dirty || loading) return;
        setExportError(''); setExportMessage('');
        try {
            if (format === 'print') { window.print(); return; }
            const blob = new Blob([reportToCsv(report, format)], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url; anchor.download = `eventflow-demo-${range.from}-${range.to}-${format}.csv`;
            document.body.append(anchor); anchor.click(); anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            setExportMessage('Przekazano plik CSV do pobrania.');
        } catch { setExportError('Nie udało się wyeksportować raportu. Spróbuj ponownie.'); }
    };
    return <>
        <form className="report-filters" onSubmit={apply} ref={formRef} noValidate aria-label="Zakres dat raportu"><Field label="Data od (czas lokalny)" name="from" type="date" value={draft.from} error={errors.from} onChange={e => changeDate('from', e.target.value)} /><Field label="Data do (włącznie)" name="to" type="date" value={draft.to} error={errors.to} onChange={e => changeDate('to', e.target.value)} /><button type="submit" className="local-button primary" disabled={loading}><RefreshCw size={16} />Pokaż raport</button></form>
        {dirty && <p className="monitoring-notice report-controls" role="status">Zakres zmieniony. Zastosuj daty, aby odświeżyć raport i odblokować eksport.</p>}
        <section aria-busy={loading} className="report-results">
            {loading ? <div className="monitoring-empty" role="status">Przygotowywanie raportu...</div> : state.error ? <div className="monitoring-empty"><p role="alert">{state.error}</p><button className="local-button" onClick={() => setAttempt(value => value + 1)}><RefreshCw size={16} />Spróbuj ponownie</button></div> : report && <>
                <header className="report-document-header"><div><h2>Podsumowanie · {report.event.name}</h2><p>{report.event.venue} · {eventStatuses[report.event.status]}</p><p>Okres: {range.from} - {range.to} · czas lokalny</p></div><span className="report-demo-stamp">RAPORT DEMONSTRACYJNY</span></header>
                <dl className="monitoring-stats"><div><dt>Strefy z pomiarami</dt><dd>{report.summary.measured_zones}<small> / {report.summary.total_zones}</small></dd></div><div><dt>Liczba próbek</dt><dd>{formatNumber(report.summary.samples)}</dd></div><div><dt>Szczyt sumy pomiarów</dt><dd>{numeric(report.summary.peak_count)}</dd></div><div><dt>Największe obciążenie strefy</dt><dd className="text-primary">{report.summary.peak_percent === null ? 'Brak danych' : formatPercent(report.summary.peak_percent)}</dd></div></dl>
                {report.summary.samples === 0 ? <div className="monitoring-empty"><FileChartColumn size={32} /><h2>Brak pomiarów w wybranym okresie</h2><p>{event.zones.length ? 'Wybierz inny zakres. Przykładowa historia festiwalu pochodzi z 1 października 2026.' : 'To wydarzenie nie ma jeszcze stref.'}</p><Link className="local-text-button" to={`/map/demo?event=${encodeURIComponent(event.id)}`}>Przejdź do stref wydarzenia</Link></div> : <>
                    <p className="report-method">Suma jednoczesnych pomiarów w strefach nie oznacza liczby unikalnych uczestników. Średnie dotyczą próbek, a procenty i progi korzystają z obecnej konfiguracji stref.</p>
                    {report.summary.partial && <p className="monitoring-notice">Niepełne pokrycie: część stref nie ma pomiarów w niektórych punktach czasu. Sumy obejmują tylko dostępne próbki.</p>}
                    <section className="workspace-section"><h2>Historia obciążenia</h2><p className="monitoring-muted">Suma osób w strefach z pomiarami</p><ReportChart timeline={report.timeline} partial={report.summary.partial} /><details className="history-table"><summary>Dane wykresu</summary><div className="workspace-table-scroll"><table><thead><tr><th scope="col">Czas lokalny</th><th scope="col">Osoby</th><th scope="col">Strefy z pomiarem</th></tr></thead><tbody>{report.timeline.map(point => <tr key={point.timestamp}><td>{new Date(point.timestamp).toLocaleString('pl-PL')}</td><td>{formatNumber(point.count)}</td><td>{point.zones} / {report.summary.total_zones}</td></tr>)}</tbody></table></div></details></section>
                    <section className="workspace-section"><h2>Podsumowanie stref</h2><div className="workspace-table-scroll" tabIndex={0} role="region" aria-label="Tabela podsumowania stref"><table className="report-zones"><thead><tr><th scope="col">Strefa</th><th scope="col">Próbki</th><th scope="col">Szczyt osób</th><th scope="col">Średnia osób</th><th scope="col">Szczyt %</th><th scope="col">Próbki krytyczne</th></tr></thead><tbody>{report.zones.map(zone => <tr key={zone.id}><th scope="row"><Link to={`/map/demo/${event.id}/${zone.id}`}>{zone.name}</Link></th><td>{zone.samples}</td><td>{numeric(zone.peak)}</td><td>{numeric(zone.average)}</td><td>{zone.peak_percent === null ? 'Brak danych' : formatPercent(zone.peak_percent)}</td><td>{zone.samples ? zone.critical_samples : 'Brak danych'}</td></tr>)}</tbody></table></div></section>
                </>}
                <div className="report-export report-controls"><Field label="Format eksportu" name="format" value={format} onChange={e => setFormat(e.target.value)}><option value="summary">CSV · podsumowanie stref</option><option value="measurements">CSV · wszystkie pomiary</option><option value="print">Druk / zapisz jako PDF</option></Field><button type="button" className="local-button" onClick={exportReport} disabled={!report.summary.samples || dirty}>{format === 'print' ? <Printer size={16} /> : <Download size={16} />}{format === 'print' ? 'Drukuj / PDF' : 'Pobierz CSV'}</button></div>
                {exportMessage && <p className="local-success report-controls" role="status">{exportMessage}</p>}{exportError && <p className="monitoring-error report-controls" role="alert">{exportError}</p>}
                <footer className="report-generated">Wygenerowano: {new Date(report.generated_at).toLocaleString('pl-PL')} · Dane demonstracyjne, nie raport z rzeczywistego wydarzenia.</footer>
            </>}
        </section>
    </>;
}

export default function ReportsPage() {
    const { data, error, load } = useWorkspace();
    const [params, setParams] = useSearchParams();
    if (!data) return <WorkspaceState error={error} retry={load} />;
    const event = data.events.find(item => item.id === (params.get('event') || data.selectedEventId));
    return <div className="monitoring-page local-workspace event-workspace reports-page"><div className="report-controls"><WorkspaceHeader title="Raporty" subtitle="Historia obciążenia i podsumowania wydarzeń" /><div className="workspace-event-switch"><Field label="Wydarzenie raportu" name="eventId" value={event?.id ?? ''} onChange={e => setParams({ event: e.target.value })}>{!event && <option value="">Wybierz wydarzenie</option>}{data.events.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</Field><Link to="/events" className="local-text-button">Lista wydarzeń</Link></div></div>{event ? <EventReport key={event.id} event={event} /> : <p role="alert" className="monitoring-error">Nie znaleziono wydarzenia. Wybierz inne z listy.</p>}</div>;
}
