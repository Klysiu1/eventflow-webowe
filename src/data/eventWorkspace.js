const zone = (id, name, capacity, current_count, area) => ({ id, name, capacity, current_count, area, alert_threshold: 90 });

// Plan coordinates are local units (0..100), never geographic latitude/longitude.
export const initialEventWorkspace = {
    version: 1,
    selectedEventId: 'demo-festival',
    events: [
        { id: 'demo-festival', name: 'Rock Festival Kraków', venue: 'Park festiwalowy', start_at: '2026-10-01T16:00', end_at: '2026-10-01T23:00', max_capacity: 30000, status: 'active',
            zones: [
                zone('demo-stage', 'Scena Główna', 10000, 7800, { x: 5, y: 6, width: 54, height: 30 }),
                zone('demo-food', 'Food Court', 5000, 2250, { x: 65, y: 6, width: 30, height: 30 }),
                zone('demo-gate', 'Wejście Główne', 5000, 4800, { x: 5, y: 73, width: 35, height: 22 }),
                zone('demo-parking', 'Parking', 4000, 3100, { x: 45, y: 73, width: 50, height: 22 }),
                zone('demo-side', 'Scena Boczna', 3000, 1200, { x: 5, y: 43, width: 30, height: 23 }),
                zone('demo-vip', 'Strefa VIP', 800, 450, { x: 40, y: 43, width: 20, height: 23 }),
                zone('demo-toilets', 'Toalety', 1000, 890, { x: 65, y: 43, width: 13, height: 23 }),
                zone('demo-medical', 'Pomoc Medyczna', 50, 12, { x: 82, y: 43, width: 13, height: 23 }),
            ] },
        { id: 'demo-expo', name: 'Targi Technologii', venue: 'Hala Expo', start_at: '2026-10-10T09:00', end_at: '2026-10-10T18:00', max_capacity: 3000, status: 'planned',
            zones: [zone('demo-expo-main', 'Hala wystawowa', 2200, 0, { x: 5, y: 5, width: 90, height: 55 }), zone('demo-expo-entry', 'Recepcja', 500, 0, { x: 5, y: 70, width: 55, height: 25 }), zone('demo-expo-lounge', 'Strefa odpoczynku', 300, 0, { x: 65, y: 70, width: 30, height: 25 })] },
    ],
};

export const demoHistory = Object.fromEntries(initialEventWorkspace.events[0].zones.map(zone => [zone.id,
    [0.42, 0.46, 0.51, 0.6, 0.67, 0.76, 0.83, 0.88, 0.9, 0.96, 0.98, 1].map((ratio, index) => ({
        logged_at: new Date(Date.UTC(2026, 9, 1, 14, index * 5)).toISOString(), count: Math.round(zone.current_count * ratio),
    })),
]));
