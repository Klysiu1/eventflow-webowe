export function getZoneStatus(zone) {
    const count = Number(zone.current_count);
    const capacity = Number(zone.capacity);
    if (!Number.isFinite(count) || count < 0 || !Number.isFinite(capacity) || capacity <= 0) {
        return { level: 'unknown', label: 'Brak danych', percent: null, color: '#94a3b8' };
    }
    const percent = count / capacity * 100;
    if (percent >= 90) return { level: 'critical', label: 'Krytyczna', percent, color: '#F04438' };
    if (percent >= 70) return { level: 'warning', label: 'Uwaga', percent, color: '#F59E0B' };
    return { level: 'safe', label: 'Bezpieczna', percent, color: '#10B981' };
}

export function getZoneCoordinates(zone) {
    let coordinates = zone.coordinates;
    if (typeof coordinates === 'string') {
        try { coordinates = JSON.parse(coordinates); } catch { return null; }
    }
    if (!coordinates) return null;
    const latitude = Array.isArray(coordinates) ? coordinates[0] : coordinates.lat;
    const longitude = Array.isArray(coordinates) ? coordinates[1] : coordinates.lng;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
    return [latitude, longitude];
}

export const formatNumber = value => Number(value).toLocaleString('pl-PL');

export function formatPercent(percent) {
    return percent === null ? '—' : `${percent.toLocaleString('pl-PL', { maximumFractionDigits: 1 })}%`;
}

export function alertTime(value) {
    if (!value) return 0;
    // Laravel's timestamp columns are returned without an offset; the server uses UTC.
    const date = new Date(/(Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export function formatAlertTime(value) {
    const timestamp = alertTime(value);
    return timestamp ? new Date(timestamp).toLocaleString('pl-PL', { dateStyle: 'short', timeStyle: 'short' }) : 'Brak daty';
}
