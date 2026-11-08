# Build 0.14.6 — full telemetry parameter view

Telemetry now displays all 89 scalar entries in the supported 324-byte packet:
engine/drivetrain, inputs, motion/orientation, position/race timing, tire
heat/wheel speed, tire slip, suspension, surface contact, and vehicle/session.
The final reserved byte has unknown meaning and remains explicitly labelled.
Offsets 232/236/240 expose group ID and smashable collision metadata, following
the documented reference rather than interpreting the block as padding.

The setup text is Settings → HUD/Display → Telemetry → Data Output = ON →
IP = 127.0.0.1 → Port = 5300. Removed the old diagnostic button, raw packet
inspection, long decoder explanation and page footer. Browser values update
once per second while visible. Green still requires a fresh validated frame;
invalid packets appear orange as unverified values and never enter captures.
Signal loss marks old values stale, unsupported sizes clear the channel values,
and loss of the local server clears them as unavailable. Inactive frames stay
connected without becoming recorded driving data.

Expanded samples retain the existing capture contract and tuning channels.
Session import limit is now 64 MiB to allow full-channel 18,000-sample exports.
Last/current lap values retain the prior 0–10,800-second contract.

Validation:
- 48 Node tests: full field-offset/conversion fixtures, all 89 display entries,
  signed controls, missing/nonfinite fields, rejected-packet isolation and real
  localhost UDP/HTTP lifecycle.
- Telemetry browser suite: all parameters, setup text, removed controls/footer,
  live/inactive/invalid/stale/offline states, synthetic UDP, no horizontal overflow
  at 320/390/768/1440 pixels.
- Release browser suite: responsive workspaces/calculators, version/cleanup,
  modal sizing and browser-storage failure handling.
- Navigation browser suite: no library scroll jump, weekly car/category
  navigation and replacement telemetry instructions.
- Installer/ZIP integrity, deterministic rebuild and extracted app lifecycle.

All game packets used for automated tests are synthetic. The user's pasted
64-byte prefix is not a complete packet and cannot establish the remaining
field values or diagnose a full-packet rejection. Actual live FH6 gameplay and
Windows shortcut activation cannot be tested in this Linux environment.
Node.js remains bundled in both Windows downloads; prior distribution and
source-data limits in qa-0.14.5.md and qa-0.14.4.md still apply.
