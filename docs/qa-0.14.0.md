# Build 0.14.0 QA

The build version is 0.14.0 in package metadata, HTTP health responses and the visible footer. Existing localhost URLs, internal install/runtime directories, export schemas and browser storage keys are retained for upgrades.

## Requested cleanup

- Removed the “Your dashboard.” heading prefix.
- Removed the featured preview sentence, keeping its next-rotation time.
- Removed normal vehicle/wheel spreadsheet badges and their empty footer markup; review and historical-alternative statuses remain useful.
- Colored “yet to be released” acquisition classifications orange.
- Removed unused original landing-illustration/retired-worksheet CSS and consolidated duplicate release/setup documentation.

## Bugs fixed

- Rounded optimizer candidates could leave precise user-supplied search bounds. Candidate values are now constrained to those bounds.
- Disabling gear-spacing search still rounded unchanged gear ratios. The search now preserves their precision and retains the exact current build as a baseline candidate when eligible.
- Measured power-crossover guidance could remain after loading a manual build or entering invalid inputs. Unsupported guidance is now cleared.
- A previously analyzed drag ET could remain eligible for transfer after invalidating its distance. Handoff state is invalidated before reanalysis and restored only with valid run evidence.
- Removed a duplicate candidate-reset operation.

## Completed checks

- **37 Node tests:** paint identity/raw values, calculator dimensions/inverses, optimizer constraints, drag simulation/capture validation, telemetry decoding/UDP, HTTP routes, launcher ownership/start/reuse/stop, spreadsheet refresh/cache recovery/migration and New-entry tracking.
- **Two independent spreadsheet audits:** every nonblank paint row and raw recipe cell; all rare-car entries and acquisition details, compared against the uploaded XLSX workbooks with openpyxl.
- **Seven Chromium/Playwright suites:** library filters/pagination/favorites/clipboard, personal recipes, Color Lab, Drag/Track/Drift saved setups, optimizer searches, telemetry import/export/reset, comparative attempts, categorized Rare Cars, New badges/expiry, automatic refresh and cached failures.
- **Five viewport widths:** 320, 390, 768, 1024 and 1440 pixels across every workspace and calculator, including color-dialog sizing.
- **Failure handling:** malformed captures, missing catalogue, invalid input, corrupted saved JSON and unavailable browser storage.
- **Installer checks:** deterministic payload, checksum, safe paths, exact runtime bundle contents, extracted app assets and managed start/stop lifecycle.
- JavaScript syntax and whitespace/reference checks.

The bundled data remains 11,008 paint recipes and 284 rare-car acquisition entries across ten categories.

## Practical verification limits

This QA ran on Linux/Chromium. Native Windows PowerShell shortcut installation/cleanup/default-browser activation still requires a Windows PC test. Actual FH6 gameplay capture and tuning performance were not measured. The cloud's live Google Sheets export previously returned HTTP 403; refresh behavior uses fixtures and the real uploaded workbook parser. No live leaderboard or rank validation is claimed.
