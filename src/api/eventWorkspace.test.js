import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_WORKSPACE_KEY, getDemoZoneHistory, getEventWorkspace, saveDemoEvent, saveDemoZone, selectDemoEvent, validateEvent, validateZone } from './eventWorkspace.js';
import { canEdit, DEMO_SESSION_KEY, endDemoSession, getDemoSession, startDemoSession, validateDemoAuth } from './demoAuth.js';
import { getDemoZoneStatus } from '../utils/demoZones.js';

function memory() { const entries = new Map(); return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) }; }
const newEvent = { name: 'Nowy koncert', venue: 'Hala testowa', start_at: '2026-11-01T18:00', end_at: '2026-11-01T22:00', max_capacity: 2000, status: 'planned' };
const newZone = { name: 'Nowa scena', capacity: 500, alert_threshold: 90, area: { x: 5, y: 5, width: 40, height: 30 } };
test('workspace reads have no writes and fixtures are cloned', async () => {
    const storage = memory(); const first = await getEventWorkspace(storage);
    first.events[0].name = 'Changed';
    assert.notEqual((await getEventWorkspace(storage)).events[0].name, 'Changed');
    assert.equal(storage.getItem(EVENT_WORKSPACE_KEY), null);
});
test('selection persists and preserves other events', async () => {
    const storage = memory(); const before = await getEventWorkspace(storage);
    await selectDemoEvent('demo-expo', storage);
    const after = await getEventWorkspace(storage);
    assert.equal(after.selectedEventId, 'demo-expo'); assert.deepEqual(after.events, before.events);
    await assert.rejects(selectDemoEvent('absent', storage));
});
test('event validation rejects invalid date order, capacity and status', () => {
    assert.deepEqual(validateEvent(newEvent), {});
    assert.ok(validateEvent({ ...newEvent, start_at: '2026-02-31T18:00' }).start_at);
    for (const [key, value] of Object.entries({ name: ' ', venue: '', start_at: 'bad', end_at: '2020-01-01T10:00', max_capacity: -2, status: 'unknown' })) assert.ok(validateEvent({ ...newEvent, [key]: value })[key]);
});
test('create/edit events and zones preserve counts and unrelated data', async () => {
    const storage = memory(); const initial = await getEventWorkspace(storage);
    let data = await saveDemoEvent(null, newEvent, storage); const id = data.selectedEventId;
    assert.deepEqual(data.events.slice(0, 2), initial.events);
    data = await saveDemoZone(id, null, newZone, storage);
    const zone = data.events.at(-1).zones[0]; assert.equal(zone.current_count, 0);
    data = await saveDemoZone(id, zone.id, { ...zone, name: 'Nowa nazwa', current_count: 999 }, storage);
    assert.equal(data.events.at(-1).zones[0].current_count, 0);
    data = await saveDemoEvent(id, { ...newEvent, name: 'Zmiana nazwy' }, storage);
    assert.equal(data.events.at(-1).zones[0].name, 'Nowa nazwa');
    data = await saveDemoEvent(id, { ...newEvent, zones: [{ name: 'Strefa A', capacity: 100, alert_threshold: 85, area: { x: 0, y: 0, width: 20, height: 20 } }, { name: 'Strefa B', capacity: 200, alert_threshold: 90, area: { x: 30, y: 0, width: 20, height: 20 } }] }, storage);
    assert.equal(data.events.at(-1).zones.length, 2);
    assert.equal(data.events.at(-1).zones[0].name, 'Strefa A');
    await assert.rejects(saveDemoEvent(id, { ...newEvent, zones: [{ name: 'Kolizja 1', capacity: 100, alert_threshold: 80, area: { x: 0, y: 0, width: 20, height: 20 } }, { name: 'Kolizja 2', capacity: 100, alert_threshold: 80, area: { x: 10, y: 10, width: 20, height: 20 } }] }, storage));
});
test('zone validation rejects overlap, duplicate names, boundary and fractions', () => {
    assert.deepEqual(validateZone(newZone), {});
    assert.ok(validateZone({ ...newZone, name: 'Druga' }, [newZone]).area);
    assert.ok(validateZone(newZone, [newZone]).name);
    assert.ok(validateZone({ ...newZone, area: { ...newZone.area, x: 95 } }).area);
    assert.ok(validateZone({ ...newZone, capacity: 1.3 }).capacity);
    assert.ok(validateZone({ ...newZone, alert_threshold: 70 }).alert_threshold);
});
test('zone arranger geometry supports touching edges and enforces min/max dimensions', () => {
    const zoneLeft = { name: 'Lewa', capacity: 100, alert_threshold: 90, area: { x: 0, y: 0, width: 50, height: 50 } };
    const zoneRight = { name: 'Prawa', capacity: 100, alert_threshold: 90, area: { x: 50, y: 0, width: 50, height: 50 } };
    assert.deepEqual(validateZone(zoneRight, [zoneLeft]), {});
    const minZone = { name: 'Minimalna', capacity: 50, alert_threshold: 80, area: { x: 95, y: 95, width: 5, height: 5 } };
    assert.deepEqual(validateZone(minZone, []), {});
    assert.ok(validateZone({ ...minZone, area: { ...minZone.area, width: 4 } }, []).width);
    assert.ok(validateZone({ ...minZone, area: { ...minZone.area, height: 4 } }, []).height);
    assert.ok(validateZone({ ...minZone, area: { ...minZone.area, x: 96 } }, []).area);
});
test('history belongs to its event and stays fixed after capacity edits', async () => {
    const storage = memory(); const data = await getEventWorkspace(storage); const zone = data.events[0].zones[0];
    const history = await getDemoZoneHistory('demo-festival', zone.id, storage);
    assert.equal(history.samples.length, 12); assert.equal(history.samples.at(-1).count, zone.current_count);
    await saveDemoZone('demo-festival', zone.id, { ...zone, capacity: 9000 }, storage);
    assert.deepEqual(await getDemoZoneHistory('demo-festival', zone.id, storage), history);
    await assert.rejects(getDemoZoneHistory('demo-expo', zone.id, storage));
});
test('corrupt or blocked storage never produces a successful write', async () => {
    const storage = memory(); storage.setItem(EVENT_WORKSPACE_KEY, '{bad');
    await assert.rejects(getEventWorkspace(storage)); await assert.rejects(saveDemoEvent(null, newEvent, storage));
    assert.equal(storage.getItem(EVENT_WORKSPACE_KEY), '{bad');
    await assert.rejects(saveDemoEvent(null, newEvent, { getItem: () => null, setItem: () => { throw new Error('quota'); } }));
});
test('demo thresholds differ from live thresholds without changing live data', () => {
    assert.equal(getDemoZoneStatus({ capacity: 100, current_count: 92, alert_threshold: 95 }).level, 'warning');
    assert.equal(getDemoZoneStatus({ capacity: 100, current_count: 92, alert_threshold: 90 }).level, 'critical');
});
test('auth validates registration, never stores passwords, respects role and logout', async () => {
    const storage = memory(); const values = { name: 'Test User', email: 'test@example.test', password: 'test12345', confirm: 'test12345', role: 'organizer' };
    assert.deepEqual(validateDemoAuth(values, true), {});
    assert.ok(validateDemoAuth({ ...values, confirm: 'different' }, true).confirm);
    assert.ok(validateDemoAuth({ ...values, role: 'root' }).role);
    await startDemoSession(values, true, storage);
    assert.equal(storage.getItem(DEMO_SESSION_KEY).includes('test12345'), false);
    assert.equal(storage.getItem(DEMO_SESSION_KEY).includes('password'), false);
    assert.equal(canEdit(getDemoSession(storage)), true);
    assert.equal(canEdit({ role: 'viewer' }), false); assert.equal(canEdit(null), false);
    await endDemoSession(storage); assert.equal(getDemoSession(storage), null);
    await assert.rejects(startDemoSession(values, true, { setItem: () => { throw new Error(); } }));
});
