# Forza Garage — Paint & Tune

A responsive, self-contained Forza paint library with 11,008 recipes: 11,004 from the user-supplied Forza Colour Sheet (Est. 2019) (10,936 vehicle and 68 wheel), plus four explicitly labeled historical community alternatives. Search names, manufacturers, and notes; filter by collection, paint type, approximate color family, and review status; browse 48 results per page; copy full two-layer recipes; save favorites; and add personal recipes.

## Run

Requires Node.js 22 or later (validated with Node.js 24). No external packages, database, API keys, or build step are required.

```sh
cd /workspace/forza-color-codes
npm ci --ignore-scripts
npm start
```

The server uses port 3000 and binds to all interfaces. Override with `PORT` and `HOST` if needed. Use `npm run dev` for Node's server file watcher; refresh the browser after frontend edits. Tests: `npm test`.

## Project layout

- `server.js`: HTTP server with an explicit static asset allowlist and security headers.
- `public/index.html`, `public/styles.css`, `public/app.js`: accessible native browser UI, responsive styling, and interactions.
- `public/catalogue.json`: all 11,004 spreadsheet recipes plus four historical alternatives, with raw layers, notes, source references, and review flags.
- `public/data.js`, `public/import-report.json`: source metadata, workbook SHA-256, row counts, and the seven rows needing review.
- `public/recipe.js`: shared recipe formatting that preserves raw L/R markers.
- `data/source.xlsx`: original uploaded workbook, retained for reproducibility.
- `scripts/import_colors.py`: deterministic importer, requiring Python and `scripts/requirements.txt` only when refreshing the catalogue.
- `test/`: HTTP, catalogue, recipe-copying, and UDP receiver checks.

## Data and scope

The bundled catalogue imports every nonblank recipe row from both workbook tabs. Four historical recipes from a pinned public GTPlanet mirror are appended without altering the workbook rows. Three are same-name alternatives and one is a name absent from the workbook; they may be outdated or superseded. Use the Historical alternatives filter to view them. Each includes a source link and warning, also included when copying. See `data/RESEARCH.md` for examined sources and remaining network blockers.

Original paint types, Color 1 (X), Color 2 (Y), L/R slider markers, comments, and source row numbers are retained. Seven rows have 12 malformed or absent settings; they remain searchable and are explicitly flagged. No guessed corrections are made. See `public/import-report.json` for details. Blank formatting rows are skipped; named recipes such as `--` remain exactly represented.

Color-family filters and hex previews are derived from standard HSV using Color 1; they approximate neither the second layer nor game materials and lighting. If Color 1 cannot be parsed, a neutral placeholder is used with the `Unknown` family. Copying and recipe details use the original cell text rather than derived preview values. The old 12 illustrative starter entries have been removed; existing personal recipes in local storage are retained. Favorites of removed illustrative entries no longer appear.

Source: [Forza Colour Sheet (Est. 2019)](https://docs.google.com/spreadsheets/d/1wLXN4PusGWD7zcpLiS-uizYm6iZc2WM1EbBMurlAlj4/edit). These are community recipes; no independent in-game verification is claimed. The workbook does not explicitly identify FH6-specific additions. No unverified FH6 collection has been invented or merged. The bundled workbook is a static snapshot, not a live sync.

Personal recipes and favorites use this origin's browser local storage. They are not shared between users, browsers, or devices, and clearing browser data removes them. The UI reports storage failures. There is no account system or online submission service. An independent fan project, unaffiliated with Forza or vehicle manufacturers.

## Validation

`npm test` exercises real HTTP requests and assets, HEAD requests, unknown paths, rejected write methods, all catalogue counts and identities, source-review flags, raw two-layer copying, and real UDP receipt/stale/disabled states. Chromium validation also exercises full-catalogue pagination, wheel/material filters, searching comments, copied raw values, malformed/missing-value warnings, favorite persistence across reloads, custom recipes, catalogue-load failures, and the 390px mobile layout.

To refresh or audit the import (development only):

```sh
python -m pip install -r scripts/requirements.txt
python scripts/import_colors.py data/source.xlsx
python scripts/test_import_colors.py
npm test
```

The Python audit compares every nonblank workbook row and all six raw recipe cells plus notes against the generated catalogue, and checks that regeneration of the workbook plus the pinned historical CSV matches the bundled files. The historical merge skips matching recipes and preserves conflicting versions with separate IDs and source warnings. IDs are based on source content, with duplicate occurrence suffixes; identical reimports preserve imported favorite IDs. Changing a recipe's content produces a new ID. Normal app startup does not require Python or a connection to Google Sheets.

In environments with a restricted command sandbox, starting servers, running HTTP tests, and launching Chromium may require the platform's supported elevated execution mode for local socket access.

## Deployment

Run `npm ci --ignore-scripts` and `npm start` on a Node-capable host, with its assigned `PORT`. There is no build output to generate. Serve through HTTPS for clipboard support outside localhost. Alternatively host the contents of `public/` at the root of a static site. Deployment and a public URL have not been configured.

## Forza Horizon 6 telemetry — decoder and drag capture

The optional local UDP receiver now decodes the community-cross-checked 324-byte Horizon layout, rejects implausible packets, and retains bounded active driving captures. It exposes speed/RPM, engine power, inputs and wheel channels for measured drag analysis. **Actual FH6 validation on the gaming PC remains required**; automated checks use synthetic fixtures and real local UDP, not an actual game capture. See [telemetry documentation](docs/telemetry.md) for pinned sources, offsets, exact import units, and limitations.

Use `Start Forza.cmd` on the gaming PC, or the PowerShell commands below. If using a separate receiver on the same trusted private LAN, explicitly set `TELEMETRY_HOST` to its LAN listener and point the game to that machine's LAN IP, matching UDP port 5300. Restrict firewall access to the private network; do not expose UDP publicly. A cloud task does not automatically receive traffic from the gaming PC.

The receiver is disabled unless `TELEMETRY_ENABLED=1`, and defaults to loopback if `TELEMETRY_HOST` is omitted. Changing cars or clicking Start fresh capture clears the bounded buffer. Server restart loses it. Export capture JSON before closing if needed. No raw game packets are stored on disk. Browser session imports accept the documented JSON schema, not arbitrary CSV formats. GitHub repository privacy is separate from access to a running app; there is no account/login system.

### Windows PC setup (game and app on the same computer)

Install Node.js 22 or later and open PowerShell in this project folder. Run:

```powershell
npm ci --ignore-scripts
$env:HOST = "127.0.0.1"
$env:TELEMETRY_ENABLED = "1"
$env:TELEMETRY_HOST = "127.0.0.1"
$env:TELEMETRY_PORT = "5300"
npm start
```

Open your local browser at `http://127.0.0.1:3000`. Keep PowerShell running; stop the server with Ctrl+C. Both listeners in this configuration are restricted to this computer. No router port forwarding is needed.

Enable the game’s UDP Data Out feature, if available in the installed build, and use destination IP `127.0.0.1` with port `5300`. The community packet layout is cross-checked; verify actual decoded speed and RPM against your installed game. Enter driving gameplay and check the app's Live telemetry panel: **Waiting for packets → Receiving UDP packets**. **Signal lost** means nothing has arrived for at least 3 seconds. Packet receipt validates transport only; compare decoded readings against the game before trusting analysis.

If it stays waiting, confirm that Data Out is available and enabled, the destination and port match, gameplay is active, and no other receiver is using UDP port 5300. Some Windows game installations restrict loopback traffic; do not disable the firewall or apply broad loopback exemptions. Identify the installed game version and its documented networking requirements before changing those settings. A separate receiver computer on your private LAN is another option using the LAN instructions above.

These PowerShell commands document the Windows equivalent of the environment-variable startup validated on Linux; Windows and an actual FH6 connection have not been tested in this environment.

### Easiest Windows launch

Extract the complete project ZIP first, then double-click `Start Forza.cmd` in the extracted folder. This launcher selects its own project directory, restricts both listeners to this PC, and starts the server directly with Node.js. No npm install is needed because this app has no external dependencies. Keep the launcher window open and browse to `http://127.0.0.1:3000` after it reports that the server is listening. Do not run the launcher inside the ZIP preview. The launcher has not been executed on Windows in this cloud environment.

For optional browser regression checks, `scripts/browser-smoke.cjs` uses Playwright (not a runtime dependency). Start the app first, then run the script with Playwright available through `require('playwright')` or the `PLAYWRIGHT_MODULE` environment variable. Optional `CHROMIUM_PATH` selects a system Chromium binary; otherwise use Playwright's installed Chromium. `TEST_BASE_URL` overrides the default local port 3000. The script uses an isolated browser context and synthetic personal recipes, never your normal browser profile.

Additional-source provenance and the research pass are documented in `data/RESEARCH.md`. The bundled `data/sources/nickdupuis-colors.csv` is the pinned historical snapshot used for the four alternatives. `public/import-report.json` records its commit, SHA-256, compared/skipped counts, and conflicts. Reimports use only retained local snapshots and require no external network access. Broader community research is incomplete because those sites were blocked by the cloud network policy; saved proposed allowances still need application through environment settings.

## Garage: color lab and tuning bench

The app opens on a permanently dark garage dashboard with Color Library, Color Lab, Tune Calculator, and Telemetry workspaces. Existing favorites and personal colors retain their original local-storage keys and remain available on the same browser origin. New setup records use `fcc-tunes` in local storage.

**Color lab:** open a valid library recipe and select **Experiment in color lab**, or start a fresh experiment. Adjust HSB sliders/numeric inputs, change a hex preview color, enable a second layer, reset to the starting experiment, and save the result as a personal color. Original library recipes are never modified. L/R source markers remain in the original recipe; numeric experiments generate new personal settings without those markers. Previews use standard HSV and a decorative two-color gradient, not Forza's physical paint rendering. Malformed source recipes must be reviewed before they can initialize an experiment. Existing imported multi-layer recipes and new personal multi-layer colors copy both layers.

**Gearing:** enter tire width/aspect/rim diameter for the driven wheels, shift RPM, final drive, and 4–10 descending gear ratios. Results show theoretical km/h and mph at shift RPM, RPM after each upshift, and the final drive that mathematically reaches the target speed at the selected RPM. Engine power, drag, slip, loaded tire radius, and game-specific physics are not modeled. A gearing-limited speed is not an achievable top-speed prediction; the calculator does not claim an optimized Forza tune.

**Suspension:** enter vehicle mass, front weight percentage, unsprung mass per wheel, desired front/rear ride frequencies, spring/damper motion ratios (spring or damper travel divided by wheel travel), and damping ratio. The worksheet computes sprung corner mass, wheel rates, spring rates in N/mm and lb/in, and idealized damper coefficients in N·s/m. Motion ratio enters as its square. Tire stiffness, aero loading, bump stops, nonlinear suspension, and game slider mappings are not modeled. Default frequencies and motion ratios are editable examples, not recommendations for a particular car. There is no conversion to Forza bump/rebound sliders or claimed anti-roll/alignment/differential tune.

Name a car/build and save the combined setup. Saved setups can be loaded, deleted, or exported as JSON through the browser. They are not synced between devices; clearing browser storage removes them. JSON export is provided; importing JSON is not currently implemented.

`npm test` includes calculator dimensional checks, inverse gearing calculations, color roundtrips, invalid-input cases, and spring/motion-ratio/damping tests. Optional `scripts/garage-smoke.cjs` (same Playwright selectors as `scripts/browser-smoke.cjs`) checks workspace navigation, imported and personal two-layer experiments, persistence, malformed-source guards, both calculator outputs, setup export/load/delete, and mobile layouts.

### LabsGG import status

The requested main and community paint collections at `https://forza.labsgg.com/forza-horizon-6/paint` and `https://forza.labsgg.com/forza-horizon-6/paint?tab=community` are not imported yet. Both were blocked by the cloud network proxy before page content could be inspected. A proposed `forza.labsgg.com` allowance was saved; it must be applied through environment settings before retrying. A user-supplied export is another way to supply the data. The catalogue remains at 11,008 recipes and the workbook has not been changed from these sources. The live Google Sheet has not been edited. See `data/RESEARCH.md` for details and the remaining import steps.

## Drag racing workflow

Tune Calculator opens with Drag, Track, and Drift choices, revealing a calculator only after selection. It includes the three user-provided FH6 strip profiles (Irakawa **321.869 m**, Ito **804.672 m**, Festival **965.606 m**) and separate standard 1/8-, 1/4-, 1/2-, and 1-mile distances. The first and third distances reflect the user's explicit clarifications, not a quarter-mile or a literal kilometer. Venue details remain user-provided, not independently map-verified. Other named measured strips and grades can be saved.

Without telemetry, enter the actual build's mass, power/torque approximation, drivetrain, tire dimensions, traction/aero assumptions, gearing, launch mode/RPM and shift interruption. Results include ET, 0–60 mph, split times and instantaneous finish speed. LC on/off comparison uses different declared launch RPMs without a hidden grip bonus. The finite final-drive/launch-RPM search offers model candidates for explicit application; it does not claim a global optimum or verified game adjustment limits.

With telemetry: start a fresh capture, stay stationary for at least 0.5 s, launch in first gear and drive through the selected finish. Analyze the live capture or import an exported session JSON. ET starts at the interpolated 1 km/h crossing; reaction time and one-foot rollout are excluded. This timing convention is not asserted to match the FH6 scoreboard. Label LC mode manually. Opt into measured engine-power bins only for the same car/build; uncovered RPM ranges retain the manual model. Review observed engine-limit/shift evidence, save measured summaries and compare equivalent-distance runs from the same known car. Build/weather/assists and driver differences still need manual control.

See [drag model and strip sources](docs/drag-model.md) and [telemetry schema and capture instructions](docs/telemetry.md). Drag builds, named strips, and run summaries have separate local-storage keys, preserving existing color favorites and road setups. The general road gearing/suspension worksheets are available under Track and use independent inputs. This app is a model-and-test workflow, not a claim to reproduce FH6 physics or deliver the best possible tune without game validation.

Optional `scripts/drag-smoke.cjs` uses the same Playwright environment selectors as the other browser suites. It tests venue selection, standard distances, launch modes, model search, build persistence, telemetry imports/live analysis, measured comparisons, capture reset/export and mobile layout. Synthetic test data lives only under `test-support/` and tests; it is never substituted for missing live data.

The LabsGG paint import remains blocked by the cloud network policy. Clicking View paint recipe still requires page access; neither requested collection nor the workbook has been altered from those inaccessible sources. The saved allowance needs to be applied through environment settings, or the source data supplied as exports.

## Home, library, and calculator navigation

Dark mode is permanent, including native controls and dialogs, regardless of the device color preference. Paint swatches retain their actual preview colors.

The home page shows a random eligible color and its original HSB recipe (both layers when present), with a direct recipe hyperlink. The selection lasts ten minutes, survives reloads using `fcc-featured-color`, and rotates to a different eligible recipe when possible. Backgrounded pages check the deadline again when brought into view. Malformed and explicitly historical source entries are excluded from the rotating feature. The preview remains approximate. Recipe URLs use `?recipe=<id>#library`, work on direct reload, and clear the recipe parameter when the dialog closes.

The home telemetry card uses the existing local endpoint and distinguishes disabled, waiting, raw-but-undecoded, live, inactive, lost-signal, and app-disconnected states. No connection or sample data is invented. Server-side decoded age avoids relying on synchronized browser/server wall clocks.

Favorites are a Color Library filter, not a separate header tab. Existing favorites retain their `fcc-favorites` key. Add Color now lists all supported library finishes (plus an Other/custom finish field) and manufacturer choices from the catalogue/personal collection. Manufacturer is optional, with a blank choice and an Other/custom option. Layered finishes automatically require Color 1 (X) and Color 2 (Y); other finishes can optionally include a second layer. HSB values and optional L/R markers are saved and copied for both layers. `N/A` source placeholders are not offered as paint finishes. Missing manufacturers remain empty rather than being assigned a fake brand.

Tune Calculator initially presents three choices:

- **Drag:** the existing strip, launch-control, simulation/search, and measured-run workflow.
- **Track:** the existing gearing and suspension-frequency worksheets and saved setups.
- **Drift:** a gearing worksheet for a chosen engine RPM, working gear, road speed, and wheel-speed overrun, with save/load/delete/export via `fcc-drift-setups`. It solves final drive and displays road speeds/RPM by gear; it is not a lateral tire model or a game-verified alignment/differential tune.

Selecting a discipline reveals its calculator and preserves the selection in `?tune=drag|track|drift#tuning`. Existing drag builds and track setups are retained. Drift input/output units and assumptions are displayed. Optional `scripts/workspace-smoke.cjs` tests light-device/dark-app behavior, a precise ten-minute deadline with a controlled clock, direct recipe links/reloads, home connection states, Favorites filtering, optional manufacturers, finish/layer completeness, drift setup persistence/export, and mobile modal overflow.
