# Telemetry decoding, capture, and evidence

## Status and sources

The Horizon **324-byte** little-endian layout was cross-checked against these public implementations:

- [ClickClickMedia/Forza-6-telemetry, packet.py](https://github.com/ClickClickMedia/Forza-6-telemetry/blob/523e8ba188d0f7c0a5540139174db286198e851c/app/packet.py). The author reports empirical FH6 capture validation. That is the author's evidence, not a claim that this app has been tested with a real FH6 capture.
- [TheBanHammer/fh6-tel, parser.rs](https://github.com/TheBanHammer/fh6-tel/blob/7ffeb0812f9f240653620ed3ecb0d2266b8d94ab/src-tauri/src/parser.rs). Independently agrees on the fields and offsets used here.
- [FrenzyVJN/fh6-dashboard](https://github.com/FrenzyVJN/fh6-dashboard/blob/7effd4e4d0c42bdb43702df7cf7698240359e4dd/fh6_dashboard/packet_parser.py) was also inspected. Its adaptive layout search was not adopted.

This app implements its own decoder. Length, finite values, RPM/speed/gear ranges, tire/suspension plausibility, and agreement between speed and the velocity-vector magnitude are checked. Wrong-size or implausible packets remain visible in packet counts but do not enter driving captures. These checks reduce bad decoding; they do not authenticate a sender or establish actual-game compatibility. Live FH6 validation on the user's PC remains required. All test packets and browser fixtures are explicitly synthetic and are confined to tests.

## Fields used

| Offset | Meaning | Conversion |
| --- | --- | --- |
| 0, 4 | Active flag, game timestamp | int32, uint32 milliseconds |
| 8, 16 | Maximum RPM, current RPM | float32 |
| 32–40 | Velocity vector | m/s; compared with Speed |
| 68–80 | Normalized suspension travel FL/FR/RL/RR | float32 |
| 84–96 | Tire slip ratio FL/FR/RL/RR | float32 |
| 116–128 | Rumble-strip flags | int32 booleans |
| 212, 224 | Car ordinal, drivetrain | int32 |
| 256, 260 | Speed, engine power | m/s → km/h; watts |
| 268–280 | Tire temperatures FL/FR/RL/RR | Fahrenheit → Celsius |
| 300, 304, 312 | Last/current lap seconds, lap number | float32, float32, uint16 |
| 315, 316 | Throttle, brake | uint8 / 255 |
| 319, 320 | Gear, steer | uint8; int8 / 127 |

No launch-control-enabled flag, current tuning sliders, vehicle mass, gear ratios, track identifier, or official drag start/finish timing is inferred. Those require manual context or another verified source. Packet tire temperature does not provide inner/middle/outer tread temperatures, so it cannot establish an alignment tune.

## Capture procedure on the gaming PC

1. Use the installed **Forza-ingenium** shortcut, `npm run launch` from a source checkout, or the README's PowerShell commands. Both listeners bind to 127.0.0.1 in the Windows launcher. Enable Data Out in the game, directed to 127.0.0.1, UDP 5300.
2. Check the Telemetry workspace. Compare decoded speed and RPM with the game before trusting analysis. Unknown-size or rejected packets should be investigated, not forced through another layout.
3. In Tune Calculator → Drag, select the real distance, enter your build, and click **Start fresh capture** for each run.
4. Stay stationary for at least 0.5 seconds, launch in first gear, and drive through the selected distance. Record launch-control mode using the manual selector.
5. Click **Analyze live capture**. Use **Export capture JSON** to keep the original decoded session. Saved run summaries retain measured ET/finish speed; exports retain samples and user-supplied distance/LC labels.

Captured samples stay in server memory only: at most 18,000 active samples with a minimum 15 ms interval, roughly five minutes at 60 Hz. Receiver UTC timestamps are used for integration and `gameTimestampMs` is preserved separately. Car changes clear the buffer. Fresh capture explicitly clears it. The analysis uses the **first** qualifying launch in a capture, so reset before each run. Only a 64-byte raw hex preview is kept; the session retains decoded fields rather than full raw datagrams. Server restart removes the capture. Export before stopping if you want it retained.

The HTTP snapshot contains the most recent decoded reading and rejection counts, not the whole capture. Session export uses `/api/telemetry/session`. No capture returns HTTP 409. `/api/telemetry/reset` accepts a same-origin POST with the app's custom header; missing/foreign-origin reset requests are rejected. There is no application account system; run locally or within a trusted private network as documented.

## Import contract

Tune Calculator → Drag accepts JSON exported by this app. Other tools need conversion to the following explicit schema; arbitrary vendor CSV/JSON formats are not guessed:

- Top-level `schema`: `forza-garage-telemetry/v1`.
- `samples`: 2–18,000 records with strictly increasing `timestampMs`.
- Required numeric channels: `speedKph`, `rpm`, integer `gear`, `throttle` and `brake` on 0–1, `steer` on −1–1.
- Optional channels: `engineMaxRpm`, `powerW` (engine watts), `carOrdinal`, `lapNumber`, `lastLapS`, `currentLapS`, `isRaceOn` (boolean).
- Optional four-wheel arrays in FL/FR/RL/RR order: `tireSlipRatio`, `suspensionTravel`, `tireTempC`, `onRumbleStrip` (booleans).
- Optional `context.launchControl`: `enabled`, `disabled`, or `unknown`; this is a user label, not decoded evidence.

Files are limited to 32 MB. Mixed known car ordinals, nonfinite values, bad ranges/units, and reversed/duplicate timestamps are rejected. Invalid imports clear prior active evidence so stale telemetry cannot silently influence a new model. A generic driving capture without a valid standing start can still supply eligible measured engine-power bins, but not a drag ET.

## Timing and evidence limits

Both predicted and measured ET/distance start at the interpolated **1 km/h crossing**, after a captured stationary phase. Neither includes driver reaction time or a one-foot rollout allowance. This is not asserted to match the FH6 event scoreboard clock. A capture gap over 250 ms during a drag run prevents a trusted result. The selected distance is integrated from reported speed, not geofenced to an in-game finish marker. Finish/trap speed is instantaneous at that distance, not an average over a timing zone.

Power bins use at least five samples per 250-RPM bin, throttle ≥95%, brake ≤2%, forward gear ≥2, steering magnitude <0.15, speed ≥40 km/h, and all wheel slip magnitudes <0.15. Median engine power is retained. Power crossovers are interpolated only between populated bins no more than 500 RPM apart, without extrapolation. These filters are diagnostic heuristics, not a universal optimum. The user explicitly opts into using bins for the same car/build; uncovered RPM regions remain the manual approximation. Reported maximum engine RPM is shown as evidence to check against the manual shift-RPM setting.

Lap/road diagnostics exist as shared analysis utilities, but drag runs are the current UI priority. No automatic differential, suspension, tire-pressure, or alignment slider changes are made from insufficient channels. A faster measured run does not by itself prove a tune caused it; compare the same strip, build, weather, assists, tires, and driving conditions.
