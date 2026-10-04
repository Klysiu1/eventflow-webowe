import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserRound } from 'lucide-react';
import { useDemoSession } from '../store/useDemoSession';
import { roleLabels } from '../api/demoAuth';
import { WorkspaceHeader } from '../components/WorkspaceUI';

export default function AccountPage() {
    const { session, logout } = useDemoSession();
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const leave = async () => { try { await logout(); navigate('/login'); } catch (reason) { setError(reason.message); } };
    return <div className="monitoring-page local-workspace event-workspace"><WorkspaceHeader title="Konto" subtitle="Profil sesji demonstracyjnej" />{!session ? <div className="monitoring-empty"><UserRound size={32} /><h2>Podgląd bez logowania</h2><Link className="local-button primary" to="/login">Zaloguj w trybie demo</Link></div> : <><section className="workspace-section"><h2>{session.name}</h2><dl className="event-facts"><div><dt>Adres e-mail</dt><dd>{session.email}</dd></div><div><dt>Rola</dt><dd>{roleLabels[session.role]}</dd></div><div><dt>Rodzaj sesji</dt><dd>Lokalna · bez autoryzacji serwera</dd></div></dl><div className="local-actions"><Link to="/login" className="local-button">Zmień rolę demo</Link><button className="local-button" onClick={leave}><LogOut size={16} />Wyloguj</button></div></section><section className="workspace-section"><h2>Twój widok</h2><p className="monitoring-muted">{session.role === 'viewer' ? 'Podgląd wydarzeń, stref, planów, historii i alertów. Bez edycji wydarzeń, stref i alertów.' : session.role === 'organizer' ? 'Podgląd i lokalna edycja wydarzeń, stref oraz alertów demonstracyjnych.' : 'Widok organizatora oraz zestawienie zakresów ról.'}</p></section>{session.role === 'admin' && <section className="workspace-section"><h2>Panel administratora · zakres ról</h2><div className="workspace-table-scroll"><table><thead><tr><th>Rola</th><th>Podgląd</th><th>Edycja demo</th><th>Zestawienie ról</th></tr></thead><tbody>{Object.entries(roleLabels).map(([key, label]) => <tr key={key}><th>{label}</th><td>Tak</td><td>{key === 'viewer' ? 'Nie' : 'Tak'}</td><td>{key === 'admin' ? 'Tak' : 'Nie'}</td></tr>)}</tbody></table></div></section>}</>}{error && <p role="alert" className="monitoring-error">{error}</p>}</div>;
}
