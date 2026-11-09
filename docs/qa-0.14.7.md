# Build 0.14.7 — current-car tuning setup

Changed the telemetry connection guide to a closed-by-default details control
with six vertical steps. Added an offline setup document and disconnected link
in Tune Calculator. Removed generic ⅛/¼/½/1-mile menu presets; the three named
FH6 venues and Custom strip remain. Custom distances and older saved builds still
load through the custom option; standard split mathematics remain available.

The receiver resolves active car IDs to year/make/model with a licensed,
source-pinned 551-entry FH6 catalogue. Unknown IDs remain unnamed. The calculator
prefills reported drivetrain, car labels, class/PI and RPM starting values, plus
eligible observed engine power/torque maxima. Manual edits take priority. Vehicle
worksheets are isolated across car/build switches, restored in session memory,
and stale measured curves/captures are cleared on detected build changes.

Validation:
- 51 Node tests: identity precedence/unknown IDs, observed-value eligibility,
  build-change resets and real UDP identity/measurement propagation, in addition
  to the existing decoder, catalogue, calculators and HTTP/UDP tests.
- Tuning browser suite: collapsed vertical setup, guide link, three FH6 strips,
  car year/make/model, supported prefills, missing manual specifications, manual
  overrides, car switching/profile restoration, stale/unknown car behavior and
  responsive layouts at 320/390/768/1440 pixels.
- Drag browser suite: strip/custom distances, LC, model search, saved builds,
  imported/live capture analysis, measured curves, reset/export and mobile view.
- Release browser suite: version identity and responsive workspaces/calculators.
- Seasonal browser suite: initial empty inputs and explicit saved-strip loading.
- Telemetry browser suite: current states, field view, invalid/stale handling and
  synthetic UDP recovery with the replacement setup instructions.
- Deterministic bundled-Node Windows ZIP/installer integrity and extracted app
  launch, served assets, car metadata, guide and stop lifecycle.

All automated driving data is synthetic. No real FH6 driving session or native
Windows shortcut activation was available in this Linux environment. The catalogue
is source-provided coverage, not a complete guaranteed game roster; see
car-identities.md for provenance, unknown-ID behavior and input limitations.
