# Forza-ingenium — Paint & Tune

Current build: **0.15.1**. A private, local Forza companion with a paint library, Color Lab, Rare Cars acquisition guide, Drag/Track/Drift calculators, and optional live telemetry. See the [release QA report](docs/qa-0.15.1.md) for checks and practical limits.

## Install and run on Windows

**Node.js is included. No Node installation, npm commands, or administrator access required.** These packages support Windows 10/11 x64 (Intel/AMD).

**Portable ZIP — share this with friends:**

1. Download [Forza-ingenium-Windows-x64.zip](https://github.com/JDJ-516/forza-color-codes/raw/refs/heads/main/Forza-ingenium-Windows-x64.zip) while signed into the private repository, or receive the complete ZIP from its owner.
2. Right-click → **Extract All**, then double-click **Start Forza-ingenium.cmd** inside the extracted folder. The app opens your default browser automatically.
3. Use **Stop Forza-ingenium.cmd** when finished. Optionally run **Setup Forza-ingenium.cmd** once for desktop/Start Menu shortcuts; after setup, you may delete the extracted download.

**Single-file installer — no manual extraction:**

1. Open [Install Forza-ingenium.cmd](https://github.com/JDJ-516/forza-color-codes/blob/main/Install%20Forza-ingenium.cmd), select **Download raw file**, and double-click the downloaded file.
2. Use the **Forza-ingenium desktop shortcut** from then on. The installer also includes Node.js.

Send friends the complete app ZIP or single-file installer. They do not need GitHub access to run a file you send. GitHub **Code → Download ZIP** is the source checkout; use the ready-to-run app ZIP above, or run the included single-file installer from the source checkout. Close any older manually started Forza terminal before switching.

To update, download the same installer again and run it. To stop the app, use **Start Menu → Forza-ingenium → Stop Forza-ingenium**, or sign out of Windows. Closing the browser tab leaves the receiver running. Export in-memory telemetry before stopping or updating.

The app installs in `%LOCALAPPDATA%\ForzaGarage\app`. Logs, managed-server state and the Rare Cars cache are in `%LOCALAPPDATA%\ForzaGarage\runtime`. The internal folder name is retained for existing installations. The installer removes old Forza Garage shortcuts only when their target, working directory, launcher path and description match this app; it removes an old Start Menu folder only if empty.

Favorites, personal colors and saved tunes stay in the same browser/profile at `http://127.0.0.1:3000`. They do not transfer automatically to a different browser. Updating the installer does not delete browser data. This is a browser-backed desktop shortcut; Node is bundled privately for this app, updates are explicit, and it does not register a Windows service or startup-at-login task. GitHub repository privacy does not add an app login.

To uninstall, stop the managed app and remove its shortcuts and `%LOCALAPPDATA%\ForzaGarage` folder. Browser data remains until cleared in that browser.

## Dashboard, paint library and Color Lab

The dark Dashboard rotates a paint recipe every ten minutes, links straight to that recipe and shows telemetry connection status. Navigation includes Color Library, Color Lab, Rare Cars, Tune Calculator and Telemetry.

Color Library contains **11,008 recipes**: 11,004 from the uploaded workbook (10,936 vehicle and 68 wheel) plus four labeled historical alternatives. Search and filter by manufacturer, finish, collection, favorites, color family and data quality. Original two-layer HSB cells, L/R markers, comments and provenance remain intact. Seven rows contain malformed or missing settings; they are flagged rather than repaired or omitted. The source audit is [public/import-report.json](public/import-report.json).

Add Color supports optional manufacturers, complete library finishes/custom finishes, one or two HSB layers, and optional L/R markers. Color Lab experiments can start from a valid library recipe or a blank experiment and save as personal colors. Paint previews use HSV approximations rather than game material rendering. Existing favorites and personal-color storage keys are preserved.

The pinned historical source, counts and remaining import work are documented in [data/RESEARCH.md](data/RESEARCH.md). The LabsGG main/community collections remain unimported because source access was blocked; no live Google paint sheet has been edited.

## Rare Cars and New entries

[KS21's FH6 Rare Car Sheet](https://docs.google.com/spreadsheets/d/1anCEWRN_SrteKIznuJLe8TrGXpVF-8vAUrNlb6nAFnM/edit?gid=1485355139#gid=1485355139) supplies **284 acquisition entries across ten categories** in the uploaded snapshot. A car may appear in several categories. Each spreadsheet category has a section with previews and a View all action; category buttons, search and the category filter open the full paginated lists. Unreleased classification notices use the standard neutral text styling. Source-row labels are hidden while internal audit metadata remains intact.

The **New** section shows entries first detected by this app within 30 days, with badges and first-seen dates. Those dates are not spreadsheet edit dates or in-game release dates. History survives restarts and updates. Changes to acquisition notes or row positions do not create a new identity; category/year/brand/model and special-livery title identify an entry. Removed/reappearing entries keep their original first-seen date. Model/category renames count as new identities. Old caches migrate as already known entries, preventing a blanket New collection after an app update. Separate installations may first detect additions at different times.

Opening Rare Cars checks Google Sheets. A visible, open app checks again every ten minutes after Rare Cars has first loaded, including an overdue check when returning to the page. **Refresh now** can check sooner, limited to one source request per 30 seconds. No synchronization runs after the app is closed.

The uploaded copy displays immediately. Successful whole-workbook imports update `rare-cars-cache.json` atomically. Network/access errors, malformed exports or changed/unrecognized tab headers retain the last good data and history. The page displays only **Last updated**, meaning the last successful check, or **Not available** before a successful check. Cache origin and refresh errors remain in `/api/rare-cars`.

Automatic refresh requires internet and a Google export accessible without sign-in. Live export could not be verified from this cloud environment (HTTP 403); the uploaded workbook is fully imported and refresh/failure/recovery paths are tested with fixtures. No credentials are embedded, no source permissions are changed, and the app never writes to the spreadsheet. Community availability, release dates and locations are retained as source claims.

“Use car in Tune Calculator” fills the car's name only. The acquisition sheet does not supply physics specifications or telemetry car ordinals.

## Tune Calculator and telemetry

Select **Drag**, **Track**, or **Drift** to expand its calculator; select the same card again to collapse it without losing inputs. Direct links preserve the discipline in `?tune=drag|track|drift#tuning`.

- **Drag:** user-confirmed FH6 venue distances, standard distances, launch control on/off, a bounded 1D simulator, final-drive/launch-RPM/shift-RPM/optional gear-spacing search, saved builds, and measured standing-start runs. Search candidates are model predictions; enter actual adjustment limits and validate on the strip. See [drag model and sources](docs/drag-model.md).
- **Track:** theoretical gearing speeds, inverse final-drive calculation, suspension-frequency/motion-ratio baselines, and saved setup export/load/delete. Damper coefficients are physical units, not a verified conversion to game sliders.
- **Drift:** working-RPM/gear/road-speed/wheel-overrun calculations and saved setups. This is a gearing worksheet rather than a lateral tire or drift-score model.

Competitive development records clean attempts, manually entered leaderboard targets and matching event/car/class/conditions/assists context. Drag also matches distance and launch-control state. Comparisons need three clean attempts per revision and show median, best and spread. Identical telemetry evidence cannot be counted repeatedly as independent attempts. Drift scoring is manual; track imports select completed captured laps. Results stay in browser storage, with JSON export. Observed improvements do not certify leaderboard ranks or guarantee a top-10 result.

The Windows shortcut enables a localhost UDP receiver on port **5300**. Enable the game's Data Out feature, if available, with destination `127.0.0.1:5300`. Compare decoded readings with the game before relying on tuning evidence. The decoder is community-cross-checked, but actual FH6 gameplay has not been validated here. Unit/browser data is synthetic. See [telemetry schema, sources and capture instructions](docs/telemetry.md) for setup, export/import units, decoder offsets and limitations.

## Develop from source

No runtime npm dependencies, database, API keys or frontend build step are required.

```sh
npm ci --ignore-scripts
npm run launch
# Stop the managed background app:
npm run stop
```

For foreground development, use `npm start` or `npm run dev`; keep that terminal open. These foreground commands default to port 3000 on all interfaces. Set `HOST=127.0.0.1` to restrict a local source run. The desktop launcher always binds HTTP and UDP to localhost. For a trusted LAN telemetry receiver, explicitly configure its LAN listener and follow the telemetry documentation; cloud preview access does not deliver game packets from your PC.

Headless launcher checks use `node launcher.js --no-open` and an explicit temporary `FORZA_GARAGE_STATE_DIR`. `FORZA_GARAGE_PORT` and `FORZA_GARAGE_UDP_PORT` override launcher ports. Normal foreground startup uses `HOST`, `PORT`, `TELEMETRY_ENABLED`, `TELEMETRY_HOST` and `TELEMETRY_PORT`.

### Data regeneration and audits

Python/openpyxl is needed only to regenerate/audit the paint data, not to run the installed app.

```sh
python3 -m pip install -r scripts/requirements.txt
python3 scripts/import_colors.py data/source.xlsx
python3 scripts/test_import_colors.py
node scripts/import-rare-cars.mjs
python3 scripts/test_rare_cars.py
npm test
```

Keep `data/source.xlsx`, `data/rare-cars-source.xlsx` and the pinned `data/sources/nickdupuis-colors.csv` for reproducibility. Importers preserve conflicting historical recipes separately rather than overwriting workbook rows.

### Browser and installer checks

Fourteen Playwright suites live in `scripts/`: `browser-smoke.cjs`, `garage-smoke.cjs`, `drag-smoke.cjs`, `workspace-smoke.cjs`, `competitive-smoke.cjs`, `rare-cars-smoke.cjs`, `release-smoke.cjs`, `dashboard-smoke.cjs`, `seasonal-smoke.cjs`, `telemetry-status-smoke.cjs`, `navigation-smoke.cjs`, `tuning-telemetry-smoke.cjs`, `drag-capture-smoke.cjs`, and `us-goal-smoke.cjs`. Start the app with telemetry enabled for capture/reset checks. Set `TEST_BASE_URL`, `PLAYWRIGHT_MODULE` and `CHROMIUM_PATH` for the local environment, then run each suite with Node. Tests cover real localhost HTTP/UDP and synthetic captures; Google refresh tests use source fixtures.

```sh
python3 -B scripts/build-windows-installer.py --fetch-runtime
python3 -B scripts/test_installer.py
```

The deterministic Windows installer and portable ZIP include a pinned official Node.js Windows x64 runtime, its complete redistribution license, app code, the generated catalogues and documentation, and exclude Git metadata, credentials, environment files, source workbooks, development dependencies and tests. It embeds its own archive with a SHA-256 corruption check; this is not a signing/authenticity claim. The installed version is checked by the launcher; a matching managed process is reused and unrelated applications are not stopped. Native PowerShell/shortcut activation still needs a Windows PC test.

Runtime provenance and pinned SHA-256 checksums are in `packaging/node-runtime.json`. The builder downloads only with `--fetch-runtime`, verifies the archive before use, and caches it under ignored `.cache/`. Subsequent builds work offline. The application does not need npm, so npm is not shipped. Rebuild both distribution files after app changes. Source developers still need Node.js 22+; end users do not.

Build 0.14.1 removes the brand subtitle, adds an offline SVG browser-tab icon, and compacts the desktop Dashboard. Desktop layouts are verified at 1280×720, 1366×768, 1440×900 and 1920×1080; small screens retain normal vertical flow for readability. Dashboard and Telemetry headings/status text turn green only while fresh decoded telemetry is being received, including an inactive game; stale/missing/unverified data and app disconnection clear the green state.

Build 0.14.2 keeps the Dashboard grid and expands its spacing/fonts vertically with viewport height. Its Seasonal arrivals carousel rotates every eight seconds with previous/next and pause controls (manual by default with reduced-motion preferences). It shows newly detected Seasonal entries from the previous seven days, excludes source-marked unreleased entries, and updates from the same cached/live Rare Cars source. First-seen dates do not establish a verified playlist schedule. An empty weekly list is displayed honestly, rather than substituting older cars.

Tuning fields and search bounds start empty, including benchmark context. Selecting a gear count creates empty ratio inputs. Calculations wait for required specifications; saved setups/attempts remain available and load only through explicit actions. Drag presets supply distance internally. Only Custom strip shows distance; named-strip and grade entry controls have been removed. Level ground is assumed. Saved preset/custom selections and intentionally blank inactive launch-RPM inputs are retained on explicit build loading. LC comparisons require both RPM values rather than inventing an unentered mode’s launch RPM.

Build 0.14.3 makes Dashboard/Telemetry headings and state text green for fresh decoded telemetry and orange otherwise. Packet arrival with rejected contents has an explicit orange “Packets arriving · data invalid” state. Detailed field checks and **Export packet diagnostics** explain rejections. Inactive zero-engine-limit frames are handled as connected/inactive data without creating driving samples; active data remains validated. See [telemetry troubleshooting](docs/telemetry.md#packets-arriving-but-data-invalid).

Build 0.14.4 removes section-level scrolling when opening Color Library; workspace navigation starts at the page top. The car widget now combines explicitly dated **Car Pass DLC** releases in the last seven calendar days with newly detected Seasonal-sheet entries in the last seven days, labelling release dates and detection dates separately. For example, the uploaded workbook lists the 2025 Ford Mustang GTD for 2026-11-05; it is included for 2026-11-07 even though the row was already in the baseline. Date-only entries do not establish an exact unlock hour or complete Festival Playlist coverage. Missing spreadsheet additions are never labelled as no new game cars. Official news access returned HTTP 403 in this cloud; an actual dated weekly playlist source is still needed for complete Thursday reward listings.

Build 0.14.5 bundles Node.js in both Windows distributions and adds portable Start/Stop launchers plus optional shortcut setup. No external Node installation or PATH configuration is needed.

Build 0.14.6 expands Telemetry to 89 packet parameters in nine groups, with units,
live/stale/unverified states and the in-game connection instructions. Diagnostic
controls, packet hex and the footer have been removed from the page. All known
fields are decoded from the supported 324-byte layout; the reserved final byte
is displayed as a raw value with unknown meaning. Invalid packets are excluded
from tuning and shown as unverified readings. The Windows packages still include
Node.js. Actual gameplay on the user's PC has not been validated here.

Build 0.14.7 makes the connection guide collapsible with vertical steps and adds
an offline setup document. Tune Calculator shows the active car's year, make and
model from a bundled 551-entry FH6 catalogue, reports unknown IDs without guessing,
and links to setup whenever usable telemetry is disconnected. It prefills car
names, drivetrain, starting RPM values and eligible observed engine maxima. Manual
edits take priority. Car/build changes isolate worksheets and clear old capture
and curve evidence; per-car manual worksheets remain in memory for this browser
session. Only the three named FH6 drag venues and Custom strip remain in the menu.
Telemetry does not provide mass, tire sizes, gear ratios or launch-control mode.
See [car identity sources and prefill behavior](docs/car-identities.md).

Build 0.15.0 reorganizes Drag around **Use a real run**, with Start countdown,
Stop capture, three-second 3–2–1 / green GO, and a separate drag buffer. After
launch, coming to a complete stop ends and freezes that drag run automatically.
Braking alone keeps it recording; general telemetry continues for other tools.
The worksheet separates Build Name / Car / Strip, manual powertrain values,
captured engine maxima/RPM, and advanced assumptions. Front weight distribution
is a percentage; displacement is optional liters; PWR is derived kW/tonne.
Manual power/torque are not overwritten by observed maxima; an explicit button
copies captured values into the model. Drag RPM fields may be entered manually.
The map-strip menu has shortened labels and separate FH6/saved-strip groups.
See [drag capture workflow](docs/drag-capture.md).

Build 0.15.1 defaults tuning and telemetry displays to US customary units: HP,
ft-lb, lb, mph, feet/inches, square feet, cubic inches and °F where applicable.
Unit conversion occurs at the UI boundary; physics, saved build fields and
telemetry JSON retain their existing canonical units. Existing builds load with
US values without changing their predicted results. Rounded display values keep
the original calculation precision until edited. The removed strip notes no
longer appear. **Start now** records at any speed and can arm before telemetry
arrives, without a strip; the countdown remains optional. Moving captures provide
engine evidence, and only an actually captured stationary launch can supply a
standing-start ET. Top-speed goal (mph) offers reviewable/applicable power-band
gearing suggestions and constrains the performance search's gearing ceiling.
See [US units and gearing goals](docs/us-units-gearing.md).
