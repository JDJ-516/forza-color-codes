# Build 0.15.0 — capture-first Drag workflow

Drag now opens with a dedicated real-run capture panel: 3–2–1 / green GO, Stop,
recording/stopped/error states, frozen run export/import and automatic stopped-run
analysis. After launch, returning to near-zero speed for 250 ms stops the drag
buffer. Braking keeps recording, including staging. General telemetry continues.
Early launch, signal loss, inactive gameplay, changed car/build and sample limits
terminate safely. This supersedes the earlier proposed brake-to-stop behavior.

The worksheet separates Build Name / Car / Strip, manual powertrain values,
measured engine outputs/RPM, advanced assumptions and launch/gearing. Drivetrain
still prefills from telemetry. Front weight distribution, displacement in liters
and derived kW/tonne follow the user's clarification. Manual power/torque stay
separate from captured maxima; copying them into the model is explicit. Missing
channels stay blank, and saved builds/manual overrides retain priority.
Map strip labels/groups and source-info clutter have been cleaned up.

Validation:
- 58 Node tests: countdown/lead-in, staging brakes, braking persistence,
  zero-speed freeze, manual stop/restart, early launch/build/signal-loss guards,
  independent power/torque channels, actual shift observations, authenticated
  real UDP/API flow and continued general telemetry after drag stops.
- New Drag Capture browser suite: capture-first order, 3–2–1 / GO colors,
  separate manual/measured values, PWR, explicit copy, manual RPM overrides,
  zero-speed completion/auto-analysis, manual Stop, imported-run persistence and
  mobile layout (320/390/768/1440 pixels).
- Drag browser suite: predictions, LC, custom/map distances, saved builds,
  model search, curve evidence, import/export and manual/live analysis.
- Tuning Telemetry and Seasonal browser suites: current-car recognition,
  isolated manual profiles and saved builds, blank inputs and strip loading.
- Release browser suite: release version, all workspaces and responsive layout.
- Deterministic Windows installer/ZIP integrity and extracted app lifecycle,
  including all newly served capture modules.

All driving packets and runs used here are synthetic. Actual FH6 driving and
native Windows shortcut activation remain untested in this Linux environment.
See drag-capture.md, telemetry.md and prior QA notes for data/model limits.
