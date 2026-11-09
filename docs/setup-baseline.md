# Settings to enter in-game

Open Tune Calculator → Drag. Enter your car data in the horizontal fields, then
select **Generate tuning setup** in the bottom settings section. It can generate
useful sections without requiring every advanced ET-model input.

- Gearing needs tire dimensions, a speed goal, RPM/torque-peak RPM and the installed
  gearbox count (4–10). Existing ratios supply a known count; otherwise select it.
  A full ratio set can now be generated without typing existing gear ratios.
- Springs/chassis need weight, front weight percentage and drivetrain. Telemetry
  supplies car identity/drivetrain; it does not supply upgraded mass/distribution.
- Blank reference fields are visibly populated when Generate is selected:
  2.7 Hz front/rear ride-frequency targets, 0–20 damper reference scale and a Drag
  tire reference. Change the compound to match the installed tires. First/top
  gearing references come from existing ratios when available, otherwise 3.0/0.9.
  No gearbox count is guessed from the highest observed gear.

The bottom sheet shows every gear ratio/final drive, front/rear spring rates,
rebound/bump, tire PSI, camber/toe/caster, anti-roll bars, driven-axle differential
lock percentages and neutral brake references. Apply gearing changes only the
worksheet. Enter the displayed settings in the matching game menus yourself.
Export creates `forza-starting-setup.json` with inputs, units, output and assumptions.
Changed inputs/evidence invalidate the sheet; changing cars clears chassis results.

## Provenance and status

Reference constants/formulas were adapted from
[ClickClickMedia/Forza-6-telemetry, app/tune_calc.py](https://github.com/ClickClickMedia/Forza-6-telemetry/blob/523e8ba188d0f7c0a5540139174db286198e851c/app/tune_calc.py),
pinned commit `523e8ba188d0f7c0a5540139174db286198e851c`. The author labels that tool
as a deterministic baseline, not a measured/route-optimized tune. The same source's
`setup-wheels.js` uses a 0–20 damper editor scale. We use it as an editable reference,
not an independently verified universal FH6/per-car range. The MIT notice is shipped
as `public/car-catalogue-LICENSE.txt` (Copyright © 2026 ClickClickMedia). The JS module
retains attribution. Source claims are not independent game validation by this app.

### Calculations

- Gearing: solves top-speed geometry around measured/entered power RPM, with
  geometric spacing between the first/top references. Reports post-shift RPM
  against torque-peak RPM. Tire size, actual power and adjustment limits still
  determine whether the target works. Existing goal-based preserve-launch gearing
  remains available through Suggest gearing for goal.
- Spring rate: `Hz² × axle_weight_lb / 19.56`, lb/in per spring. This is the gross
  axle-weight approximation at unit motion ratio; unsprung mass, tire compliance,
  nonlinear springs and aero load are not independently measured. Front/rear target
  frequencies are editable. Supplied spring limits flag infeasible numbers rather
  than silently clipping the rates. Unknown per-car limits remain an explicit check.
- Reference rebound: `max(0, 6.5 + (Hz − 2.4) × 4)`; bump is 60% of rebound.
  This heuristic is not a physical damper-coefficient-to-FH6-slider calibration.
  Entered damper limits are checked; out-of-range results are flagged unchanged.
- Tire PSI: source compound table plus source drivetrain offsets. Drag reference is
  29.5 PSI before offsets; FWD −2/+2 PSI, RWD 0/0, AWD −1/+1 front/rear. Pressure
  and compound are not read from telemetry. No temperature-to-pressure optimum is
  inferred from the four averaged temperature channels.
- Anti-roll: `25 ± 0.7 × (front_percent − 50)`, bounded to reference 1–65.
- Drag alignment: source front camber −0.3° (FWD additional −0.4°), rear half,
  zero toe and 5° caster. These are reference values to test.
- Differential: source FWD/AWD 55% acceleration / 20% deceleration on driven
  axles, RWD 68% / 34%; non-driven axles are labelled accordingly. AWD center split
  is not inferred. These are references, not an optimization from telemetry.
- Brake pressure uses the source Drag 100% reference; balance stays at a neutral
  50% reference rather than assuming how a game-specific bias slider maps.

These outputs are a reviewable starting setup for repeated in-game testing. They
are not verified optimal tunes or leaderboard guarantees. Ride height, aero and
AWD center split remain car-specific/manual rather than invented from absent data.
Only adjustable installed parts accept these settings; confirm their limits.
The simplified ET model does not simulate spring/damper/pressure/alignment slider
effects. Validate those changes through repeated actual in-game captures.
