export const demoAlertEvent = { id: 'demo-alert-event', name: 'Festiwal demonstracyjny' };
export const demoAlertZones = [
    { id: 'demo-zone-a', name: 'Strefa A - Scena Główna' },
    { id: 'demo-zone-b', name: 'Strefa B - Food Court' },
    { id: 'demo-zone-c', name: 'Strefa C - Wejście Główne' },
];
export const demoChecklist = [
    { id: 'acknowledged', label: 'Potwierdzono przyjęcie zgłoszenia' },
    { id: 'zone_checked', label: 'Zweryfikowano stan strefy' },
    { id: 'actions_recorded', label: 'Odnotowano wykonane czynności' },
];
// Fictional records. Never merge these IDs or resolutions into the live event store.
export const demoAlerts = [
    { id: 'demo-alert-1', event_id: demoAlertEvent.id, zone_id: 'demo-zone-c', level: 'critical', message: 'Przykładowe przekroczenie pojemności przy wejściu głównym.', triggered_at: '2026-10-01T14:20:00Z', resolved_at: null, resolved_by: null, resolution_note: '', completed_steps: [], source: 'demo' },
    { id: 'demo-alert-2', event_id: demoAlertEvent.id, zone_id: 'demo-zone-a', level: 'warning', message: 'Przykładowy wzrost obciążenia przy scenie głównej.', triggered_at: '2026-10-01T14:25:00Z', resolved_at: null, resolved_by: null, resolution_note: '', completed_steps: ['acknowledged'], source: 'demo' },
    { id: 'demo-alert-3', event_id: demoAlertEvent.id, zone_id: 'demo-zone-b', level: 'warning', message: 'Przykładowe zgłoszenie kolejki w strefie gastronomicznej.', triggered_at: '2026-10-01T13:00:00Z', resolved_at: '2026-10-01T13:12:00Z', resolved_by: 'Organizator demo', resolution_note: 'Przykładowe zgłoszenie sprawdzono i zamknięto.', completed_steps: ['acknowledged', 'zone_checked', 'actions_recorded'], source: 'demo' },
];
