import { getZoneStatus } from './monitoring.js';

export function getDemoZoneStatus(zone) {
    const status = getZoneStatus(zone);
    if (status.percent === null) return status;
    if (status.percent >= (zone.alert_threshold ?? 90)) return { ...status, level: 'critical', label: 'Krytyczna', color: '#E53E3E' };
    if (status.percent >= 70) return { ...status, level: 'warning', label: 'Uwaga', color: '#D69E2E' };
    return { ...status, level: 'safe', label: 'Bezpieczna', color: '#38A169' };
}
