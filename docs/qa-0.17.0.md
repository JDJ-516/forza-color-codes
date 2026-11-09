# Build 0.17.0 · FH6 tuning worksheet

Powertrain now contains the speed goal, installed gear count, tire package and
On/Off launch control. Removed manual shift/torque-peak targets, peak-power and
first/top reference inputs, advanced traction assumptions, launch/gearing input
section and chassis reference section. Captured RPM values are read-only. Basic
inputs remain horizontal with all generated settings below them.

The setup sheet follows the nine pictured FH6 tuning tabs and uses US units.
Gearing is rounded to hundredths. Supported power crossovers inform shift
references; missing coverage uses a labeled engine-limit reference. Engine limit
can prefill from live data, and low-slip coasting supplies an effective rolling
tire diameter after five distinct samples. Two collapsed offline specification
fallbacks retain manual use without restoring the removed shift-RPM box.

Photo references correct the damping scale to 1–20, add AWD center rear balance,
and retain neutral brakes. Trackhawk spring/height observations stay axle-specific;
unknown opposite endpoints and other cars' numeric ranges are not invented. The
former simulator/search interface is replaced with measured run comparisons.
Driven-wheel slip and off-curb suspension feedback suggest a next experiment.

Validation:

- 71 Node tests cover new gearing geometry/rounding across 2–10 gears, measured
  peak support, missing-input rejection, photographed scales, partial Trackhawk
  limits, effective tire measurement, driven-wheel feedback and existing tests
  for live UDP, packet decoding, capture lifecycle, storage and units.
- All 15 Chromium suites pass. Updated checks cover the removed fields/text,
  Powertrain placement, On/Off labels, nine tab order, keyboard navigation,
  gearing values and export units, stale-result invalidation, offline partial
  generation, manual overrides, car/build isolation, old SI build loading,
  automatic coasting diameter and rejection of another active car's capture.
- Immediate and five-second countdown captures, read-only engine evidence,
  zero-speed completion, independent general telemetry, live/imported analysis,
  measured comparisons and saved-build history remain covered.
- Existing color library, Color Lab, Rare Cars, weekly carousel, navigation,
  dashboard and telemetry suites pass. Layout checks cover 320–1440px widths
  and desktop Dashboard sizes through 1920×1080.
- Both self-contained Windows distributions are rebuilt with the pinned Node
  runtime. Installer checks verify payload consistency, SHA-256, bundled assets
  including the new module and extracted-app startup/HTTP routes.

Synthetic driving fixtures verify the software; actual FH6 handling and native
Windows activation were not tested in this cloud. These are documented starting
settings, not validated leaderboard tunes. Ride height/aero remain relative where
numeric installed limits are unknown. See [methods](setup-baseline.md).
