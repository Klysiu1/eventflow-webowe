import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaultSettings, loadSettings, saveSettings, SETTINGS_KEY, validateSettings } from './settings.js';
import { createDemoAlert, DEMO_ALERTS_KEY, getDemoAlerts, resetDemoAlerts, resolveDemoAlert, updateDemoChecklist, validateManualAlert, validateResolution } from './alertsDemo.js';

function memoryStorage() {
    const data = new Map();
    return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
}
const validSettings = () => ({ ...structuredClone(defaultSettings), profile: { name: '  Jan Testowy  ', email: 'jan@example.com', organization: 'Test' } });

test('settings save normalized values and survive reload', async () => {
    const storage = memoryStorage();
    const values = validSettings();
    values.thresholds = { warning: '65', critical: '85' };
    const saved = await saveSettings(values, storage);
    assert.equal(saved.settings.profile.name, 'Jan Testowy');
    assert.deepEqual(loadSettings(storage).settings.thresholds, { warning: 65, critical: 85 });
    assert.equal(loadSettings(storage).warning, null);
});

test('invalid settings cannot replace an existing record', async () => {
    const storage = memoryStorage();
    await saveSettings(validSettings(), storage);
    const before = storage.getItem(SETTINGS_KEY);
    for (const thresholds of [{ warning: 90, critical: 70 }, { warning: '', critical: 90 }, { warning: 1.5, critical: 90 }, { warning: 70, critical: 101 }]) {
        await assert.rejects(saveSettings({ ...validSettings(), thresholds }, storage));
    }
    assert.ok(validateSettings({ ...validSettings(), profile: { name: '', email: 'bad', organization: '' } }).email);
    assert.equal(storage.getItem(SETTINGS_KEY), before);
});

test('corrupt or unavailable settings storage is reported without silent writes', async () => {
    const storage = memoryStorage();
    storage.setItem(SETTINGS_KEY, '{bad');
    assert.ok(loadSettings(storage).warning);
    assert.equal(storage.getItem(SETTINGS_KEY), '{bad');
    const blocked = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
    assert.ok(loadSettings(blocked).warning);
    await assert.rejects(saveSettings(validSettings(), blocked));
});

test('demo alert lifecycle persists checklist and resolution without touching settings', async () => {
    const storage = memoryStorage();
    await saveSettings(validSettings(), storage);
    const profile = storage.getItem(SETTINGS_KEY);
    const created = await createDemoAlert({ zone_id: 'demo-zone-a', level: 'critical', message: 'Przykładowe ręczne zgłoszenie testowe.' }, storage);
    const id = created.alerts[0].id;
    await updateDemoChecklist(id, 'acknowledged', true, storage);
    await updateDemoChecklist(id, 'acknowledged', true, storage);
    assert.deepEqual((await getDemoAlerts(storage)).alerts[0].completed_steps, ['acknowledged']);
    await updateDemoChecklist(id, 'acknowledged', false, storage);
    const resolved = await resolveDemoAlert(id, { resolved_by: 'Jan Testowy', resolution_note: 'Zakończono obsługę przykładowego zgłoszenia.' }, storage);
    assert.ok(resolved.alerts[0].resolved_at);
    assert.equal((await getDemoAlerts(storage)).alerts[0].resolved_by, 'Jan Testowy');
    await assert.rejects(resolveDemoAlert(id, { resolved_by: 'Jan', resolution_note: 'Ponowne zamknięcie zgłoszenia.' }, storage));
    await assert.rejects(updateDemoChecklist(id, 'acknowledged', true, storage));
    await resetDemoAlerts(storage);
    assert.equal((await getDemoAlerts(storage)).alerts.length, 3);
    assert.equal(storage.getItem(SETTINGS_KEY), profile);
});

test('demo writes read latest state and do not overwrite other local changes', async () => {
    const storage = memoryStorage();
    await createDemoAlert({ zone_id: 'demo-zone-a', level: 'warning', message: 'Pierwsze lokalne zgłoszenie.' }, storage);
    await updateDemoChecklist('demo-alert-1', 'zone_checked', true, storage);
    assert.equal((await getDemoAlerts(storage)).alerts.length, 4);
    assert.deepEqual((await getDemoAlerts(storage)).alerts.find(alert => alert.id === 'demo-alert-1').completed_steps, ['zone_checked']);
});

test('demo validation, corruption and quota errors do not claim success', async () => {
    const storage = memoryStorage();
    assert.ok(validateManualAlert({ zone_id: 'real-zone', level: 'bad', message: '' }).zone_id);
    assert.ok(validateResolution({ resolved_by: '', resolution_note: '' }).resolution_note);
    await assert.rejects(createDemoAlert({ zone_id: 'real-zone', level: 'critical', message: 'Przykładowy opis.' }, storage));
    storage.setItem(DEMO_ALERTS_KEY, '{bad');
    assert.equal((await getDemoAlerts(storage)).blocked, true);
    assert.equal(storage.getItem(DEMO_ALERTS_KEY), '{bad');
    await resetDemoAlerts(storage);
    const before = storage.getItem(DEMO_ALERTS_KEY);
    const full = { getItem: key => storage.getItem(key), setItem() { throw new Error('QuotaExceededError'); } };
    await assert.rejects(updateDemoChecklist('demo-alert-1', 'acknowledged', true, full));
    assert.equal(storage.getItem(DEMO_ALERTS_KEY), before);
});
