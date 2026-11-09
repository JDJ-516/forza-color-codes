# US displays and top-speed gearing goals

The interface uses mechanical horsepower (1 HP = 745.699871582 W), ft-lb torque,
lb weight, mph, ft/in, ft², cu in and °F. Tire section width is entered in inches;
rim diameter remains inches and aspect remains percent. Track springs/wheel rates
are lb/in and damping is lbf·s/in. Telemetry temperatures, velocity/acceleration,
position, angular values and power/torque are converted for display as well.
Percentages, ratios, RPM and time keep their usual units. Undocumented raw game
fields are not assigned guessed units. Protocol checks/JSON retain their declared
canonical units for diagnosis and interoperability.

`public/units.js` converts inputs to canonical physics units and saved values back
to US displays. Fields retain their existing storage names (`powerKw`, `torqueNm`,
`mass`, `distanceM`, etc.) and SI values in saved builds and exports. This avoids
silently reinterpreting older builds. The displayed units, labels, bounds and
results are converted together. Readable rounded saved values retain an internal
original-value association until actually edited. Manual US edits remove that
association. Per-car worksheet caches preserve the canonical values as well.
PWR is now displayed HP / lb; engine displacement is displayed cu in but remains
liters in existing build metadata. Displacement still does not change the model.

## Capture whenever needed

**Start now** records immediately while parked or moving. It can arm with the
receiver enabled before valid game data arrives, and binds to the first valid
active car/build. No strip/distance is required to collect engine evidence.
**Start with countdown** is optional; moving during it no longer cancels capture.
The final countdown second remains available as a stationary lead-in when the
car actually stays still. A complete stop after movement still ends drag capture;
manual Stop remains available. General telemetry keeps running independently.

A moving-start capture cannot create a standing-start drag time without a real
captured stationary phase and launch. Engine data/eligible power bins remain
available; the analysis reports the missing standing start rather than guessing.
No data arrives: an armed recorder waits, without inventing samples. Signal-loss
termination applies after an active frame has established the recorder's car.
POST `/api/telemetry/drag/start` now defaults to immediate capture; add
`?countdown=1` for the optional countdown. Existing auth/origin checks remain.

## Top-speed goal

Enter **Top-speed goal (mph)** and optionally **Power-peak RPM**. Suggest gearing
uses the highest observed eligible power-curve bin at/below shift RPM when at
least four bins are available. Otherwise it uses entered power-peak RPM, or the
entered shift RPM with an explicit unknown-power-peak label. It never claims an
unmeasured power peak or extrapolates one from missing RPM coverage.

The suggestion:
1. Solves the top-gear overall ratio for the requested mph at the chosen RPM,
   using the entered tire circumference and existing top-gear ratio.
2. Chooses a final drive while preserving the original first-gear overall ratio.
3. Spaces the intermediate gears geometrically and reports actual post-upshift
   RPM against the entered torque-peak RPM.
4. Validates gear/final-drive bounds and descending ratios, rounds to three
   decimals, and reports the achieved theoretical mph after rounding.

The user reviews the ratios, then explicitly applies them. Changed inputs/car,
new evidence or a loaded build invalidates old suggestions. Power peak above
shift RPM, impossible goals and out-of-range ratios are rejected. If shift RPM
drops below torque peak, the result says so. This is a baseline to test, not a
global optimum, and it does not prescribe differential/suspension settings.

When a goal is present, model search filters out candidates whose RPM-limited
gearing ceiling at shift RPM is below that mph goal. It still ranks qualifying
candidates by simulated strip ET. Satisfying this geometric ceiling does not prove
enough engine power, tire grip, aero or strip distance to reach that speed.
The current 1D model and comparative real-run limitations still apply.
