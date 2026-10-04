# Settings and demo alerts: frontend integration

## Routes and scope

- `/settings`: local organizer profile, notification preferences, threshold preferences.
- `/alerts`: existing read-only active alerts from the live API, unchanged data source.
- `/alerts/demo`: separate fictional event, active/history views, manual creation,
  checklists and resolution forms. A source selector connects the two alert views.
- Settings and demo alerts load without REST backend access. The live alerts error
  and empty-event screens offer a link to demo when the API is unavailable.
- DashboardPage and backend files are unchanged. Existing app-wide Echo initialization
  remains in place; these local pages do not subscribe to a live event.

## Settings

Storage boundary: `src/api/settings.js`.
Storage key: `eventflow.settings.v1`.

```js
{
  version: 1,
  savedAt: '2026-10-01T18:00:00Z',
  settings: {
    profile: { name: 'Jan Testowy', email: 'jan@example.com', organization: '' },
    notifications: { critical: true, warning: true, sound: false, browser: false },
    thresholds: { warning: 70, critical: 90 }
  }
}
```

`loadSettings(storage?)` returns `{ settings, savedAt, warning }` synchronously.
`saveSettings(values, storage?)` returns a Promise of the normalized saved record.
The optional storage parameter enables isolated tests. Browser code uses localStorage.
Profile name and email are required; organization is optional. Thresholds must be
integers with `1 <= warning < critical <= 100`. Save failures throw and never show
a success state. A corrupt record produces defaults and a warning without modifying
the original record until the user explicitly saves.

Unsaved fields are visibly marked; "Cofnij zmiany" restores the last saved snapshot.
Restoring default preferences affects notifications/thresholds, not profile data,
and still requires Save. There is no server profile update, login or identity check.

Notification switches currently store preferences only. They do not request browser
notification permissions, play sounds, send push messages or filter the live alert
feed. Threshold inputs only store preferences and drive the local preview; existing
live-zone and simulation thresholds remain unchanged.

For backend integration, replace load/save with the real profile/preferences service,
add asynchronous loading to SettingsPage, and retain validation and explicit save
error handling. Do not treat the local profile name as an authenticated identity.

## Demo alerts

Fixtures: `src/data/alertsDemo.js`.
Storage boundary: `src/api/alertsDemo.js`.
Storage key: `eventflow.alerts-demo.v1`.

`getDemoAlerts(storage?)` returns a Promise of:

```js
{
  event: { id: 'demo-alert-event', name: 'Festiwal demonstracyjny' },
  zones: [{ id: 'demo-zone-a', name: 'Strefa A - Scena Główna' }],
  checklist: [{ id: 'acknowledged', label: 'Potwierdzono przyjęcie zgłoszenia' }],
  alerts: [{
    id: 'demo-alert-...', event_id: 'demo-alert-event', zone_id: 'demo-zone-a',
    level: 'warning', message: 'Opis przykładowego zgłoszenia.',
    triggered_at: '2026-10-01T18:00:00Z', resolved_at: null, resolved_by: null,
    resolution_note: '', completed_steps: [], source: 'demo'
  }],
  warning: null,
  blocked: false
}
```

All mutations return the same snapshot after a successful local write:

- `createDemoAlert({ zone_id, level, message }, storage?)`: existing demo zone,
  warning/critical, 10..500 characters. IDs use a demo prefix and crypto.randomUUID.
- `updateDemoChecklist(id, stepId, checked, storage?)`: individual checklist step.
- `resolveDemoAlert(id, { resolved_by, resolution_note }, storage?)`: nonempty
  name up to 80 characters and note of 10..1000 characters; assigns resolved_at.
- `resetDemoAlerts(storage?)`: restores fixtures, only after UI confirmation.

Mutations re-read the latest record before modifying it, preserving other local
changes. Resolved alerts are read-only; duplicate resolutions and checklist edits
after closure are rejected. Storage events refresh other open tabs. Failed writes
leave the rendered state unchanged. Malformed/unreadable records block mutations
and offer explicit reset; no silent overwrite occurs during loading.

Checklist completion is recorded, not mandatory for closure. These example tasks
are UI fixtures, not validated emergency procedures. The resolution form prefills
the locally saved name if available, otherwise it remains blank.

The UI uses resolved_at to split active/history, sorts history by resolution time,
supports search by description/zone/resolution note and filters by severity/zone.
Successful creation clears filters and shows active results; closure switches to
history. Native modal dialogs provide focus containment, Escape/cancel and focus
restoration. Pending actions disable conflicting controls.

## Future API connection

Replace adapter operations with actual endpoints and normalize responses to the
documented snapshot shape. Map event/zone IDs from API data, never submit fixture IDs.
Resolve `resolved_by` from authenticated server identity rather than trusting a
local name. Retain separate live/demo modes until the backend supports history,
manual creation, checklists and resolution. The current backend does not implement
these operations. No POST/PUT/DELETE request is currently sent by either new page.
Never merge demo alerts into `useEventStore` or use `/zones/update` for demo actions.

## Local storage limits and checks

Persistence is per browser profile AND origin (scheme, host and port). For example,
localhost:5173 and 127.0.0.1:5174 do not share these settings. No server sync is implied.
Resetting demo alerts does not modify settings or live event data.

Run `npm test`, `npm run lint`, `npm run build`. Local-workspace tests cover profile
validation, threshold boundaries, corrupt/quota-blocked storage, demo lifecycle,
stale record updates and isolation between the two storage keys.

Browser verification passed at 1440, 768, 390 and 320 px: settings save/reload,
validation, defaults/discard, notification toggles, demo creation, modal focus/Escape,
checklist persistence, resolution/history, filters, storage failures, corrupt-record
recovery, confirmed reset and live/demo separation. No REST request was issued from
settings or demo routes. These checks used a separate browser profile.
