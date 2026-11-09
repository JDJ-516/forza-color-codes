# Build 0.18.0 · visible specifications and power-based gearing

Engine RPM limit, driven tire size and diameter are always visible in Powertrain.
Metric designations (295/45R20) and flotation sizes (28x10.5R15) calculate the
outside diameter automatically. Manual diameter and live coasting measurements
remain supported. Full calculation precision survives rounded display, build
save/load and per-car profile changes. Imported captures can fill missing specs.

Competitive Development / Chase your benchmark and its frontend module are
removed. Measured drag analysis, saved builds and run comparisons remain. Legacy
browser attempt storage is preserved without displaying the removed feature.

Gearing no longer derives launch spacing from a narrow high-power band, which
could produce excessively tall first gears. Stable first-gear capture data can
retain the current overall reduction. Intermediate ratios are evaluated across
33 spacing profiles, neutral spacing and stable captured gear prefixes, using a
rolling engine-power work model with an explicit 0.15 s shift interruption
reference. Rated HP/torque supply a labeled optimistic envelope offline; measured
power data takes priority without extrapolating gaps. Rounded settings are
re-evaluated against neutral spacing. The output includes each shift speed,
post-shift RPM and a separate theoretical rev-limit ceiling.

Validation:

- 75 Node tests pass, including automatic tire conversion, malformed sizing,
  independent kinetic-energy integration, explicit shift-cost arithmetic,
  stable launch retention and slip/clutch/mixed-build rejection, power fitting,
  rounding, truncated curves, source units and all prior runtime tests.
- Fifteen Chromium suites pass. The new Gearing Fit suite replaces the removed
  benchmark UI suite and checks visible specifications, no conversion math,
  precision/persistence, invalid sizing, direct-versus-size saved builds, removed
  benchmark, offline/measured model modes, learned launch and evaluated captured
  later gears, speed-at-shift output, export and 320–1440px responsive layouts.
- Existing setup-sheet, live telemetry/car profiles, capture lifecycle, drag
  analysis, units, release/storage recovery and all color/car/navigation suites
  pass. Full app checks include Track and Drift after benchmark removal.
- Installer and portable ZIP are rebuilt with bundled Node.js; both package
  checks pass, including the new module routes and extracted-app startup.

Model ranking excludes launch grip, aerodynamic/rolling resistance and drivetrain
loss. Its rolling work costs are not displayed as drag ET predictions. Chassis
outputs remain starting references rather than a newly validated suspension
optimizer. The user's screenshot reports in-game performance estimates of
1.567 s 0–60, 3.017 s 0–100 and 258.1 mph; it contains no gear ratios or raw
telemetry and is not used as engine specifications or a measured drag capture.
No claim is made that this build beats that tune. Actual FH6 handling and native
Windows activation were not tested in this cloud. See setup-baseline.md.
