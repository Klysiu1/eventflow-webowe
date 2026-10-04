import { demoHistory, initialEventWorkspace } from '../data/eventWorkspace.js';

export const EVENT_WORKSPACE_KEY = 'eventflow.events-demo.v1';
export const eventStatuses = { planned: 'Planowane', active: 'Aktywne', ended: 'Zakończone' };
const number = value => ['number', 'string'].includes(typeof value) && String(value).trim() !== '' && Number.isFinite(Number(value));
const integer = (value, min, max) => number(value) && Number.isInteger(Number(value)) && Number(value) >= min && Number(value) <= max;
const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const validDate = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
    const date = new Date(value);
    const parts = value.split(/[-T:]/).map(Number);
    return [date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()].every((part, index) => part === parts[index]);
};

export function validateEvent(values) {
    const errors = {};
    if (!text(values.name, 2, 200)) errors.name = 'Wpisz nazwę od 2 do 200 znaków.';
    if (!text(values.venue, 2, 200)) errors.venue = 'Wpisz nazwę obiektu od 2 do 200 znaków.';
    if (!validDate(values.start_at)) errors.start_at = 'Podaj datę i godzinę rozpoczęcia.';
    if (!validDate(values.end_at) || Date.parse(values.end_at) <= Date.parse(values.start_at)) errors.end_at = 'Zakończenie musi być późniejsze niż rozpoczęcie.';
    if (!integer(values.max_capacity, 1, 1000000)) errors.max_capacity = 'Pojemność: liczba całkowita od 1 do 1 000 000.';
    if (!Object.hasOwn(eventStatuses, values.status)) errors.status = 'Wybierz status wydarzenia.';
    return errors;
}

export function validateZone(values, otherZones = []) {
    const errors = {};
    if (!text(values.name, 2, 100)) errors.name = 'Wpisz nazwę od 2 do 100 znaków.';
    else if (otherZones.some(zone => zone.name.toLocaleLowerCase('pl') === values.name.trim().toLocaleLowerCase('pl'))) errors.name = 'Strefa o tej nazwie już istnieje w wydarzeniu.';
    if (!integer(values.capacity, 1, 1000000)) errors.capacity = 'Pojemność: liczba całkowita od 1 do 1 000 000.';
    if (!integer(values.alert_threshold, 71, 100)) errors.alert_threshold = 'Próg krytyczny: liczba całkowita od 71 do 100%.';
    const area = values.area ?? {};
    for (const key of ['x', 'y', 'width', 'height']) {
        if (!integer(area[key], ['width', 'height'].includes(key) ? 5 : 0, 100)) errors[key] = 'Podaj całkowitą wartość w granicach planu (rozmiar min. 5).';
    }
    if (Number(area.x) + Number(area.width) > 100 || Number(area.y) + Number(area.height) > 100) errors.area = 'Obszar strefy musi mieścić się w planie 100 × 100.';
    if (!Object.keys(errors).length && otherZones.some(zone => {
        const b = zone.area;
        return b && Number(area.x) < b.x + b.width && Number(area.x) + Number(area.width) > b.x && Number(area.y) < b.y + b.height && Number(area.y) + Number(area.height) > b.y;
    })) errors.area = 'Obszar nachodzi na inną strefę. Zmień położenie lub rozmiar.';
    return errors;
}

function read(storage) {
    let raw;
    try { raw = (storage ?? globalThis.localStorage).getItem(EVENT_WORKSPACE_KEY); }
    catch { throw new Error('Przeglądarka blokuje odczyt lokalnych wydarzeń.'); }
    if (!raw) return structuredClone(initialEventWorkspace);
    try {
        const data = JSON.parse(raw);
        const ids = new Set();
        if (data.version !== 1 || !Array.isArray(data.events) || !data.events.length) throw new Error();
        for (const event of data.events) {
            if (typeof event.id !== 'string' || !event.id.startsWith('demo-') || ids.has(event.id) || Object.keys(validateEvent(event)).length || !Array.isArray(event.zones)) throw new Error();
            ids.add(event.id);
            for (const zone of event.zones) {
                if (typeof zone.id !== 'string' || !zone.id.startsWith('demo-') || ids.has(zone.id) || Object.keys(validateZone(zone)).length || !integer(zone.current_count, 0, 10000000)) throw new Error();
                ids.add(zone.id);
            }
        }
        if (!data.events.some(event => event.id === data.selectedEventId)) throw new Error();
        return data;
    } catch { throw new Error('Zapisane wydarzenia demo są nieprawidłowe. Dane nie zostały nadpisane.'); }
}

function write(data, storage) {
    try { (storage ?? globalThis.localStorage).setItem(EVENT_WORKSPACE_KEY, JSON.stringify(data)); }
    catch { throw new Error('Nie udało się zapisać lokalnie. Sprawdź dostęp do pamięci przeglądarki.'); }
    return data;
}

export async function getEventWorkspace(storage) { return read(storage); }
export async function selectDemoEvent(id, storage) {
    const data = read(storage);
    if (!data.events.some(event => event.id === id)) throw new Error('Nie znaleziono wydarzenia.');
    return write({ ...data, selectedEventId: id }, storage);
}
export async function saveDemoEvent(id, values, storage) {
    const errors = validateEvent(values);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const data = read(storage);
    const old = id ? data.events.find(event => event.id === id) : null;
    if (id && !old) throw new Error('Nie znaleziono wydarzenia.');
    let zones = old?.zones ?? [];
    if (values.zones !== undefined) {
        if (!Array.isArray(values.zones)) throw new Error('Nieprawidłowy format listy stref.');
        for (let i = 0; i < values.zones.length; i++) {
            const z = values.zones[i];
            const others = values.zones.filter((_, idx) => idx !== i);
            const zErrors = validateZone(z, others);
            if (Object.keys(zErrors).length) {
                throw new Error(`Strefa "${z.name || (i + 1)}": ${Object.values(zErrors)[0]}`);
            }
        }
        zones = values.zones.map(z => {
            const existingZone = old?.zones?.find(oz => oz.id === z.id);
            return {
                id: z.id && typeof z.id === 'string' && z.id.startsWith('demo-') ? z.id : `demo-zone-${crypto.randomUUID()}`,
                name: z.name.trim(),
                capacity: Number(z.capacity),
                alert_threshold: Number(z.alert_threshold ?? 90),
                current_count: Number(z.current_count ?? existingZone?.current_count ?? 0),
                area: {
                    x: Math.round(Number(z.area.x)),
                    y: Math.round(Number(z.area.y)),
                    width: Math.round(Number(z.area.width)),
                    height: Math.round(Number(z.area.height)),
                }
            };
        });
    }
    const event = { id: old?.id ?? `demo-event-${crypto.randomUUID()}`, name: values.name.trim(), venue: values.venue.trim(), start_at: values.start_at, end_at: values.end_at, status: values.status, max_capacity: Number(values.max_capacity), zones };
    return write({ ...data, selectedEventId: event.id, events: old ? data.events.map(item => item.id === id ? event : item) : [...data.events, event] }, storage);
}
export async function saveDemoZone(eventId, id, values, storage) {
    const data = read(storage);
    const event = data.events.find(item => item.id === eventId);
    if (!event) throw new Error('Nie znaleziono wydarzenia.');
    const old = id ? event.zones.find(zone => zone.id === id) : null;
    if (id && !old) throw new Error('Nie znaleziono strefy.');
    const errors = validateZone(values, event.zones.filter(zone => zone.id !== id));
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const zone = { id: old?.id ?? `demo-zone-${crypto.randomUUID()}`, name: values.name.trim(), capacity: Number(values.capacity), alert_threshold: Number(values.alert_threshold), current_count: old?.current_count ?? 0, area: Object.fromEntries(['x', 'y', 'width', 'height'].map(key => [key, Number(values.area[key])])) };
    event.zones = old ? event.zones.map(item => item.id === id ? zone : item) : [...event.zones, zone];
    return write(data, storage);
}
export async function getDemoZoneHistory(eventId, zoneId, storage) {
    const event = read(storage).events.find(item => item.id === eventId);
    if (!event?.zones.some(zone => zone.id === zoneId)) throw new Error('Nie znaleziono strefy.');
    return { source: 'demo', samples: structuredClone(demoHistory[zoneId] ?? []) };
}
