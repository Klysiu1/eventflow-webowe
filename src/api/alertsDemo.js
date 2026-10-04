import { demoAlertEvent, demoAlertZones, demoAlerts, demoChecklist } from '../data/alertsDemo.js';

export const DEMO_ALERTS_KEY = 'eventflow.alerts-demo.v1';
const storageError = 'Nie udało się zapisać zmian lokalnie. Stan zgłoszeń nie został zmieniony.';

function validAlert(alert) {
    return alert && typeof alert.id === 'string' && alert.id.startsWith('demo-alert-')
        && alert.event_id === demoAlertEvent.id && demoAlertZones.some(zone => zone.id === alert.zone_id)
        && ['warning', 'critical'].includes(alert.level) && typeof alert.message === 'string' && alert.message.length <= 500
        && typeof alert.triggered_at === 'string' && Number.isFinite(Date.parse(alert.triggered_at)) && alert.source === 'demo'
        && (alert.resolved_at === null || (typeof alert.resolved_at === 'string' && Number.isFinite(Date.parse(alert.resolved_at)) && Date.parse(alert.resolved_at) >= Date.parse(alert.triggered_at)))
        && (alert.resolved_by === null || typeof alert.resolved_by === 'string')
        && typeof alert.resolution_note === 'string' && alert.resolution_note.length <= 1000
        && Array.isArray(alert.completed_steps) && new Set(alert.completed_steps).size === alert.completed_steps.length
        && alert.completed_steps.every(id => demoChecklist.some(step => step.id === id));
}

function read(storage) {
    const raw = (storage ?? window.localStorage).getItem(DEMO_ALERTS_KEY);
    if (!raw) return structuredClone(demoAlerts);
    const record = JSON.parse(raw);
    if (record.version !== 1 || !Array.isArray(record.alerts) || !record.alerts.every(validAlert)
        || new Set(record.alerts.map(alert => alert.id)).size !== record.alerts.length) throw new Error('Invalid demo records');
    return record.alerts;
}

function snapshot(alerts) {
    return { event: structuredClone(demoAlertEvent), zones: structuredClone(demoAlertZones), checklist: structuredClone(demoChecklist), alerts, warning: null, blocked: false };
}

function write(alerts, storage) {
    try { (storage ?? window.localStorage).setItem(DEMO_ALERTS_KEY, JSON.stringify({ version: 1, alerts })); }
    catch { throw new Error(storageError); }
    return snapshot(alerts);
}

export async function getDemoAlerts(storage) {
    try { return snapshot(read(storage)); }
    catch { return { ...snapshot([]), blocked: true, warning: 'Nie udało się odczytać lokalnych zgłoszeń demo. Przywróć przykłady lub sprawdź dostęp do pamięci przeglądarki.' }; }
}

export function validateManualAlert(input) {
    const errors = {};
    if (!demoAlertZones.some(zone => zone.id === input.zone_id)) errors.zone_id = 'Wybierz strefę.';
    if (!['warning', 'critical'].includes(input.level)) errors.level = 'Wybierz poziom alertu.';
    if (typeof input.message !== 'string' || input.message.trim().length < 10 || input.message.trim().length > 500) errors.message = 'Opis musi mieć od 10 do 500 znaków.';
    return errors;
}

export async function createDemoAlert(input, storage) {
    const errors = validateManualAlert(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const alerts = read(storage);
    const alert = {
        id: `demo-alert-${globalThis.crypto.randomUUID()}`, event_id: demoAlertEvent.id,
        zone_id: input.zone_id, level: input.level, message: input.message.trim(),
        triggered_at: new Date().toISOString(), resolved_at: null, resolved_by: null,
        resolution_note: '', completed_steps: [], source: 'demo',
    };
    return write([alert, ...alerts], storage);
}

export async function updateDemoChecklist(id, stepId, checked, storage) {
    if (!demoChecklist.some(step => step.id === stepId) || typeof checked !== 'boolean') throw new Error('Nieprawidłowa czynność.');
    const alerts = read(storage);
    const alert = alerts.find(item => item.id === id);
    if (!alert || alert.resolved_at) throw new Error('Zgłoszenie jest już zamknięte lub nie istnieje. Odśwież widok.');
    alert.completed_steps = checked ? [...new Set([...alert.completed_steps, stepId])] : alert.completed_steps.filter(step => step !== stepId);
    return write(alerts, storage);
}

export function validateResolution(input) {
    const errors = {};
    if (typeof input.resolved_by !== 'string' || !input.resolved_by.trim() || input.resolved_by.trim().length > 80) errors.resolved_by = 'Podaj osobę zamykającą zgłoszenie (maksymalnie 80 znaków).';
    if (typeof input.resolution_note !== 'string' || input.resolution_note.trim().length < 10 || input.resolution_note.trim().length > 1000) errors.resolution_note = 'Notatka musi mieć od 10 do 1000 znaków.';
    return errors;
}

export async function resolveDemoAlert(id, input, storage) {
    const errors = validateResolution(input);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const alerts = read(storage);
    const alert = alerts.find(item => item.id === id);
    if (!alert || alert.resolved_at) throw new Error('Zgłoszenie jest już zamknięte lub nie istnieje. Odśwież widok.');
    alert.resolved_at = new Date().toISOString();
    alert.resolved_by = input.resolved_by.trim();
    alert.resolution_note = input.resolution_note.trim();
    return write(alerts, storage);
}

export async function resetDemoAlerts(storage) {
    return write(structuredClone(demoAlerts), storage);
}
