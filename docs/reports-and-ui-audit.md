# Reports and frontend UI review

## Reports

Route: `/reports`, optional `?event=<demo-event-id>`. Available from the shared
navigation to all preview roles. Uses the existing event workspace, not live API
data and not the independent simulation/alerts fixtures. No backend changes.

`api/reports.js` is the replaceable data adapter:

- `getEventReport(eventId, {from, to}, {signal, storage}?)` reads a consistent local
  workspace snapshot and returns `{source, generated_at, event, range, summary,
  zones, measurements, timeline}`.
- `buildEventReport(event, histories, range)` is the pure aggregation function.
- `reportToCsv(report, 'summary'|'measurements')` returns UTF-8 BOM CSV with
  semicolon separators, escaped quotes and formula-injection neutralization.

Dates are local calendar days. Both selected dates are included, by using an
exclusive start of the following day for the upper bound. Draft dates do not
silently relabel an older report: export remains disabled until applied. Pending
or failed requests hide old results; aborted/stale responses cannot replace the
current report. Storage errors support retry without destroying stored data.

Definitions:

- Sample count: number of zone observations in the range.
- Zone peak/mean: maximum and arithmetic mean of observed person counts, not a
  time-weighted average. Percentages use the current configured capacity.
- Critical samples: observations at/above the zone's current threshold. This is
  NOT a count of alerts or incidents.
- Timeline: sum of zone observations with exactly the same timestamp. It is NOT
  unique attendance and does not interpolate missing observations.
- Missing samples are null/no-data, never zero people. Incomplete zone coverage
  is explicitly flagged. No synthetic history is generated for new zones.

CSV files contain source, event, date range and the selected summary/raw sample
columns. Print/PDF opens the browser print dialog; choosing Save as PDF remains
the user's action. Print layout hides navigation/forms, uses a light background,
and includes a fixed-size chart, table, dates and demo provenance. No server PDF,
download history or report persistence is simulated.

## UI audit against EventFlow.pdf

Reviewed reference pages 2-5 and the functional requirements on pages 10-14.
The PDF has no exact report/login/event-editor mockups; these views extend its
design system rather than claiming pixel-identical reproduction.

| Surface | Review / changes |
| --- | --- |
| Dashboard | User authorized edits in this turn. Retained dark card layout and semantic colors; removed duplicate hardcoded organizer/event block; actual API event heading, locally configured profile link; working zone/alert navigation; responsive stat/cards; critical alerts prioritized; numeric-string totals fixed; no hardcoded gate instructions. |
| Zones / map | Cards, semantic status, legend and area plan retained. Card action links now have separate rows and comfortable click targets. Geographic API map and demo schematic remain distinct. |
| Alerts | Existing filters/details retained. API loading, failure and empty states now retain app navigation and offer retry/demo access. Local action forms remain demo-only. |
| Simulation | Existing scenario/form/result layout retained; reviewed initial/result states. No invented forecast or backend writes. |
| Settings | Existing profile/preferences form retained; dark native date/input controls made legible consistently across local forms. |
| Events / account | Existing forms, detail screens and role preview retained. Shared navigation exposes Reports, Events and Account. |
| Reports | Same dark surface/blue actions, restrained table, zone history, demo badges, date errors, empty state, CSV and print layout. |
| Shared | Page headings 32px desktop / 26px narrow, section headings 20px; zero brand letter spacing; demo/API navigation context preserved when visiting settings/account; render-error boundary leaves navigation accessible. |

The application retains its established navy palette (for example background
`#0F172A`) rather than recoloring everything to the PDF's literal `#1A202C`.
Green/yellow/red occupancy meanings match the PDF legend; inconsistent labels on
the PDF's sample cards are not copied. Desktop sidebar remains the existing app
pattern, not an exact reconstruction of the PDF footer navigation. No native
mobile application work is included; narrow browser layouts are tested.

Dashboard now reuses the existing monitoring hook for actual five-second polling
and displays a retryable stale-data notice when refreshing fails.

## Verification and remaining integration

`npm run lint`, `npm test`, `npm run build`.
Browser checks cover 14 routes at 1440/768/390/320px, CSV contents, print layout,
date validation, empty reports, API failure/empty/retry, export failure, partial
history, Dashboard links, and retained demo navigation through Settings.
Browser UI uses isolated storage and mocked REST reads, never backend writes.

Live report history, historical capacity/threshold versions, authentication,
event ownership, notification delivery and server-generated reports still require
backend integration. Demo auth is not access control. The live Dashboard still
uses the existing API's first event; switching local demo events does not alter it.
