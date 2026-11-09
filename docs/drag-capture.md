# Drag capture and worksheet

The Drag accordion begins with **Use a real run**. **Start now** records at any
speed and arms before driving telemetry arrives when the receiver is enabled.
No strip is required to collect data; choose it for subsequent ET analysis.
**Start with countdown** remains an optional three-second amber countdown / green
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
3. Powertrain details: drivetrain (automatic while connected; manual fallback),
   manual power (HP), torque (ft-lb), weight (lb), front weight distribution (%),
   calculated power-to-weight (HP/lb), and optional displacement (cu in).
4. Captured engine data: observed maximum power and torque, RPM at observed
   torque maximum, and observed median upshift RPM. The RPM targets are editable
   for manual tuning. Use captured power/torque in the model only via the explicit
   copy button; existing manual model specifications remain untouched otherwise.
5. Advanced required engine/traction assumptions, launch/gearing, predictions,
   search and separate measured-run analysis/history.

Displacement is saved as build context; it does not alter the simplified physics
model. Displayed PWR is HP / lb. Saved physics units remain unchanged. The engine outputs require at least
five eligible samples per provided channel (power and torque are independent).
Eligibility requires full throttle, low braking/slip/steering, gear ≥2 and speed
≥40 km/h, as documented in car-identities.md. Torque-peak RPM is tied to the
largest eligible reported torque. Shift RPM is the median of actual eligible
adjacent upshift observations with receiver sample gaps ≤250 ms; it is not an
optimized shift recommendation. If a channel is absent, it stays unavailable.
Measured peaks can be below rated peaks when a pull does not cover the full band.

Manual edits and explicitly loaded builds take priority over automatic RPM targets.
New captures clear prior automatic measurements while keeping manual inputs.
Imported sessions remain separate from the live recorder. No data is uploaded.

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
