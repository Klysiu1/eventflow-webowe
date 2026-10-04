import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { roleLabels, validateDemoAuth } from '../api/demoAuth';
import { useDemoSession } from '../store/useDemoSession';
import { Field } from '../components/WorkspaceUI';

export default function AuthPage({ register = false }) {
    const login = useDemoSession(state => state.login);
    const [values, setValues] = useState({ name: '', email: '', password: '', confirm: '', role: 'organizer' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState('');
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const navigate = useNavigate();
    const form = useRef(null);
    const change = (key, value) => { setValues(previous => ({ ...previous, [key]: value })); setErrors({}); setError(''); };
    const submit = async event => {
        event.preventDefault(); if (busy) return;
        const next = validateDemoAuth(values, register); setErrors(next);
        if (Object.keys(next).length) { form.current.elements.namedItem(Object.keys(next)[0])?.focus(); return; }
        setBusy(true);
        try { await login(values, register); setValues(previous => ({ ...previous, password: '', confirm: '' })); navigate('/events', { replace: true }); }
        catch (reason) { setError(reason.message); }
        finally { setBusy(false); }
    };
    return <main className="auth-page local-workspace"><header className="auth-brand"><ShieldCheck size={26} aria-hidden="true" /><span>EVENTFLOW</span></header><div className="auth-content"><Link className="local-text-button" to="/events"><ArrowLeft size={16} />Przeglądaj wydarzenia</Link><h1>{register ? 'Utwórz konto' : 'Zaloguj się'}</h1><p className="local-notice">Tryb demonstracyjny. Dane logowania nie są weryfikowane, konto nie powstaje na serwerze. Użyj testowego hasła, nie swojego prawdziwego. Hasło nie jest zapisywane ani wysyłane.</p><form ref={form} onSubmit={submit} noValidate><fieldset disabled={busy} className="demo-form-fields">{register && <Field label="Imię i nazwisko" name="name" autoComplete="name" maxLength={80} value={values.name} error={errors.name} onChange={e => change('name', e.target.value)} />}<Field label="Adres e-mail" name="email" type="email" autoComplete="username" maxLength={254} placeholder="organizator@example.test" value={values.email} error={errors.email} onChange={e => change('email', e.target.value)} /><div className="auth-password"><Field label="Hasło testowe" name="password" type={show ? 'text' : 'password'} autoComplete="off" maxLength={128} value={values.password} error={errors.password} onChange={e => change('password', e.target.value)} /><button type="button" className="monitoring-icon-button" aria-label={show ? 'Ukryj hasło' : 'Pokaż hasło'} title={show ? 'Ukryj hasło' : 'Pokaż hasło'} onClick={() => setShow(value => !value)}>{show ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>{register && <Field label="Powtórz hasło testowe" name="confirm" type={show ? 'text' : 'password'} autoComplete="off" maxLength={128} value={values.confirm} error={errors.confirm} onChange={e => change('confirm', e.target.value)} />}<Field label="Rola demonstracyjna" name="role" value={values.role} error={errors.role} onChange={e => change('role', e.target.value)}>{Object.entries(roleLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</Field><button className="local-button primary auth-submit" disabled={busy}>{register ? <UserPlus size={18} /> : <LogIn size={18} />}{busy ? 'Otwieranie podglądu...' : register ? 'Utwórz profil demo' : 'Zaloguj w trybie demo'}</button></fieldset>{error && <p className="monitoring-error" role="alert">{error}</p>}</form><p className="auth-alternative">{register ? 'Masz już konto?' : 'Nie masz konta?'} <Link className="local-text-button" to={register ? '/login' : '/register'}>{register ? 'Logowanie' : 'Rejestracja'}</Link></p><p className="monitoring-muted">Sesja demo dotyczy tylko tej karty przeglądarki.</p></div></main>;
}
