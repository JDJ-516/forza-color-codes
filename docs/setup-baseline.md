# FH6 tuning worksheet · build 0.17.0

Tune Calculator → Drag keeps the manual build data in horizontal Powertrain
fields. Top-speed goal, installed gear count, tire package and launch control
(On/Off) are together. Capture controls stay available above the form; supporting
capture information starts collapsed. The optional countdown lasts five seconds.
Drag recording stops when the car returns to zero after moving, or on Stop.

Select **Generate tuning setup** below the form. The results follow the supplied
FH6 screenshots: Tires, Gearing, Alignment, Antiroll bars, Springs, Damping,
Aero, Brake, Differential. Export saves all categories, inputs, evidence, missing
requirements and assumptions as `forza-ingenium-starting-setup/v2`. Edited inputs,
changed capture evidence and loaded builds invalidate the displayed results.
Changing cars clears them. Old saved builds retain their original data and can
still load; legacy shift targets are not relabeled as measured engine limits.

## Data requirements

Chassis needs weight, front weight distribution, drivetrain, tire package and
launch-control choice. Data Out identifies the car and drivetrain. It does not
identify upgraded weight/distribution, installed tire compound, total installed
gear count or launch-control state. Highest observed gear is only a lower bound,
so the calculator does not silently use it as the gearbox count.

Gearing needs a speed goal, gear count, engine RPM limit and driven tire overall
diameter. The last two live in the collapsed **Gearing data** section and have
manual offline fallbacks. The engine limit fills from the decoded packet. Effective
rolling diameter fills after five distinct low-slip, straight coasting samples
above 40 km/h (about 25 mph), using `diameter = 2 × speed / |wheel angular speed|`.
The median must be coherent across the driven wheels and collected samples.
Throttled, braking, steering or slipping samples do not establish tire diameter.
This is an effective rolling measurement, not a tire size or compound identifier.
An imported capture can supply the same requirements when those channels exist.
Rated HP and peak torque alone do not identify a power curve or peak RPM.

## Gearing and measured performance

Speed in mph is `RPM × π × diameter_in × 60 / (gear × final_drive × 63,360)`.
The output uses hundredth ratios, matching the pictured menu. It searches a
conservative design window (final drive 2.00–5.00, individual gears 0.50–5.00),
with a preference for moderate final drive and first gear. These are software
starting constraints, not asserted universal FH6 slider limits. A recognized
2018 Trackhawk may use the pictured 6.10 maximum final drive and 0.48 minimum
individual gear; other unknown endpoints are not extrapolated from the picture.

With sufficient measured power coverage on both sides, top gear targets the
interior observed power peak. Spacing uses the measured 85%-power band with a
0.60–0.88 RPM-retention reference. With incomplete power coverage it uses a
72% retention starting reference, compressed to fit the ratio design window,
and 98% of engine limit as a clearly labeled RPM reference. An endpoint maximum
in a truncated power curve is not declared a confirmed power peak.

Individual shift references use supported engine-power crossovers where both
pre/post-shift RPMs have measured support, without crossing gaps over 500 RPM.
Otherwise they are explicitly engine-limit references. Driver-observed shift
RPM is read-only and is not assumed optimal. A gearing ceiling does not predict
attainable speed, and launch control does not secretly add grip or change ratios.

Performance comparisons use actual captured standing-start ET, 60-ft times,
0–60 mph, finish speed and shifts. The former uncalibrated simulator/search UI
has been replaced by the setup worksheet and measured comparisons. Its pure
math modules remain for legacy regression coverage; they do not produce the new
worksheet's chassis settings. Capture distance integrates game-reported speed;
ET begins at the interpolated 1 km/h launch crossing. There is no reaction-time
or one-foot rollout correction, and finish speed is instantaneous.

## Chassis methods and screenshot evidence

The screenshots show extreme slider positions, not proven optimal tunes. The
PC graphics benchmark measures rendering performance and is not a car-tuning
input. New drag starting heuristics replace the previous road-style reference:

- Neutral camber and toe, 5° caster as a starting reference.
- Tire PSI starting references: Drag RWD 40/17, FWD 17/40, AWD 18/18; other
  compounds use a driven-axle reference of 24–27 PSI and 32 PSI on a free axle.
  These values are test hypotheses, not an inferred hot-pressure optimum.
- Wheel-rate spring approximation in lb/in:
  `(2π × frequency)² × axle_weight_lb / (2 × 386.0886)`.
  Drivetrain starting frequencies front/rear: RWD 1.65/1.85 Hz, FWD 2.0/1.65 Hz,
  AWD 1.9/2.0 Hz. Gross corner weights and unit motion ratios are assumptions;
  suspension leverage, unsprung mass and tire stiffness are not measured.
- Damping front/rear rebound/bump reference tuples: RWD 5/9/7/4, FWD 9/5/4/7,
  AWD 6/8/6/4.5, with small bounded weight-bias offsets. They are game-slider
  starting heuristics, not a physical damping-coefficient calibration.
- Antiroll bars start soft: RWD 1/12, FWD 12/1, AWD 1/1.
- Driven-axle differential acceleration lock 100%, deceleration lock 0%.
  AWD center starts at `60 + (front_percent − 50) × 0.5`, bounded 50–75% rear.
  Center output explicitly maps to the game's Rear direction.
- Brakes stay at center balance 50% and pressure 100%.

Pictured screen endpoints: tires 15–55 PSI; damping 1–20; antiroll 1–65;
camber/toe ±5°; differential 0–100%; brake balance 0–100% and pressure 0–200%.
These references come from the user's installed Trackhawk, not an independent
verification of every car and upgrade package.

Trackhawk-only observed spring/height endpoints are asymmetric: front spring
maximum 2,148.4 lb/in, rear spring minimum 429.7 lb/in, front height maximum
8.5 in and rear height minimum 8.1 in. The generator respects those two spring
endpoints when the named car matches, flags any adjustment, and still labels the
complete range unknown. Different installed parts may change the limits. It does
not invent front minimum/rear maximum from the opposite axle. Ride height stays
a relative clearance target; aero starts at minimum available downforce if the
parts are adjustable. Neither category pretends to know missing numeric ranges.

## Run feedback

Captured straight-line throttle samples below 60 mph evaluate only the selected
driven wheels. Feedback reports slip exposure above 0.20 and near-full off-curb
suspension compression, requiring at least a second of eligible coverage. It
suggests a next experiment instead of assuming the generated pressure/spring/
damper settings were already installed. Repeated same-context runs determine
whether an adjustment helps. No leaderboard position or universal optimum is
claimed.
