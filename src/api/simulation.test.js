import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSimulationContext, runSimulation, validateSimulationInput } from './simulation.js';

const input = { eventId: 'demo-festival', scenario: 'entrance_closure', zoneId: 'demo-entry-c', peopleCount: 4800, durationMinutes: 10 };

test('demo context and responses are independent copies', async () => {
    const context = await getSimulationContext();
    context.zones[0].name = 'changed';
    assert.equal((await getSimulationContext()).zones[0].name, 'Wejście Główne');
    const result = await runSimulation(input);
    assert.equal(result.mode, 'calculated');
    assert.deepEqual(result.parameters, input);
    result.zones[0].afterPercent = 0;
    assert.equal((await runSimulation(input)).zones[0].afterPercent, 160);
});

test('simulations dynamically calculate realistic outcomes from user parameters', async () => {
    const highLoad = await runSimulation(input);
    const lowLoad = await runSimulation({ ...input, peopleCount: 100, durationMinutes: 60 });
    const singlePerson = await runSimulation({ ...input, scenario: 'concert_end', zoneId: 'demo-stage-a', peopleCount: 1, durationMinutes: 10 });

    assert.notDeepEqual(highLoad.summary, lowLoad.summary);
    assert.notDeepEqual(highLoad.timeline, lowLoad.timeline);

    // High load (4800 people at entrance closure)
    assert.equal(highLoad.summary.peakOccupancyPercent, 160);
    assert.equal(highLoad.summary.zonesAtRisk, 1);
    assert.equal(highLoad.summary.timeToOverloadMinutes, 4);
    assert.equal(highLoad.timeline[highLoad.timeline.length - 1].minute, 10);

    // Low load (100 people over 60m) stays safe
    assert.equal(lowLoad.parameters.peopleCount, 100);
    assert.equal(lowLoad.summary.peakOccupancyPercent, 43);
    assert.equal(lowLoad.summary.zonesAtRisk, 0);
    assert.equal(lowLoad.summary.timeToOverloadMinutes, null);
    assert.equal(lowLoad.timeline[lowLoad.timeline.length - 1].minute, 60);

    // 1 person leaving concert must be completely safe with 0 zones at risk and no overload
    assert.equal(singlePerson.summary.zonesAtRisk, 0);
    assert.equal(singlePerson.summary.timeToOverloadMinutes, null);
    assert.ok(singlePerson.summary.peakOccupancyPercent <= 50);
    assert.ok(!singlePerson.zones.some(z => z.name === 'Wejście Główne'));

    // Large concert end scenario redirects to exits and food court
    const concert = await runSimulation({ ...input, scenario: 'concert_end', zoneId: 'demo-stage-a', peopleCount: 7800, durationMinutes: 10 });
    assert.equal(concert.summary.peakOccupancyPercent, 178);
    assert.equal(concert.summary.zonesAtRisk, 1);
    assert.equal(concert.flow.sourceAction, 'Zakończenie koncertu');
    assert.ok(concert.flow.recommendation.includes('Krytyczne przeciążenie'));
});

test('input validation rejects invalid limits and mismatched source zones', async () => {
    const context = await getSimulationContext();
    assert.deepEqual(validateSimulationInput(input, context), {});
    for (const peopleCount of [0, -1, 100001, 1.5, NaN]) {
        assert.ok(validateSimulationInput({ ...input, peopleCount }, context).peopleCount);
    }
    for (const durationMinutes of [0, 121, 1.5, NaN]) {
        assert.ok(validateSimulationInput({ ...input, durationMinutes }, context).durationMinutes);
    }
    assert.ok(validateSimulationInput({ ...input, zoneId: 'demo-stage-a' }, context).zoneId);
    assert.ok(validateSimulationInput({ ...input, eventId: 'real-event' }, context).eventId);
    assert.ok(validateSimulationInput({ ...input, scenario: 'unknown' }, context).scenario);
    await assert.rejects(runSimulation({ ...input, peopleCount: 0 }));
});

test('aborted requests never return a result', async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(getSimulationContext({ signal: controller.signal }), { name: 'AbortError' });
    await assert.rejects(runSimulation(input, { signal: controller.signal }), { name: 'AbortError' });
});

test('entrance closure with 1 person redirects safely without false alerts', async () => {
    const context = await getSimulationContext();
    const entryId = context.zones.find(z => z.type === 'entrance').id;
    const res = await runSimulation({ eventId: context.event.id, scenario: 'entrance_closure', zoneId: entryId, peopleCount: 1, durationMinutes: 10 });

    assert.equal(res.summary.zonesAtRisk, 0);
    assert.equal(res.summary.timeToOverloadMinutes, null);
    assert.ok(res.summary.peakOccupancyPercent <= 50);
    assert.ok(res.flow.recommendation.includes('Fruin LoS A/B') || res.flow.recommendation.includes('normie'));
    assert.ok(res.zones.every(z => z.afterPercent < 90));
});

test('intermediate crowd loads scale smoothly across timeline', async () => {
    const context = await getSimulationContext();
    const stageId = context.zones.find(z => z.type === 'stage').id;
    const res = await runSimulation({ eventId: context.event.id, scenario: 'concert_end', zoneId: stageId, peopleCount: 800, durationMinutes: 20 });

    assert.equal(res.timeline.length, 6);
    assert.equal(res.timeline[0].minute, 0);
    assert.equal(res.timeline[res.timeline.length - 1].minute, 20);
    assert.ok(res.summary.peakOccupancyPercent > 45 && res.summary.peakOccupancyPercent < 80);
    assert.equal(res.summary.zonesAtRisk, 0);
    assert.equal(res.summary.timeToOverloadMinutes, null);
});
