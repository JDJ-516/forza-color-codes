# Build 0.14.2 QA

## Changes

- Kept the Dashboard grid and expanded it vertically, with viewport-height-based font, spacing and card sizing.
- Added a Seasonal arrivals carousel using newly detected Seasonal-sheet entries from the previous seven days, as confirmed by the user. It is not a verified current-playlist feed: the spreadsheet has no week/season dates. Source-marked unreleased cars are excluded.
- Automatic eight-second rotation, previous/next and pause controls, reduced-motion behavior, and navigation to the Seasonal category. Entries age out locally even when paused and source requests fail.
- Drag, Track, Drift, benchmark context and optimizer inputs start empty. Calculations prompt for required specifications rather than showing demo predictions. Saved setups and attempt history remain intact and require explicit loading.
- Removed editable preset distance, grade and named-strip creation fields. Only Custom strip exposes a distance input; presets provide distance internally and the interface assumes level ground. Run-comparison distance also follows the selected strip without a second editable box.
- Saved preset/custom selections and an intentionally blank inactive-mode launch RPM roundtrip correctly. LC comparisons require actual values for both launch modes.

## Verification

- 39 Node tests, including weekly age-window filtering, deduplication, unreleased/future/other-category exclusion, and first-seen preservation.
- Nine Chromium/Playwright suites covering paint recipes, Color Lab, all calculators, explicit sample-input entry, optimizer search, setup save/load/export, telemetry captures, comparative runs, Rare Cars, Dashboard and release/layout regressions.
- Dedicated seasonal/empty-form checks cover rotation, pause/manual controls, category navigation after asynchronous loading, initial blank values, custom-only distance, absence of grade/naming fields, saved preset/custom restoration, inactive RPM preservation and offline weekly expiry.
- Five-width workspace/layout regression (320/390/768/1024/1440px) and desktop Dashboard checks at 1280×720, 1366×768, 1440×900 and 1920×1080.
- Installer checksum, exact bundled runtime content, extracted app assets and start/stop lifecycle checks; JavaScript syntax and whitespace checks.

Runtime examples were moved into explicit browser-test fixtures; production forms do not seed synthetic specifications. The bundled recipe and acquisition datasets are unchanged.

Native Windows shortcut/browser activation and actual FH6 driving remain PC validation tasks. Google source updates and telemetry states are exercised with explicit fixtures in browser checks; this does not establish live export access or game performance.
