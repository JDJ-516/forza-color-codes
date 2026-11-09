# Telemetry decoding, capture, and evidence

## Status and sources

The Horizon **324-byte** little-endian layout was cross-checked against these public implementations:

- [ClickClickMedia/Forza-6-telemetry, packet.py](https://github.com/ClickClickMedia/Forza-6-telemetry/blob/523e8ba188d0f7c0a5540139174db286198e851c/app/packet.py). The author reports empirical FH6 capture validation. That is the author's evidence, not a claim that this app has been tested with a real FH6 capture.
- [TheBanHammer/fh6-tel, parser.rs](https://github.com/TheBanHammer/fh6-tel/blob/7ffeb0812f9f240653620ed3ecb0d2266b8d94ab/src-tauri/src/parser.rs). Independently agrees on the fields and offsets used here.
- [FrenzyVJN/fh6-dashboard](https://github.com/FrenzyVJN/fh6-dashboard/blob/7effd4e4d0c42bdb43702df7cf7698240359e4dd/fh6_dashboard/packet_parser.py) was also inspected. Its adaptive layout search was not adopted.

This app implements its own decoder. Length, finite values, RPM/speed/gear ranges, tire/suspension plausibility, and agreement between speed and the velocity-vector magnitude are checked. Wrong-size or implausible packets remain visible in packet counts but do not enter driving captures. These checks reduce bad decoding; they do not authenticate a sender or establish actual-game compatibility. Live FH6 validation on the user's PC remains required. All test packets and browser fixtures are explicitly synthetic and are confined to tests.

## Displayed fields

Telemetry shows 89 scalar parameters in nine groups, updated once per second
while the page is visible (five seconds when hidden). The receiver processes
incoming packets continuously and records at the existing minimum 15 ms interval.
All four-wheel groups use front-left, front-right, rear-left, rear-right order.

| Offset | Fields | Wire units / display |
| --- | --- | --- |
| 0, 4 | Driving active, game timestamp | int32; uint32 ms |
| 8, 12, 16 | Maximum, idle, current RPM | float32 RPM |
| 20–28 | Acceleration X/Y/Z | m/s² |
| 32–40 | Velocity X/Y/Z | m/s |
| 44–52 | Angular velocity X/Y/Z | rad/s |
| 56, 60, 64 | Yaw, pitch, roll | radians |
| 68–80 | Four normalized suspension travels | normalized |
| 84–96 | Four tire slip ratios | ratio |
| 100–112 | Four wheel rotation speeds | rad/s |
| 116–128 | Four rumble-strip flags | int32 → Yes/No |
| 132–144 | Four puddle depths | normalized |
| 148–160 | Four surface-rumble values | normalized |
| 164–176 | Four tire slip angles | normalized |
| 180–192 | Four combined tire slip values | normalized |
| 196–208 | Four suspension travels | meters |
| 212–232 | Car ID, class, PI, drivetrain, cylinders, group ID | int32; class/drivetrain labels |
| 236, 240 | Smashable velocity difference, mass | float32; reported values, no assumed conversion |
| 244–252 | Position X/Y/Z | meters in game coordinates |
| 256, 260, 264 | Speed, power, torque | m/s → km/h; W; N·m |
| 268–280 | Four tire temperatures | °F → °C |
| 284, 288, 292 | Boost, fuel, distance traveled | psi; fraction → %; meters |
| 296–308 | Best, last, current lap; race time | seconds |
| 312, 314 | Lap number, race position | uint16; uint8 |
| 315–318 | Throttle, brake, clutch, handbrake | uint8 / 255 → % |
| 319, 320 | Gear, steering | 0=R, 11=N; signed byte → % (−128 clamped to −100%) |
| 321, 322 | Driving line, AI brake difference | raw signed bytes |
| 323 | Reserved byte | raw uint8; meaning unknown |

The added fields were checked against the first linked reference's field table.
The source identifies offsets 232–240 as CarGroup/SmashableVelDiff/SmashableMass;
we expose IDs/values without inventing a human-readable car-group classification.
The UI uses `public/telemetry-channels.js` for labels, units and formatting.
The full decoder stays in `fh6-decoder.js`. Zero and false are valid readings;
missing/nonfinite values display as a dash. Last/current lap values outside the
existing session contract (0–10,800 seconds) remain unavailable.

No launch-control-enabled flag, current tuning sliders, vehicle mass, gear ratios, track identifier, or official drag start/finish timing is inferred. Those require manual context or another verified source. Packet tire temperature does not provide inner/middle/outer tread temperatures, so it cannot establish an alignment tune.

## Capture procedure on the gaming PC

1. Use the installed **Forza-ingenium** shortcut, `npm run launch` from a source checkout, or the README's PowerShell commands. Both listeners bind to 127.0.0.1 in the Windows launcher. Enable Data Out in the game, directed to 127.0.0.1, UDP 5300.
2. Check the Telemetry workspace. Compare decoded speed and RPM with the game before trusting analysis. Unknown-size or rejected packets should be investigated, not forced through another layout.
3. In Tune Calculator → Drag, select the real distance, enter your build, and click **Start fresh capture** for each run.
4. Stay stationary for at least 0.5 seconds, launch in first gear, and drive through the selected distance. Record launch-control mode using the manual selector.
5. Click **Analyze live capture**. Use **Export capture JSON** to keep the original decoded session. Saved run summaries retain measured ET/finish speed; exports retain samples and user-supplied distance/LC labels.

Captured samples stay in server memory only: at most 18,000 active samples with a minimum 15 ms interval, roughly five minutes at 60 Hz. Receiver UTC timestamps are used for integration and `gameTimestampMs` is preserved separately. Car changes and detected build changes clear the buffer. Fresh capture explicitly clears it. The analysis uses the **first** qualifying launch in a capture, so reset before each run. The normal page no longer shows raw packets or diagnostic controls. For developer
troubleshooting, the receiver retains the most recent packet and rejected packet
in memory, capped at 1,024 bytes each, through `/api/telemetry/diagnostics`. Session exports still contain decoded fields rather than raw datagrams. Server restart removes the capture. Export before stopping if you want it retained.

The HTTP snapshot contains the most recent decoded reading and rejection counts, not the whole capture. Session export uses `/api/telemetry/session`. No capture returns HTTP 409. `/api/telemetry/reset` accepts a same-origin POST with the app's custom header; missing/foreign-origin reset requests are rejected. There is no application account system; run locally or within a trusted private network as documented.

## Import contract

Tune Calculator → Drag accepts JSON exported by this app. Other tools need conversion to the following explicit schema; arbitrary vendor CSV/JSON formats are not guessed:

- Top-level `schema`: `forza-garage-telemetry/v1`.
- `samples`: 2–18,000 records with strictly increasing `timestampMs`.
- Required numeric channels: `speedKph`, `rpm`, integer `gear`, `throttle` and `brake` on 0–1, `steer` on −1–1.
- Optional channels: `engineMaxRpm`, `powerW` (engine watts), `carOrdinal`, `lapNumber`, `lastLapS`, `currentLapS`, `isRaceOn` (boolean).
- Optional four-wheel arrays in FL/FR/RL/RR order: `tireSlipRatio`, `suspensionTravel`, `tireTempC`, `onRumbleStrip` (booleans).
- Optional `context.launchControl`: `enabled`, `disabled`, or `unknown`; this is a user label, not decoded evidence.

Files are limited to 64 MB to accommodate the expanded channels in a full capture. Mixed known car ordinals, nonfinite values, bad ranges/units, and reversed/duplicate timestamps are rejected. Invalid imports clear prior active evidence so stale telemetry cannot silently influence a new model. A generic driving capture without a valid standing start can still supply eligible measured engine-power bins, but not a drag ET.

## Timing and evidence limits

Both predicted and measured ET/distance start at the interpolated **1 km/h crossing**, after a captured stationary phase. Neither includes driver reaction time or a one-foot rollout allowance. This is not asserted to match the FH6 event scoreboard clock. A capture gap over 250 ms during a drag run prevents a trusted result. The selected distance is integrated from reported speed, not geofenced to an in-game finish marker. Finish/trap speed is instantaneous at that distance, not an average over a timing zone.

Power bins use at least five samples per 250-RPM bin, throttle ≥95%, brake ≤2%, forward gear ≥2, steering magnitude <0.15, speed ≥40 km/h, and all wheel slip magnitudes <0.15. Median engine power is retained. Power crossovers are interpolated only between populated bins no more than 500 RPM apart, without extrapolation. These filters are diagnostic heuristics, not a universal optimum. The user explicitly opts into using bins for the same car/build; uncovered RPM regions remain the manual approximation. Reported maximum engine RPM is shown as evidence to check against the manual shift-RPM setting.

Lap/road diagnostics exist as shared analysis utilities, but drag runs are the current UI priority. No automatic differential, suspension, tire-pressure, or alignment slider changes are made from insufficient channels. A faster measured run does not by itself prove a tune caused it; compare the same strip, build, weather, assists, tires, and driving conditions.

## Packets arriving but data invalid

A rising packet count means UDP is reaching the receiver. A matching 324-byte length alone does not establish correct contents. Orange “Packets arriving · data invalid” means that the current packet failed layout/value checks; it is not a firewall or missing-port diagnosis. The Dashboard shows the first failed field; the Telemetry status shows its byte offset, received value and expected range. A rejected packet immediately clears green status even if the previous valid reading is recent.

Green means fresh, usable decoded data, including inactive/menu frames. An inactive frame may report a zero engine RPM limit; this is accepted as unknown (`engineMaxRpm: null`). It is not recorded as driving data. Active frames still need a plausible positive engine limit and pass speed/velocity, tire, suspension and power checks. Full signed steering −128 is normalized to −1. Unsupported layouts are not guessed by moving offsets.

The snapshot separates `readings` (the most recent size-compatible packet,
possibly unverified) from `latest` (the most recent validated decoded reading).
Unverified readings appear with an explicit warning and orange values, never as
current validated telemetry. Rejected packets never enter captures. Unsupported
packet lengths clear displayed values; no offsets are guessed. Stale values are
labelled as the last received packet; an HTTP connection loss clears all values.

For developer investigation of a continuing rejection, the diagnostics endpoint
returns bounded packets and check results. It has schema
`forza-ingenium-packet-diagnostics/v1`; it is not a Tune Calculator session import.
No diagnostic data is uploaded automatically.

The screenshots from build 0.14.2 showed packet receipt and a basic plausibility failure, but not the raw field values. They cannot establish which predicate failed. The inactive-zero-limit fix addresses one identified decoder rejection case; it is not a claim that the user's actual driving stream has been validated.

## In-game configuration

Settings → HUD/Display → Telemetry → Data Output = ON → IP = 127.0.0.1 → Port = 5300.
The normal Windows launcher enables the receiver on the same PC using those
values. No router forwarding is needed for this same-PC setup.

## Current-car tuning inputs

See [car identities and observed prefills](car-identities.md). The active packet's
ID resolves to a name through the bundled FH6 catalogue. Eligible observed engine
maxima are separate from rated engine specifications. The Tune Calculator keeps
manual values for all fields absent from the packet and respects manual edits.
The connection instructions now collapse into a vertical list; the standalone
`/telemetry-setup.html` guide works offline with the installed app.
