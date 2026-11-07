# Build 0.14.3 QA

## Changes

- Dashboard and Telemetry headings/status text are green for fresh decoded data and orange for waiting, disconnected, stale, receiver-error or rejected-packet states.
- Replaced the vague decoder-attention label with “Packets arriving · data invalid”. A bad current packet clears green even if an older valid reading is still recent.
- Decoder failures identify the field, offset, received value and expected range. The Telemetry inspection panel shows pass/fail checks.
- Inactive/menu packets with a zero engine limit are accepted as inactive data with an unknown engine limit. They never create driving samples. Active-frame validation remains strict.
- Signed steering −128 is normalized to −1 instead of falsely rejecting the entire packet.
- Export packet diagnostics downloads the current bounded raw packet and last rejected packet with checks, counters and build version. Raw retention is memory-only and capped at 1,024 bytes per retained packet; the normal preview remains 64 bytes.

## Verification

- 42 Node tests passed, including exact failed-field diagnostics, inactive zero-RPM handling, active invalid-limit rejection, steering endpoints, capture exclusion/recovery and bounded diagnostic export.
- Five browser suites passed: telemetry-status, Dashboard, workspace, Drag and release regressions.
- Browser checks used fixtures and real localhost UDP with synthetic packet bytes: invalid → inactive → driving → stale states; no driving samples from inactive packets; successful capture from valid active packets; last rejection retained in diagnostics; orange/green text; JSON download and mobile inspection layout.
- Installer integrity, bundled content and extracted-app lifecycle checks; JavaScript syntax and whitespace checks.

The screenshots from build 0.14.2 prove packet receipt and rejection, not the exact failing value or root cause. This release fixes an identified inactive-frame rejection case and provides precise diagnostics if the user's driving stream still fails. A raw diagnostic export is needed to identify any remaining game-specific mismatch. No alternative layout is guessed or forced through the checks. Native Windows activation and actual FH6 gameplay remain PC validation tasks.
