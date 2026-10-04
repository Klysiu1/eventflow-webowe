# Events, zones and account frontend

## Scope and design

Frontend only. No backend migrations, endpoints, security configuration or mobile
application changes. DashboardPage is untouched. The shared shell now exposes
Events and Account, including when the API is unavailable.

EventFlow.pdf pages 3 and 5 supply zone cards, semantic occupancy colours,
dark surfaces, 32px page titles, 20px section titles and compact controls.
New views follow these patterns and the existing application palette. The PDF
does not supply detailed event editor, authentication or venue-plan mockups.
The venue layout is an explicitly labelled schematic, not a measured venue map
or an evacuation plan. No claim of pixel-identical reconstruction is made.
The PDF's sample card labels conflict with its own legend; statuses follow the
legend, not the inconsistent sample labels.

## Routes

- `/events`: searchable local event list with status filter and event switching.
- `/events/new`, `/events/:eventId/edit`: validated local event forms.
- `/map/demo`: selected event's areas, zone cards, filters and add-zone form.
- `/map/demo/:eventId/:zoneId`: zone detail, edit dialog, occupancy history and plan.
- `/map/:zoneId`: existing API zone details (read-only, no invented history).
- `/login`, `/register`: demonstration forms, validation and role selection.
- `/account`: demo identity, logout, role overview (administrator only).

## Data boundaries

`api/eventWorkspace.js` is the adapter for all demo event and zone persistence.
Its async methods return the complete next workspace, except history retrieval:

- `getEventWorkspace()` -> `{version, selectedEventId, events}`
- `selectDemoEvent(id)` -> saved workspace
- `saveDemoEvent(id|null, values)` -> saved workspace; selects the saved event
- `saveDemoZone(eventId, id|null, values)` -> saved workspace
- `getDemoZoneHistory(eventId, zoneId)` -> `{source:'demo', samples:[{logged_at,count}]}`

LocalStorage key: `eventflow.events-demo.v1`. All IDs start with `demo-`.
Persistence failures surface as errors, not successful saves. Invalid stored
documents are rejected without overwriting them. Mutations reread storage to
preserve other records edited in another tab; simultaneous edits to the same
record remain last-write-wins. Cross-tab storage events refresh displayed data.
Fixtures live in `data/eventWorkspace.js`, separate from components.

Event: `{id,name,venue,start_at,end_at,max_capacity,status,zones}`.
Event dates are local wall-clock strings from datetime-local inputs. A future
API adapter must explicitly convert these using the event's timezone.
Status is `planned|active|ended` and is explicit, not derived from today's date.

Zone: `{id,name,capacity,current_count,alert_threshold,area}`.
`area:{x,y,width,height}` uses a 100x100 local plan, origin at top left. All four
values are integers. Rectangles must be within the plan and cannot overlap.
This is deliberately NOT the geographic `coordinates` field used by the live
Leaflet/OSM view. Map this to the backend's future venue geometry contract.
The current editor supports rectangles, not drawing arbitrary polygons.
`alert_threshold` here is an integer percentage, default 90, range 71..100.
The PDF suggests storing it as a 0..1 fraction: convert in the future adapter.
Warning starts at 70%. These demo thresholds do not change live alerts or the
separate local Settings preferences. Editing capacity preserves sensor counts.

Recharts displays fixed sample history from 1 October 2026. Filters use the last
sample as the end of the 30/60 minute window, not the wall clock. New events/zones
have no samples and zero occupancy; planned expo zones have no synthetic history.
Percentages are recalculated using the currently configured demo capacity.

Event switching changes the demo map, cards and detail context only. Live
Dashboard/API monitoring remains unchanged and still uses its existing event.
The earlier Simulation and Alerts demos retain their own labelled sample data.
They are not falsely presented as receiving the selected event's sensor data.

## Account and roles

`api/demoAuth.js` provides validation and `startDemoSession`, `getDemoSession`,
`endDemoSession`. SessionStorage key: `eventflow.session-demo.v1`.
Only name, email, role and `source:'demo'` are stored. Passwords, hashes and tokens
are never stored or sent. Registration creates a session preview, not a durable
account. Login accepts any syntactically valid test credentials, clearly stated
on both screens. Role selection is solely a demonstration control.

- No session / viewer: read event and zone screens; no edit controls or editors.
- Organizer: create/edit local events and zones, mutate earlier demo alerts.
- Administrator: organizer views plus the role-capability table in Account.
- Logout clears the current tab's session, not the shared demo event data.

Existing personal settings and simulations stay available. Dashboard and live
API routes are NOT protected by this frontend role preview. Real authentication,
tenant ownership, role enforcement, JWT handling, registration, password reset
and server authorization are all backend integration work still outstanding.
Never use these local role checks as a security boundary.

## Verification

- `npm run lint`
- `npm test` (includes `src/api/eventWorkspace.test.js`)
- `npm run build`

Browser checks cover registration/login/logout, viewer editor rejection, admin
view, event create/switch, zone validation/create/edit, reload persistence,
history windows, blank-history states, map rendering, and widths 320/390/768/1440.
Demo REST traffic is checked to remain empty. The existing Leaflet geographic map
and Dashboard are preserved; the new local plan requires no map-tile service.
