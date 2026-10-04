export const DEMO_SESSION_KEY = 'eventflow.session-demo.v1';
export const roleLabels = { admin: 'Administrator', organizer: 'Organizator', viewer: 'Obserwator' };
export const canEdit = session => ['admin', 'organizer'].includes(session?.role);

export function validateDemoAuth(values, register = false) {
    const errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email?.trim() ?? '') || values.email.length > 254) errors.email = 'Wpisz poprawny adres e-mail.';
    if (!Object.hasOwn(roleLabels, values.role)) errors.role = 'Wybierz rolę demonstracyjną.';
    if (!values.password || values.password.length < (register ? 8 : 1) || values.password.length > 128) errors.password = register ? 'Hasło testowe musi mieć od 8 do 128 znaków.' : 'Wpisz hasło testowe (maks. 128 znaków).';
    if (register) {
        if (!values.name?.trim() || values.name.trim().length > 80) errors.name = 'Wpisz imię i nazwisko (maks. 80 znaków).';
        if (values.confirm !== values.password) errors.confirm = 'Hasła muszą być identyczne.';
    }
    return errors;
}
export function getDemoSession(storage) {
    try {
        const raw = (storage ?? globalThis.sessionStorage).getItem(DEMO_SESSION_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data.source === 'demo' && Object.hasOwn(roleLabels, data.role) && typeof data.email === 'string' && typeof data.name === 'string' ? data : null;
    } catch { return null; }
}
export async function startDemoSession(values, register = false, storage) {
    const errors = validateDemoAuth(values, register);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    // Deliberately no password, password hash, JWT, or account database in the frontend demo.
    const session = { source: 'demo', name: register ? values.name.trim() : roleLabels[values.role], email: values.email.trim(), role: values.role };
    try { (storage ?? globalThis.sessionStorage).setItem(DEMO_SESSION_KEY, JSON.stringify(session)); }
    catch { throw new Error('Nie można zapisać sesji demo w tej karcie przeglądarki.'); }
    return session;
}
export async function endDemoSession(storage) {
    try { (storage ?? globalThis.sessionStorage).removeItem(DEMO_SESSION_KEY); }
    catch { throw new Error('Nie udało się usunąć lokalnej sesji.'); }
}
