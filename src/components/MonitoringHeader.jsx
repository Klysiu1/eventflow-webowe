import { RefreshCw } from 'lucide-react';

export default function MonitoringHeader({ title, event, status }) {
    return (
        <>
            <header className="monitoring-header">
                <div>
                    <p className="monitoring-eyebrow">{event.name}</p>
                    <h1>{title}</h1>
                    <p className="monitoring-muted">{event.venue}</p>
                </div>
                <div className="monitoring-sync">
                    <div role="status">
                        <p>{status.error ? 'Dane nieaktualne' : status.loading ? 'Odświeżanie…' : 'Odświeżanie co 5 s'}</p>
                        <p className="monitoring-muted">{status.updatedAt ? `Ostatnio: ${status.updatedAt.toLocaleTimeString('pl-PL')}` : status.error ? 'Brak potwierdzonego odczytu' : 'Pobieranie danych'}</p>
                    </div>
                    <button type="button" className="monitoring-icon-button" onClick={status.refresh} disabled={status.loading} aria-label="Odśwież dane" title="Odśwież dane">
                        <RefreshCw size={18} className={status.loading ? 'animate-spin' : ''} aria-hidden="true" />
                    </button>
                </div>
            </header>
            {status.error && <p className="monitoring-error" role="alert">{status.error}{status.updatedAt ? ' Wyświetlane są ostatnio pobrane dane.' : ''}</p>}
        </>
    );
}
