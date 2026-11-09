# US displays and top-speed gearing goals

The interface uses mechanical horsepower (1 HP = 745.699871582 W), ft-lb torque,
lb weight, mph, ft/in, ft², cu in and °F. Track/Drift tire section width is entered in inches; Drag uses overall driven tire diameter in inches;
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

Enter **Top-speed goal (mph)** in Powertrain with the installed gear count and
tire package. Engine RPM limit, tire size and overall diameter are always visible in Powertrain.
Enter your tire size and the app calculates diameter; live data or low-slip
coasting measurements can supply the specifications too. Shift RPM, power-peak
RPM, individual ratios and final drive no longer need manual input in Drag.

Select **Generate tuning setup**, then **Gearing** in the bottom FH6 tab strip.
The generator solves overall gearing at a supported measured power peak, or a
clearly labeled engine-limit reference when the peak is unknown. Individual shift
references use supported power crossovers without extrapolating missing bins.
Ratios are rounded to hundredths and the achieved geometric mph is recomputed
after rounding. Full formulas, design constraints, screenshot evidence and
limitations are in [setup-baseline.md](setup-baseline.md).

Changed inputs, evidence or loaded builds invalidate results. Actual drag times
come from measured stationary launches, rather than an uncalibrated ET model.
A gearing speed ceiling does not prove the car has enough power or distance to
reach it. Save/export retains canonical SI specifications and US output labels.
