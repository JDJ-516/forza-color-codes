# Drag model and strip profiles

Tune Calculator → Drag works without telemetry, or with opted-in measured engine-power bins and measured-run analysis. It is a transparent simplified simulator and a test workflow, **not a validated FH6 physics emulator or a guarantee of the best possible tune**.

## Venues supplied by the user

| Profile | Used distance | Supplied location / unlock |
| --- | --- | --- |
| Irakawa Space Centre Drag Strip | **321.869 m** (0.2 mile, rounded) | Nangan, bottom-left map corner; Pink Wristband |
| Ito Airfield Drag Strip | **804.672 m** (0.5 mile) | Minamino, Ito runway above Legend Island; Orange Wristband |
| Horizon Festival Kilometer | **965.606 m** (0.6 mile, rounded) | Not supplied |

The user explicitly chose exactly 0.2 mile for Irakawa over the conflicting earlier quarter-mile description, and exactly 0.6 mile for the Festival over a literal 1,000-meter interpretation of its name. These profiles preserve those decisions. They are user-provided, not independently map-verified or a claim that every FH6 drag venue has been inventoried. Course grades were not supplied; zero is a visible level-ground assumption. Preset distances are supplied automatically. Only Custom strip exposes a distance input. The interface assumes level ground and has no grade field. Previously saved named strips remain selectable.

Separate standard presets are 1/8 mile = 201.168 m, 1/4 = 402.336 m, 1/2 = 804.672 m, and 1 mile = 1609.344 m. These are distance conventions, not invented FH6 venues. `public/drag.js` defines the shared profile records.

Accessible research also inspected [Acollectorssoul/FH6-Dragy](https://github.com/Acollectorssoul/FH6-Dragy/tree/7987b237f914898eca62208aadf5b03058dbae65), whose strip-checking utility distinguishes nominal quarter-mile distances from actual event timing. It did not provide a verified full map-strip registry. Another search result, Atlas-Drag-, had only a short project description, not a usable strip dataset. Neither project's code was executed or copied into this app.

## Model

Time integration uses 0.01-second steps. Tire circumference comes from section width, aspect ratio and rim size. Engine speed is calculated from road speed, gearing and tire circumference, with an idealized clutch-slip floor during launch. Manual engine torque rises linearly from the user-entered percentage at 800 RPM to peak torque at the specified torque-peak RPM; above that, a peak-power cap applies. This is a configurable approximation, not a recovered engine dyno curve.

Engine torque is multiplied by gear ratio, final drive and fixed drivetrain efficiency, then divided by tire radius. Traction is capped by the assumed coefficient μ and driven-axle load. Front/rear loads use static weight distribution plus approximate longitudinal load transfer from the previous acceleration, CG height and wheelbase; AWD uses total normal load. Loads are bounded. Aerodynamic resistance is 0.5 × 1.225 kg/m³ × CdA × speed². Rolling resistance and the model’s constant grade (fixed to zero by the current interface) contribute additional forces. Acceleration is net force divided by mass.

A shift interrupts delivered torque for the specified delay. Top gear is cut when it exceeds the selected shift RPM. The model omits dynamic wheelspin losses, game traction/launch controller logic, aero lift/downforce, nonlinear tire behavior, variable drivetrain losses, detailed clutch dynamics, and car-specific suspension/inertia/upgrade data. Enter actual build values and adjustment limits before acting on candidates. The interface starts blank; synthetic test values are not recommendations for an actual car.

### Launch control

Enabled mode holds the entered LC target RPM during idealized launch clutch slip. Disabled mode uses the entered manual launch RPM. Throttle ramp is an explicit assumption in both modes. No arbitrary grip or ET bonus is added. If traction caps both modes similarly, predicted times can be nearly identical. This does not reproduce or prove how FH6's internal launch controller behaves. Actual LC mode must be manually labeled in telemetry comparisons because it is not decoded from the packet.

### Finite model search

**Search model candidates** explores nine final drives, five launch RPMs and four shift RPMs within the entered limits. Optional adjustable gear spacing tests three progressions (`original ratio × spacing^gear index`, starting at index zero), then four rounds of local coordinate refinement. The current configuration is retained as a candidate if it is within bounds. Ratios stay descending and within the simulator's 0.1–10 range; confirm each ratio's actual in-game adjustment range. Search preserves power, friction, mass, aero, shift delay and launch-control mode. It can be cancelled explicitly or by changing inputs/evidence. Five completed candidates are retained; the fastest model candidate can be applied explicitly, updating final drive, active launch RPM, shift RPM and ratios. A known telemetry engine limit prevents searching above that limit. This finite deterministic search is not a global or verified game optimum.

The real-run validation panel compares the current prediction with the captured ET without applying a hidden calibration factor. Launch slip and braking diagnostics guide the next physical test. Confirm that model inputs and measured engine-power bins represent the captured build. The competitive development log compares repeated clean results against a manually entered leaderboard target; no live rank or top-10 guarantee is inferred.

### With telemetry

The engine-power bins are used only after the user opts in for the same car/build. There is no extrapolation outside supported bins: the manual engine model fills uncovered ranges, and the UI reports the fraction of powered simulation steps that used measurements. The reported engine limit and observed shift RPM evidence are not automatic replacements for tuning inputs. Measured ET, 60-foot and standard splits, instantaneous finish speed, launch slip exposure and gear-change RPM come from the captured run, not the simulator.

Both paths use a 1 km/h timing origin. No reaction time or one-foot rollout is included. Speed integration measures the selected distance rather than an event's actual finish marker; official FH6 scoreboard times may differ. Captures with bad gaps, rolling starts or mixed cars are rejected. A capture that ends early is reported as partial rather than assigned an invented ET. See `telemetry.md` for data units, filtering, and remaining validation requirements.

## Persistence and verification

Local storage keys: `fcc-drag-builds` (inputs, optional measured power bins and compact evidence), `fcc-drag-strips` (legacy named profiles, read-only in the current UI), and `fcc-drag-runs` (last 30 measured summaries). Builds and captures can be exported as JSON; importing build backups is not implemented. Data remains in this browser/server unless the user exports it. Current browser tests use isolated profiles and synthetic telemetry fixtures. Node tests check conversions, monotonic distance splits, LC/no-hidden-bonus behavior, shift interruption, controlled acceleration integrals, missing data, packet offsets, and actual local UDP capture/export/reset. None substitutes for a real FH6 validation run.
