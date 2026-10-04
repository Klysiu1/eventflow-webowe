import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEventReport, getEventReport, reportToCsv, validateReportRange } from './reports.js';

const range = { from: '2026-10-01', to: '2026-10-01' };
const event = { id: 'demo-test', name: '=SUM(1;2)', venue: 'Obiekt', start_at: '2026-10-01T10:00', end_at: '2026-10-01T20:00', max_capacity: 300, status: 'active', zones: [{ id: 'a', name: 'Scena "A"', capacity: 100, alert_threshold: 90 }, { id: 'b', name: '+Zewnętrzna', capacity: 200, alert_threshold: 95 }] };
const histories = { a: [{ logged_at: '2026-10-01T12:00:00Z', count: 50 }, { logged_at: '2026-10-01T12:05:00Z', count: 100 }], b: [{ logged_at: '2026-10-01T12:00:00Z', count: 80 }, { logged_at: '2026-10-01T12:05:00Z', count: 160 }] };
test('date ranges reject missing, impossible and reversed dates', () => {
    assert.deepEqual(validateReportRange(range), {});
    assert.ok(validateReportRange({ ...range, from: '' }).from);
    assert.ok(validateReportRange({ from: '2026-02-31', to: '2026-03-03' }).from);
    assert.ok(validateReportRange({ ...range, from: '2026-10-02' }).to);
});
test('summary uses simultaneous sums, means of samples and zone-specific thresholds', () => {
    const report = buildEventReport(event, histories, range);
    assert.deepEqual(report.summary, { measured_zones: 2, total_zones: 2, samples: 4, peak_count: 260, peak_percent: 100, partial: false });
    assert.equal(report.zones[0].average, 75);
    assert.equal(report.zones[0].critical_samples, 1);
    assert.equal(report.zones[1].critical_samples, 0);
    assert.deepEqual(report.timeline.map(point => point.count), [130, 260]);
});
test('partial history and no-data are distinct from zero occupancy', () => {
    const partial = buildEventReport(event, { a: histories.a }, range);
    assert.equal(partial.summary.partial, true);
    assert.equal(partial.zones[1].peak, null);
    const empty = buildEventReport(event, histories, { from: '2026-11-01', to: '2026-11-02' });
    assert.equal(empty.summary.samples, 0); assert.equal(empty.summary.peak_count, null);
    assert.throws(() => reportToCsv(empty));
    const zero = buildEventReport(event, { a: [{ logged_at: '2026-10-01T12:00:00Z', count: 0 }] }, range);
    assert.equal(zero.summary.peak_count, 0); assert.equal(zero.summary.samples, 1);
});
test('end date is inclusive, following midnight excluded, bad samples excluded', () => {
    const samples = [{ logged_at: new Date('2026-10-01T00:00:00').toISOString(), count: 1 }, { logged_at: new Date('2026-10-01T23:59:59').toISOString(), count: 2 }, { logged_at: new Date('2026-10-02T00:00:00').toISOString(), count: 3 }, { logged_at: 'bad', count: 4 }, { logged_at: '2026-10-01T12:00:00Z', count: -1 }];
    assert.equal(buildEventReport(event, { a: samples }, range).summary.samples, 2);
});
test('CSV preserves Polish text, quotes, provenance and neutralizes formulas', () => {
    const report = buildEventReport(event, histories, range);
    const csv = reportToCsv(report);
    assert.ok(csv.startsWith('\uFEFF')); assert.ok(csv.includes('"DEMO"'));
    assert.ok(csv.includes('"\'=SUM(1;2)"')); assert.ok(csv.includes('"\'+Zewnętrzna"'));
    assert.ok(csv.includes('"Scena ""A"""'));
    assert.equal(reportToCsv(report, 'measurements').trim().split('\r\n').length, 5);
    assert.throws(() => reportToCsv(report, 'unknown'));
});
test('adapter is read-only, event-scoped, abortable and surfaces storage failure', async () => {
    const storage = { getItem: () => null, setItem: () => { throw new Error('Unexpected write'); } };
    const report = await getEventReport('demo-festival', range, { storage });
    assert.equal(report.summary.samples, 96);
    assert.equal((await getEventReport('demo-expo', range, { storage })).summary.samples, 0);
    await assert.rejects(getEventReport('missing', range, { storage }));
    await assert.rejects(getEventReport('demo-festival', range, { storage, signal: AbortSignal.abort() }));
    await assert.rejects(getEventReport('demo-festival', range, { storage: { getItem: () => '{bad' } }));
});
