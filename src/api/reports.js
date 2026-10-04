import { getEventWorkspace } from './eventWorkspace.js';
import { demoHistory } from '../data/eventWorkspace.js';

export function validateReportRange({ from, to }) {
    const errors = {};
    const valid = value => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
        const date = new Date(`${value}T00:00:00`);
        return Number.isFinite(date.getTime()) && date.getFullYear() === Number(value.slice(0, 4)) && date.getMonth() + 1 === Number(value.slice(5, 7)) && date.getDate() === Number(value.slice(8, 10));
    };
    if (!valid(from)) errors.from = 'Wybierz poprawną datę początkową.';
    if (!valid(to)) errors.to = 'Wybierz poprawną datę końcową.';
    if (!errors.from && !errors.to && from > to) errors.to = 'Data końcowa nie może być wcześniejsza niż początkowa.';
    return errors;
}

export function buildEventReport(event, histories, range) {
    const errors = validateReportRange(range);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);
    const start = new Date(`${range.from}T00:00:00`).getTime();
    const end = new Date(`${range.to}T00:00:00`); end.setDate(end.getDate() + 1);
    const measurements = [];
    const zones = event.zones.map(zone => {
        const samples = (histories[zone.id] ?? []).filter(sample => {
            const time = Date.parse(sample.logged_at);
            return time >= start && time < end.getTime() && Number.isFinite(sample.count) && sample.count >= 0;
        }).map(sample => ({ zone_id: zone.id, zone_name: zone.name, logged_at: sample.logged_at, count: sample.count, capacity: zone.capacity, percent: sample.count / zone.capacity * 100 }));
        measurements.push(...samples);
        return { id: zone.id, name: zone.name, capacity: zone.capacity, threshold: zone.alert_threshold ?? 90, samples: samples.length,
            peak: samples.length ? Math.max(...samples.map(sample => sample.count)) : null,
            peak_percent: samples.length ? Math.max(...samples.map(sample => sample.percent)) : null,
            average: samples.length ? samples.reduce((sum, sample) => sum + sample.count, 0) / samples.length : null,
            critical_samples: samples.filter(sample => sample.percent >= (zone.alert_threshold ?? 90)).length };
    });
    measurements.sort((a, b) => Date.parse(a.logged_at) - Date.parse(b.logged_at) || a.zone_name.localeCompare(b.zone_name, 'pl'));
    // Sum only simultaneous observations; missing zones are never inferred as empty.
    const timestamps = new Map();
    for (const sample of measurements) {
        const timestamp = Date.parse(sample.logged_at);
        if (!timestamps.has(timestamp)) timestamps.set(timestamp, { timestamp, count: 0, zones: 0 });
        const point = timestamps.get(timestamp); point.count += sample.count; point.zones += 1;
    }
    const timeline = [...timestamps.values()].sort((a, b) => a.timestamp - b.timestamp);
    return { source: 'demo', generated_at: new Date().toISOString(), event: { id: event.id, name: event.name, venue: event.venue, start_at: event.start_at, end_at: event.end_at, max_capacity: event.max_capacity, status: event.status }, range: { ...range }, zones, measurements, timeline,
        summary: { measured_zones: zones.filter(zone => zone.samples > 0).length, total_zones: zones.length, samples: measurements.length,
            peak_count: timeline.length ? Math.max(...timeline.map(point => point.count)) : null,
            peak_percent: measurements.length ? Math.max(...measurements.map(sample => sample.percent)) : null,
            partial: timeline.some(point => point.zones !== zones.length) } };
}

export async function getEventReport(eventId, range, { signal, storage } = {}) {
    signal?.throwIfAborted();
    const data = await getEventWorkspace(storage);
    signal?.throwIfAborted();
    const event = data.events.find(item => item.id === eventId);
    if (!event) throw new Error('Nie znaleziono wydarzenia raportu.');
    return buildEventReport(event, demoHistory, range);
}

function csvCell(value) {
    let text = value == null ? '' : String(value);
    // Neutralize spreadsheet formulas in user-editable event/zone names.
    if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
}

export function reportToCsv(report, kind = 'summary') {
    if (!['summary', 'measurements'].includes(kind)) throw new Error('Nieznany format CSV.');
    if (!report.summary.samples) throw new Error('Brak pomiarów do wyeksportowania.');
    const prefix = ['DEMO', report.event.name, report.range.from, report.range.to];
    const columns = ['Źródło', 'Wydarzenie', 'Data od (lokalna)', 'Data do (lokalna)'];
    const number = value => value == null ? '' : Math.round(value * 100) / 100;
    const rows = kind === 'summary'
        ? [[...columns, 'Strefa', 'Pojemność (obecna)', 'Próbki', 'Szczyt (osoby)', 'Średnia próbek (osoby)', 'Szczyt (%)', 'Próg krytyczny (%)', 'Próbki krytyczne'], ...report.zones.map(zone => [...prefix, zone.name, zone.capacity, zone.samples, zone.peak, number(zone.average), number(zone.peak_percent), zone.threshold, zone.critical_samples])]
        : [[...columns, 'Strefa', 'Czas pomiaru (UTC)', 'Osoby', 'Pojemność (obecna)', 'Obciążenie (%)'], ...report.measurements.map(sample => [...prefix, sample.zone_name, sample.logged_at, sample.count, sample.capacity, number(sample.percent)])];
    return '\uFEFF' + rows.map(row => row.map(csvCell).join(';')).join('\r\n') + '\r\n';
}
