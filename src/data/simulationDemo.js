// Static UI fixtures only. These values are not a crowd-flow calculation.
export const simulationDemoContext = {
    mode: 'demo',
    event: { id: 'demo-festival', name: 'Festiwal demonstracyjny' },
    zones: [
        { id: 'demo-entry-c', name: 'Wejście Główne', shortName: 'Wejście C', type: 'entrance', capacity: 5000, currentCount: 4800 },
        { id: 'demo-entry-b', name: 'Wejście B', shortName: 'B', type: 'entrance', capacity: 3000, currentCount: 1200 },
        { id: 'demo-parking', name: 'Parking / Wyjście D', shortName: 'D', type: 'exit', capacity: 4000, currentCount: 1800 },
        { id: 'demo-stage-a', name: 'Scena Główna', type: 'stage', capacity: 10000, currentCount: 7800 },
        { id: 'demo-stage-b', name: 'Scena Boczna', type: 'stage', capacity: 3000, currentCount: 1200 },
        { id: 'demo-food', name: 'Food Court', type: 'other', capacity: 5000, currentCount: 2250 },
    ],
};

export const simulationDemoResults = {
    entrance_closure: {
        flow: {
            sourceZoneId: 'demo-entry-c',
            sourceAction: 'Zamknięcie wejścia',
            destinationZoneIds: ['demo-entry-b', 'demo-parking'],
            recommendation: 'Otwórz dodatkowe przejścia i skieruj obsługę do strefy Parking / Wyjście D przed zamknięciem wejścia.',
        },
        summary: { peakOccupancyPercent: 110, timeToOverloadMinutes: 6, zonesAtRisk: 2 },
        timeline: [
            { minute: 0, occupancyPercent: 45 }, { minute: 2, occupancyPercent: 65 },
            { minute: 4, occupancyPercent: 82 }, { minute: 6, occupancyPercent: 95 },
            { minute: 8, occupancyPercent: 104 }, { minute: 10, occupancyPercent: 110 },
        ],
        zones: [
            { zoneId: 'demo-entry-b', name: 'Wejście B', beforePercent: 40, afterPercent: 94 },
            { zoneId: 'demo-parking', name: 'Parking / Wyjście D', beforePercent: 45, afterPercent: 110 },
            { zoneId: 'demo-food', name: 'Food Court', beforePercent: 45, afterPercent: 58 },
        ],
    },
    concert_end: {
        flow: {
            sourceZoneId: 'demo-stage-a',
            sourceAction: 'Zakończenie koncertu',
            destinationZoneIds: ['demo-entry-b', 'demo-parking'],
            recommendation: 'Przygotuj dodatkowe przejścia przy wyjściu D i skieruj obsługę do stref objętych wzrostem ruchu przed zakończeniem koncertu.',
        },
        summary: { peakOccupancyPercent: 118, timeToOverloadMinutes: 4, zonesAtRisk: 3 },
        timeline: [
            { minute: 0, occupancyPercent: 45 }, { minute: 2, occupancyPercent: 72 },
            { minute: 4, occupancyPercent: 96 }, { minute: 6, occupancyPercent: 118 },
            { minute: 8, occupancyPercent: 106 }, { minute: 10, occupancyPercent: 92 },
        ],
        zones: [
            { zoneId: 'demo-entry-b', name: 'Wejście B', beforePercent: 40, afterPercent: 92 },
            { zoneId: 'demo-parking', name: 'Parking / Wyjście D', beforePercent: 45, afterPercent: 118 },
            { zoneId: 'demo-food', name: 'Food Court', beforePercent: 45, afterPercent: 96 },
        ],
    },
};
