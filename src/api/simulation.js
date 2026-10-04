import { simulationDemoContext } from '../data/simulationDemo.js';
import { getEventWorkspace } from './eventWorkspace.js';
import { formatNumber } from '../utils/monitoring.js';

/**
 * Crowd simulation calculation engine based on Fruin Level of Service (LoS)
 * and Green Guide (Guide to Safety at Sports Grounds) standards.
 * Dynamically computes zone impact, crowd redistribution, timeline curve,
 * risk assessment and actionable recommendations from user input.
 */

export async function getSimulationContext({ signal } = {}) {
    signal?.throwIfAborted();
    try {
        const workspaceData = await getEventWorkspace();
        if (workspaceData?.events?.length) {
            const activeEvent = workspaceData.events.find(e => e.id === workspaceData.selectedEventId) || workspaceData.events[0];
            if (activeEvent?.zones?.length >= 2) {
                const zones = activeEvent.zones.map(z => {
                    const nameLower = z.name.toLowerCase();
                    let type = 'other';
                    if (nameLower.includes('scena') || nameLower.includes('stage')) type = 'stage';
                    else if (nameLower.includes('wejście') || nameLower.includes('gate') || nameLower.includes('bramk')) type = 'entrance';
                    else if (nameLower.includes('wyjście') || nameLower.includes('exit') || nameLower.includes('parking')) type = 'exit';
                    
                    return {
                        id: z.id,
                        name: z.name,
                        shortName: z.name.length > 15 ? z.name.slice(0, 12) + '…' : z.name,
                        type,
                        capacity: Number(z.capacity),
                        currentCount: Number(z.current_count || 0),
                    };
                });

                // Ensure at least one entrance and one stage exist
                if (!zones.some(z => z.type === 'entrance') && zones[0]) zones[0].type = 'entrance';
                if (!zones.some(z => z.type === 'stage') && zones[1]) zones[1].type = 'stage';

                return {
                    mode: 'workspace',
                    event: { id: activeEvent.id, name: activeEvent.name },
                    zones,
                };
            }
        }
    } catch {
        // Fallback to simulationDemoContext if workspace storage is inaccessible
    }
    return structuredClone(simulationDemoContext);
}

export function validateSimulationInput(input, context) {
    const errors = {};
    if (!['entrance_closure', 'concert_end'].includes(input.scenario)) errors.scenario = 'Wybierz scenariusz.';
    if (context?.event?.id && input.eventId !== context.event.id) errors.eventId = 'Wybierz dostępne wydarzenie.';
    const type = input.scenario === 'entrance_closure' ? 'entrance' : 'stage';
    if (!context.zones.some(zone => zone.id === input.zoneId && zone.type === type)) errors.zoneId = 'Wybierz strefę dla tego scenariusza.';
    if (!Number.isInteger(input.peopleCount) || input.peopleCount < 1 || input.peopleCount > 100000) errors.peopleCount = 'Podaj od 1 do 100 000 osób (liczba całkowita).';
    if (!Number.isInteger(input.durationMinutes) || input.durationMinutes < 1 || input.durationMinutes > 120) errors.durationMinutes = 'Podaj od 1 do 120 minut (liczba całkowita).';
    return errors;
}

/**
 * Calculates dynamic crowd flow, timeline, risk levels and recommendations
 * according to Green Guide and Fruin Level of Service standards.
 */
export function calculateSimulation(input, context) {
    const { scenario, zoneId, peopleCount, durationMinutes } = input;
    const sourceZone = context.zones.find(z => z.id === zoneId);
    
    // Determine destination candidates (excluding the source zone)
    const destinationCandidates = context.zones.filter(z => z.id !== zoneId);
    let destinationZones;
    let distributionWeights;

    if (scenario === 'entrance_closure') {
        // Redirection of arriving attendees to alternative entrances and parking/access points
        const primaryEntrances = destinationCandidates.filter(z => z.type === 'entrance');
        const secondary = destinationCandidates.filter(z => z.type === 'exit' || z.name.toLowerCase().includes('parking'));
        const others = destinationCandidates.filter(z => z.type !== 'entrance' && z.type !== 'exit' && !z.name.toLowerCase().includes('parking'));

        if (primaryEntrances.length > 0) {
            destinationZones = [...primaryEntrances, ...secondary.slice(0, 1)];
        } else if (secondary.length > 0) {
            destinationZones = [...secondary, ...others.slice(0, 1)];
        } else {
            destinationZones = destinationCandidates.slice(0, 3);
        }

        const primaryCount = Math.max(1, destinationZones.filter(z => z.type === 'entrance').length);
        const hasSecondary = destinationZones.some(z => z.type !== 'entrance');
        const secondaryCount = Math.max(1, destinationZones.filter(z => z.type !== 'entrance').length);
        const primaryWeightTotal = hasSecondary ? 0.75 : 1.0;
        const secondaryWeightTotal = hasSecondary ? 0.25 : 0.0;

        distributionWeights = destinationZones.map(z => {
            if (z.type === 'entrance') {
                return primaryWeightTotal / primaryCount;
            }
            return secondaryWeightTotal / secondaryCount;
        });
    } else {
        // concert_end: attendees leaving the stage disperse to:
        // 1. Exits and Parking (65%)
        // 2. Hospitality / Food Court / Amenities (25%)
        // 3. Other open stages (10%)
        // Pure entrance gates (ingress) are NOT egress destinations!
        const exits = destinationCandidates.filter(z => z.type === 'exit' || z.name.toLowerCase().includes('wyjście') || z.name.toLowerCase().includes('parking'));
        const amenities = destinationCandidates
            .filter(z => z.type === 'other' && !z.name.toLowerCase().includes('wyjście') && !z.name.toLowerCase().includes('parking'))
            .sort((a, b) => b.capacity - a.capacity);
        const otherStages = destinationCandidates.filter(z => z.type === 'stage');

        if (exits.length > 0 || amenities.length > 0 || otherStages.length > 0) {
            destinationZones = [...exits, ...amenities.slice(0, 2), ...otherStages.slice(0, 1)];
        } else {
            destinationZones = destinationCandidates.slice(0, 3);
        }

        const totalExits = Math.max(1, exits.length);
        const totalAmenities = Math.max(1, Math.min(2, amenities.length));
        const totalStages = Math.max(1, otherStages.length);

        const hasExits = exits.length > 0;
        const hasAmenities = amenities.length > 0;
        const hasStages = otherStages.length > 0;

        let exitWeight = hasExits ? 0.65 : 0;
        let amenityWeight = hasAmenities ? 0.25 : 0;
        let stageWeight = hasStages ? 0.10 : 0;

        const sumW = exitWeight + amenityWeight + stageWeight || 1;
        exitWeight /= sumW;
        amenityWeight /= sumW;
        stageWeight /= sumW;

        distributionWeights = destinationZones.map(z => {
            if (z.type === 'exit' || z.name.toLowerCase().includes('wyjście') || z.name.toLowerCase().includes('parking')) {
                return exitWeight / totalExits;
            }
            if (z.type === 'stage') {
                return stageWeight / totalStages;
            }
            return amenityWeight / totalAmenities;
        });
    }

    // Normalize weights
    const weightSum = distributionWeights.reduce((a, b) => a + b, 0) || 1;
    distributionWeights = distributionWeights.map(w => w / weightSum);

    // Calculate zone impacts
    const zoneResults = destinationZones.map((zone, idx) => {
        const weight = distributionWeights[idx];
        const addedPeople = Math.round(peopleCount * weight);
        const beforePercent = Math.round((zone.currentCount / zone.capacity) * 100);
        const afterCount = zone.currentCount + addedPeople;
        const afterPercent = Math.round((afterCount / zone.capacity) * 100);

        return {
            zoneId: zone.id,
            name: zone.name,
            beforePercent,
            afterPercent,
            addedPeople,
        };
    });

    // Find the most impacted zone (prioritizing highest added increase from scenario)
    const mostImpacted = zoneResults.reduce((best, z) => {
        if (!best) return z;
        const zDelta = z.afterPercent - z.beforePercent;
        const bestDelta = best.afterPercent - best.beforePercent;
        if (zDelta > bestDelta) return z;
        if (zDelta === bestDelta && z.afterPercent > best.afterPercent) return z;
        return best;
    }, zoneResults[0]);

    const maxBefore = mostImpacted?.beforePercent ?? 40;
    const maxAfter = mostImpacted?.afterPercent ?? 40;

    // Build timeline (6 points from 0 to durationMinutes)
    const timeline = [];
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
        const minute = Math.round((i / steps) * durationMinutes);
        const progress = i / steps;
        let factor;
        if (scenario === 'entrance_closure') {
            factor = Math.sin((progress * Math.PI) / 2);
        } else {
            if (progress <= 0.6) {
                factor = (progress / 0.6) * 1.05;
            } else {
                factor = 1.05 - (0.05 * (progress - 0.6) / 0.4);
            }
        }
        const delta = maxAfter - maxBefore;
        const occupancyPercent = delta <= 0
            ? maxAfter
            : Math.round(maxBefore + delta * Math.min(1.05, factor));
        timeline.push({ minute, occupancyPercent });
    }

    // Determine peak occupancy
    const peakOccupancyPercent = Math.max(...timeline.map(p => p.occupancyPercent), maxAfter);

    // Zones at risk: only zones that reach >= 90% and experienced increased crowd from this scenario
    const zonesAtRisk = zoneResults.filter(z => z.afterPercent >= 90 && (z.afterPercent > z.beforePercent || z.addedPeople > 0)).length;

    let timeToOverloadMinutes = null;
    if (maxAfter >= 90) {
        if (maxBefore >= 90) {
            timeToOverloadMinutes = 0;
        } else {
            const found = timeline.find(p => p.occupancyPercent >= 90);
            if (found) {
                timeToOverloadMinutes = found.minute;
            } else {
                timeToOverloadMinutes = Math.max(1, Math.round((durationMinutes * (90 - maxBefore)) / (maxAfter - maxBefore)));
            }
        }
    }

    // Dynamic recommendations based on Green Guide / Fruin LoS standards
    const flowRate = Math.round(peopleCount / durationMinutes);
    let recommendation;
    if (peakOccupancyPercent >= 110) {
        recommendation = `Krytyczne przeciążenie (${peakOccupancyPercent}% w strefie ${mostImpacted?.name ?? 'docelowej'}). Szacowany napływ ${formatNumber(flowRate)} os./min przekracza bezpieczną przepustowość ewakuacyjną (Fruin LoS F). Wymagane natychmiastowe uruchomienie buforów przedbramkowych i spowolnienie strumienia do maks. ${formatNumber(Math.round(flowRate * 0.6))} os./min.`;
    } else if (peakOccupancyPercent >= 90) {
        recommendation = `Podwyższone ryzyko zatoru (${peakOccupancyPercent}% w strefie ${mostImpacted?.name ?? 'docelowej'}). Przekroczenie progu bezpieczeństwa w ${timeToOverloadMinutes !== null ? `${timeToOverloadMinutes}. minucie` : 'czasie symulacji'}. Skieruj służby porządkowe do kierowania strumieniem pieszych i udrożnij alternatywne przejścia.`;
    } else if (peakOccupancyPercent >= 70) {
        recommendation = `Ruch umiarkowany (szczyt ${peakOccupancyPercent}% w strefie ${mostImpacted?.name ?? 'docelowej'}). Przepływ ${formatNumber(flowRate)} os./min mieści się w dopuszczalnym standardzie Fruin LoS C. Monitoruj na bieżąco zapełnienie ciągów pieszych.`;
    } else {
        recommendation = `Przepływ w normie (szczyt ${peakOccupancyPercent}% w strefie ${mostImpacted?.name ?? 'docelowej'}). Natężenie ${formatNumber(flowRate)} os./min mieści się w bezpiecznym zakresie normy Fruin LoS A/B. Dostępna rezerwa przepustowości jest w pełni wystarczająca.`;
    }

    const sourceAction = scenario === 'entrance_closure' ? 'Zamknięcie wejścia' : 'Zakończenie koncertu';
    const destinationZoneIds = zoneResults.slice(0, 2).map(z => z.zoneId);

    return {
        mode: 'calculated',
        parameters: { ...input },
        summary: {
            peakOccupancyPercent,
            timeToOverloadMinutes,
            zonesAtRisk,
        },
        timeline,
        zones: zoneResults.map(({ zoneId: zid, name, beforePercent, afterPercent }) => ({
            zoneId: zid,
            name,
            beforePercent,
            afterPercent,
        })),
        flow: {
            sourceZoneId: sourceZone?.id ?? zoneId,
            sourceAction,
            destinationZoneIds,
            recommendation,
        },
    };
}

export async function runSimulation(input, { signal } = {}) {
    signal?.throwIfAborted();
    const context = await getSimulationContext({ signal });
    const errors = validateSimulationInput(input, context);
    if (Object.keys(errors).length) throw new Error(Object.values(errors)[0]);

    return calculateSimulation(input, context);
}
