# Build 0.16.0 — visible configuration sheet and cleaner tuning layout

Capture details collapse by default while Start now/countdown/Stop/Analyze/Export
remain visible. The optional countdown is five seconds, with existing color and
zero-speed stop behavior. The status indicator appears during/after capture;
import/LC/supporting data remain under the disclosure. Measured analysis is also
collapsed initially. The header shows Build 0.16.0 beneath the wordmark.

User inputs now occupy horizontal full-width rows on desktop; Drag/Track/Drift
results sit underneath. The new Drag configuration sheet generates full gearsets
from gearbox count/reference endpoints, target speed, tires and RPM without
requiring every existing ratio. It shows physical spring baselines plus labelled
reference damper, tire, alignment, anti-roll, differential and brake settings.
Reference targets are editable and visible after generation; unknown per-car
spring/aero/ride-height limits are not fabricated. Source provenance and the
included MIT notice are documented in setup-baseline.md.

Validation:
- 65 Node tests: five-second countdown/lead-in, real UDP/API timing, generated
  ratios without a prior list, spring arithmetic, pressure/drivetrain reference
  values, range rejection/flags and existing unit/decoder/model regressions.
- New Setup Sheet browser suite: collapsed details and visible controls, version
  placement, horizontal visible fields, bottom settings, complete gear rows,
  chassis values, apply/exported JSON/units, stale results, infeasible range
  warnings and 320/390/768/1440px layouts.
- Capture browser suite: five countdown digits/GO, hidden supporting status,
  independent stopping, manual/model values and imported evidence.
- Release browser suite: version, responsive workspaces and storage recovery.
- Drag, US Goal and Garage browser suites: saved builds, canonical unit precision,
  curves/imports, goal gearing, Track spring/gearing and export behavior.
- Deterministic Windows ZIP/installer and extracted app/module lifecycle checks.

Driving data is synthetic; native Windows activation and actual FH6 handling
have not been validated here. Numeric reference settings are starting points,
not confirmed best settings for the user's exact upgraded car or a guaranteed
leaderboard result. Existing model/data limitations still apply.
