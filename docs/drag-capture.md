# Drag capture and worksheet

The Drag accordion begins with **Use a real run**. **Start now** records at any
speed and arms before driving telemetry arrives when the receiver is enabled.
No strip is required to collect data; choose it for subsequent ET analysis.
**Start with countdown** remains an optional five-second amber countdown / green
GO. Moving during it no longer cancels recording. When the car stays still,
the final countdown second provides a real stationary lead-in. The countdown is
not included in ET. A moving-start capture supplies engine evidence, not an
invented standing-start result. See us-units-gearing.md for the updated controls.

Once the car has moved at ≥1 km/h, capture stops when reported speed returns to
≤0.1 km/h for at least 250 ms. This near-zero threshold and debounce avoid float
noise and a single transient packet. **Braking does not stop capture.** Brake
application and deceleration remain in the recorded run. **Stop capture** can
also stop a run or cancel the countdown manually. Zero speed before launch does
not terminate a staged run. Signal loss (3 seconds), game inactivity, car/build
change and the 18,000-sample limit also end the dedicated run safely.

The drag buffer freezes on stop and remains available for analysis/export until
a new drag capture starts or the server exits. At most 18,000 samples are stored
with a minimum 15 ms interval. A stopped usable capture is analyzed automatically
for the selected distance; partial/invalid standing starts are reported honestly.
General telemetry and the existing general capture continue independently, so
these stop rules do not stop Track/Drift data. General reset does not erase the
drag buffer. A car/build switch stops instead of mixing drag builds.

## Worksheet order

1. Use a real run: countdown / Stop / Analyze / Export, optional JSON import and
   user-supplied launch-control label.
2. Build Name / Car / Strip; preset distance is automatic and Custom reveals
   distance entry. FH6 and saved custom strips are grouped with shortened labels.
3. Powertrain details: drivetrain, HP, ft-lb, lb, front weight percentage, PWR,
   displacement, top-speed goal, installed gear count, tire package and On/Off LC.
   Gearing data has a collapsed engine-limit/overall-tire-diameter fallback.
4. Captured engine data: read-only observed maximum power/torque, torque-peak
   RPM and median observed upshift RPM. The explicit copy button can transfer
   captured power/torque into the build specifications.
5. Suggested tune: nine FH6 categories below the horizontal input fields.
6. Measured run analysis, repeated-run comparison and saved build history.

PWR is HP/lb; saved power/torque/mass fields retain canonical SI values. The
engine outputs require five eligible samples per provided channel. Eligibility
requires full throttle, low braking/slip/steering, gear ≥2 and speed ≥40 km/h.
Torque-peak RPM belongs to the largest eligible reported torque. Observed shift
RPM is the median of adjacent upshifts with sample gaps ≤250 ms, and does not
claim an optimal shift. Missing channels remain unavailable. New captures clear
prior measurements while keeping manual build specifications. Imported sessions
remain separate from the live recorder. No data is uploaded.

The setup worksheet's generated shift references, screenshot limits, offline
requirements and telemetry feedback are documented in setup-baseline.md.

## API

- GET `/api/telemetry` includes `dragCapture` status, countdown remaining time,
  state/reason, frame count, build key, and observed engine/shift summaries.
- POST `/api/telemetry/drag/start` starts immediate capture, or an optional countdown via ?countdown=1.
- POST `/api/telemetry/drag/stop` stops only the dedicated drag recorder.
- GET `/api/telemetry/drag/session` exports the retained dedicated session with
  the existing `forza-garage-telemetry/v1` schema and capture metadata.

Mutation endpoints require the existing X-Forza-Garage header and same-origin
check. No usable samples returns 409. Wrong-size or rejected packets never enter
capture. Sample timestamps remain receiver UTC ms; game timestamps are separate.
The existing ET definition (interpolated 1 km/h crossing after a stationary phase)
and game/event timing limitations in telemetry.md remain unchanged.

## Capture controls and setup sheet

Start now, Start with countdown (five seconds), Stop, Analyze and Export remain
visible. Supporting run details/import/LC labels are inside the closed-by-default
Use a real run disclosure. The colored countdown/status appears when active.
Measured-run analysis is also collapsed initially and opens when a session loads.
User data is laid out in horizontal rows; results are below it. Generate tuning
setup produces the documented configuration sheet described in setup-baseline.md.
