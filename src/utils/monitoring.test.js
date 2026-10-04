import { test } from 'node:test';
import assert from 'node:assert/strict';
import { alertTime, getZoneCoordinates, getZoneStatus } from './monitoring.js';

test('occupancy thresholds use raw values, including over-capacity zones', () => {
    for (const [count, level] of [[0, 'safe'], [699, 'safe'], [700, 'warning'], [899, 'warning'], [900, 'critical'], [1200, 'critical']]) {
        assert.equal(getZoneStatus({ current_count: count, capacity: 1000 }).level, level);
    }
    assert.equal(getZoneStatus({ current_count: 899, capacity: 1000 }).percent, 89.9);
    assert.equal(getZoneStatus({ current_count: 1200, capacity: 1000 }).percent, 120);
});

test('missing or invalid capacity is not marked safe', () => {
    for (const capacity of [0, null, undefined, -1, 'invalid']) {
        assert.equal(getZoneStatus({ current_count: 0, capacity }).level, 'unknown');
    }
});

test('map accepts stored coordinates without inventing missing locations', () => {
    for (const coordinates of [[50, 19], { lat: 50, lng: 19 }, '[50,19]', '{"lat":50,"lng":19}']) {
        assert.deepEqual(getZoneCoordinates({ coordinates }), [50, 19]);
    }
    for (const coordinates of [null, undefined, 'invalid', [91, 19], [50, 181], [null, null], { lat: null, lng: null }, [Infinity, 19]]) {
        assert.equal(getZoneCoordinates({ coordinates }), null);
    }
});

test('Laravel UTC timestamps and ISO offsets represent the same instant', () => {
    const expected = Date.parse('2026-10-01T14:00:00Z');
    assert.equal(alertTime('2026-10-01 14:00:00'), expected);
    assert.equal(alertTime('2026-10-01T16:00:00+02:00'), expected);
    assert.equal(alertTime('invalid'), 0);
    assert.equal(alertTime(null), 0);
});
