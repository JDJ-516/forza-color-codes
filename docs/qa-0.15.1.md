# Build 0.15.1 — US displays, unrestricted capture and speed goals

Removed the region/wristband/distance strip line and preset/level-ground notes.
Converted tuning/telemetry UI labels and values together to US customary units.
Manual/captured engine power is HP, torque ft-lb, weight lb, PWR HP/lb, dimensions
ft/in, displacement cu in, speed mph and temperature °F. Existing saved builds,
exports and physics retain canonical values; rounded displays preserve their
original exact calculation values until edited. Tire widths are entered in inches.

Capture can start immediately at any speed or be armed before telemetry arrives,
without requiring a strip. Countdown is optional and does not reject moving
starts. Zero-speed completion after launch and independent general telemetry
remain. Missing stationary launches never create fabricated standing-start ET.

Added mph top-speed goal, optional power-peak RPM, power-band-aware gearing
suggestions, post-shift torque-band checks, explicit apply, and a geometric
speed-floor constraint in model search. Results state their theoretical limits.

Validation:
- 62 Node tests: unit round trips and saved precision, unrestricted/armed and
  moving capture, no fabricated standing-start time, power-band goal gearing,
  launch-ratio preservation, bounds and speed-constrained model search, plus
  existing decoder, API/UDP and data/model regression coverage.
- New US/Goal browser suite: moving capture without a strip, removed notes,
  converted manual/captured values, saved SI values with unchanged predicted ET,
  applied mph gearing suggestions, US telemetry and responsive layouts.
- Existing Drag Capture, Drag, Garage/Track, Workspace/Drift, Competitive,
  Tuning Telemetry, Release and Telemetry Status browser suites cover converted
  values, preserved manual profiles, optional countdown, saved builds/curves,
  benchmark contexts and mobile/desktop layout.
- Deterministic bundled-Node Windows ZIP/installer and extracted app lifecycle.

Synthetic driving data only. Actual FH6 gameplay and native Windows shortcut
activation remain unverified here. A gearing ceiling is not an attainable-speed
or leaderboard guarantee. See us-units-gearing.md and previous QA/model limits.
