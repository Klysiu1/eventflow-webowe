export const SETTINGS_KEY = 'eventflow.settings.v1';
export const defaultSettings = {
    profile: { name: '', email: '', organization: '' },
    notifications: { critical: true, warning: true, sound: false, browser: false },
    thresholds: { warning: 70, critical: 90 },
};

export function validateSettings(values) {
    const errors = {};
    if (!values.profile.name.trim() || values.profile.name.trim().length > 80) errors.name = 'Podaj imię i nazwisko (maksymalnie 80 znaków).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.profile.email.trim()) || values.profile.email.length > 254) errors.email = 'Podaj poprawny adres e-mail.';
    if (values.profile.organization.length > 120) errors.organization = 'Nazwa organizacji może mieć maksymalnie 120 znaków.';
    const warning = Number(values.thresholds.warning);
    const critical = Number(values.thresholds.critical);
    if (!Number.isInteger(warning) || warning < 1 || warning > 99) errors.warning = 'Próg ostrzegania musi wynosić od 1 do 99%.';
    if (!Number.isInteger(critical) || critical < 2 || critical > 100) errors.critical = 'Próg krytyczny musi wynosić od 2 do 100%.';
    if (!errors.warning && !errors.critical && warning >= critical) errors.critical = 'Próg krytyczny musi być wyższy od progu ostrzegania.';
    return errors;
}

function validStoredSettings(value) {
    return value && value.version === 1 && typeof value.savedAt === 'string' && Number.isFinite(Date.parse(value.savedAt))
        && ['name', 'email', 'organization'].every(key => typeof value.settings?.profile?.[key] === 'string')
        && ['critical', 'warning', 'sound', 'browser'].every(key => typeof value.settings?.notifications?.[key] === 'boolean')
        && typeof value.settings?.thresholds?.warning === 'number' && typeof value.settings?.thresholds?.critical === 'number'
        && Object.keys(validateSettings(value.settings)).length === 0;
}

export function loadSettings(storage) {
    const fallback = { settings: structuredClone(defaultSettings), savedAt: null, warning: null };
    try {
        const raw = (storage ?? window.localStorage).getItem(SETTINGS_KEY);
        if (!raw) return fallback;
        const value = JSON.parse(raw);
        if (!validStoredSettings(value)) throw new Error('Invalid settings');
        return { settings: value.settings, savedAt: value.savedAt, warning: null };
    } catch {
        return { ...fallback, warning: 'Nie udało się odczytać lokalnych ustawień. Wyświetlono wartości domyślne; dotychczasowy zapis nie został zmieniony.' };
    }
}

export async function saveSettings(values, storage) {
    if (Object.keys(validateSettings(values)).length) throw new Error('Sprawdź poprawność formularza.');
    const settings = {
        profile: Object.fromEntries(Object.entries(values.profile).map(([key, value]) => [key, value.trim()])),
        notifications: { ...values.notifications },
        thresholds: { warning: Number(values.thresholds.warning), critical: Number(values.thresholds.critical) },
    };
    const record = { version: 1, settings, savedAt: new Date().toISOString() };
    try { (storage ?? window.localStorage).setItem(SETTINGS_KEY, JSON.stringify(record)); }
    catch { throw new Error('Nie udało się zapisać ustawień w przeglądarce. Sprawdź dostęp do pamięci lokalnej i spróbuj ponownie.'); }
    return { settings, savedAt: record.savedAt, warning: null };
}
