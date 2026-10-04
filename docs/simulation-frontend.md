# Simulation frontend: integration contract

## Current scope

Route: `/simulation`. UI: `src/pages/SimulationPage.jsx` and `simulation.css`.
All demo data lives in `src/data/simulationDemo.js`. The only data boundary is
`src/api/simulation.js`, exposing two async functions. The page does not import
fixtures, Axios, Echo or the live event store. It never calls `/zones/update`.
The existing `SimulationPanel.jsx` is unrelated and is not mounted here.

This is a frontend preview, not a simulation engine. Each scenario returns its
own fixed fixture. Counts, selected zone and duration are captured in the
request/result parameters but do not influence the fixture. The UI explicitly
labels this limitation. Changing an input clears previous results.

App routes for live pages still load real events. The simulation route bypasses
that loading/error gate and works without a REST backend. Existing app-wide Echo
initialization is unchanged; this page creates no event subscriptions.
DashboardPage and the backend were not edited.

## Context

`getSimulationContext({ signal })` returns a Promise of:

```js
{
  mode: 'demo', // use 'live' when backed by a real simulation service
  event: { id: 'demo-festival', name: 'Festiwal demonstracyjny' },
  zones: [
    { id: 'demo-entry-c', name: 'Wejście Główne', type: 'entrance', capacity: 5000, currentCount: 4800 }
  ]
}
```

Supported source zone types: `entrance` for `entrance_closure`, `stage` for
`concert_end`. Other zone types may appear in the results. IDs are opaque strings.

## Run

`runSimulation(input, { signal })` returns a Promise. Input shape:

```js
{
  eventId: 'demo-festival',
  scenario: 'entrance_closure', // or 'concert_end'
  zoneId: 'demo-entry-c',
  peopleCount: 4800,
  durationMinutes: 10
}
```

UI validation: integer peopleCount 1..100000, integer durationMinutes 1..120,
existing event and matching source zone type. These are frontend preview limits;
align them with real backend rules later. Validation must also happen server-side.

Response shape:

```js
{
  mode: 'demo',
  parameters: { /* snapshot of the exact input */ },
  summary: {
    peakOccupancyPercent: 110,
    timeToOverloadMinutes: 6, // null when the 90% threshold is not reached
    zonesAtRisk: 2
  },
  timeline: [ { minute: 0, occupancyPercent: 45 } ],
  zones: [
    { zoneId: 'demo-entry-b', name: 'Wejście B', beforePercent: 40, afterPercent: 94 }
  ]
}
```

Percent values use 0..100 units, not 0..1 fractions; values above 100 are allowed.
Timeline is sorted by minute, with unique, nonnegative minute values. It shows
maximum occupancy across affected zones at each point. Zone results show peak
projected occupancy against initial occupancy; the difference is percentage points.
Risk summary counts affected zones reaching at least 90%.
Empty timeline/zones arrays and a null threshold time have explicit UI states.

The optional `flow` field adds the PDF's three-step flow diagram and recommended
actions without changing the existing form, chart or table:

```js
flow: {
  sourceZoneId: 'demo-entry-c',
  sourceAction: 'Zamknięcie wejścia',
  destinationZoneIds: ['demo-entry-b', 'demo-parking'],
  recommendation: 'Example action text supplied by the scenario.'
}
```

`SimulationFlow.jsx` resolves names from the existing context and displays the
highest resulting zone occupancy from `zones`, with its change in percentage
points. The risk metric also lists the affected zones reaching 90%. Both demo
scenarios provide a fixed flow example; selecting a different source zone shows
an explicit notice that the diagram still represents the fixture's source.
Changing inputs or resetting clears the entire result, including the diagram.
The diagram uses a horizontal layout on desktop and a compact three-column
sequence on phones, matching the mobile PDF. Intermediate tablet widths use a
vertical sequence. Recommendations are labelled examples, not live instructions.
An API response without `flow` retains the existing results without a diagram.

## Mobile presentation

`components/mobile.css` scopes the PDF mobile palette, typography, header,
four-tab bottom navigation and compact cards to widths up to 767 px. Additional
pages (including Settings) remain available from the header menu. Desktop keeps
its sidebar, palette, forms and expanded results.

On phones, simulation parameters and the chart/table can be expanded with
labelled buttons. Invalid submission reveals the fields; reset collapses the
panels. The chart mounts only when visible, including after a viewport change,
so collapsed results do not produce zero-size chart warnings. Short zone labels
are presentation-only; IDs and the simulation values remain unchanged.

The shared MobileControls component keeps monitoring filters and actions
available on mobile while preserving their expanded desktop layout. Demo map
and list switching, zone detail links and alert history retain existing routes.

## Connecting a backend later

1. Replace fixture reads in the two functions in `src/api/simulation.js` with
   requests using the existing Axios client. Pass the AbortSignal to requests.
2. Map the real API response to the shapes above, including numeric conversions.
   The PDF proposes POST `/simulation/run` and GET `/simulation/:id/results`, but
   these are not implemented server routes today. Do not assume they already exist.
3. For asynchronous jobs, poll inside the adapter until completion, respecting
   cancellation, and return the final response. Do not add polling to the view.
4. Return `mode: 'live'` only for actual backend results. Update the simulation
   sidebar context in MainLayout when introducing real event selection.
5. Never write simulation results into the live zone-count endpoint or event store.

The page has pending, success, request-error, validation and reset states.
Controls are disabled during a run; reset aborts it. Stale responses after reset
or navigation are ignored even if the data provider resolves after cancellation.

## Checks

`npm run lint`, `npm run build`, `npm test` (includes adapter tests).
Browser scenarios: both scenario choices, zone/number inputs, invalid inputs,
results/chart/table, edit invalidating a result, reset, offline REST backend,
request failure/retry, cancellation and return to existing pages.

Verified with Playwright at 1440, 768, 390 and 320 px. Both fixtures render the
chart and zone table. Validation, input changes, reset, rejected requests,
retry, cancellation and stale-response protection passed. The demo route sends
no REST requests to the backend. Dashboard and Strefy navigation passed as well.
