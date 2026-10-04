import { Link } from 'react-router-dom';
import { FlaskConical } from 'lucide-react';
import { useId } from 'react';
import '../pages/monitoring.css';
import '../pages/local-workspace.css';
import '../pages/event-workspace.css';

export function WorkspaceHeader({ title, subtitle, children, compactMobile = false }) {
    return <header className="monitoring-header"><div><p className="monitoring-eyebrow">Panel organizatora</p><h1>{title}</h1><p className="monitoring-muted">{subtitle}</p></div><div className="local-actions"><span className={`local-badge ${compactMobile ? 'desktop-nav-label' : ''}`}><FlaskConical size={16} aria-hidden="true" />Demo lokalne</span>{children}</div></header>;
}
export function WorkspaceState({ error, retry }) {
    return <div className="monitoring-empty">{error ? <><p role="alert">{error}</p><button className="local-button" onClick={retry}>Spróbuj ponownie</button></> : <p role="status">Ładowanie danych demo...</p>}</div>;
}
export function ReadOnlyNotice() {
    return <p className="local-notice">Podgląd obserwatora. <Link className="local-text-button" to="/login">Zmień rolę w logowaniu demo</Link></p>;
}
export function Field({ label, name, error, children, ...props }) {
    const id = useId();
    const shared = { id, name, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-error` : undefined, ...props };
    return <div className="local-field"><label htmlFor={id}>{label}</label>{children ? <select {...shared}>{children}</select> : <input {...shared} />}{error && <p className="local-field-error" role="alert" id={`${id}-error`}>{error}</p>}</div>;
}
