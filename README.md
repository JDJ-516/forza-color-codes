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

## Forza Horizon 6 telemetry — packet monitor

The optional UDP receiver monitors actual incoming packets, packet count, byte length, the last reception time, and a bounded hex preview. It detects a lost signal after 3 seconds. **FH6's field layout has not been verified: speed, RPM, gear, lap times, and other game fields are not decoded.** Incoming packets do not prove a particular game or sender. There is no simulated telemetry.

Run on a computer on the same private network as the game:

```sh
TELEMETRY_ENABLED=1 TELEMETRY_HOST=0.0.0.0 TELEMETRY_PORT=5300 npm start
```

If FH6 offers a Data Out setting, set its destination to that computer's LAN IPv4 address, UDP port 5300 (or your chosen matching port). Allow inbound UDP only from your private network/game device in the computer's firewall. On Windows, set these environment variables in your shell using its native syntax before running `npm start`.

The receiver defaults to loopback (`127.0.0.1`) if `TELEMETRY_HOST` is omitted, and is disabled unless `TELEMETRY_ENABLED=1`. Errors are shown in the packet monitor. No packets are written to disk, and only the most recent packet's first 64 bytes are retained. The browser polls `/api/telemetry` once per second while visible. This endpoint has the same network accessibility as the app; there is no login. Making the GitHub repository private does not restrict access to a running app.

A cloud instance does not automatically receive UDP sent from an Xbox or PC on your home LAN. Use a local installation for the current receiver. A secure outbound relay would be additional work for a cloud-hosted dashboard. Never expose the UDP port publicly to make this work.

Decoded FH6 driving readings require its documented packet format or a representative packet captured from your own game, and validation against actual in-game readings. The selected platform is PC; see the Windows instructions below.

`npm test` includes a real local UDP send/receive test, checks the telemetry HTTP response, bounds packet inspection, and verifies stale/disabled states. This validates the receiver, not FH6 compatibility.

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

If FH6 exposes a compatible UDP Data Out feature, enable it and use destination IP `127.0.0.1` with port `5300`. The exact FH6 setting names and packet format have not been verified. Enter driving gameplay and check the app's Live telemetry panel: **Waiting for packets → Receiving UDP packets**. **Signal lost** means nothing has arrived for at least 3 seconds. Packet receipt validates transport only, not the FH6 field layout or decoded readings.

If it stays waiting, confirm that Data Out is available and enabled, the destination and port match, gameplay is active, and no other receiver is using UDP port 5300. Some Windows game installations restrict loopback traffic; do not disable the firewall or apply broad loopback exemptions. Identify the installed game version and its documented networking requirements before changing those settings. A separate receiver computer on your private LAN is another option using the LAN instructions above.

These PowerShell commands document the Windows equivalent of the environment-variable startup validated on Linux; Windows and an actual FH6 connection have not been tested in this environment.

### Easiest Windows launch

Extract the complete project ZIP first, then double-click `Start Forza.cmd` in the extracted folder. This launcher selects its own project directory, restricts both listeners to this PC, and starts the server directly with Node.js. No npm install is needed because this app has no external dependencies. Keep the launcher window open and browse to `http://127.0.0.1:3000` after it reports that the server is listening. Do not run the launcher inside the ZIP preview. The launcher has not been executed on Windows in this cloud environment.

For optional browser regression checks, `scripts/browser-smoke.cjs` uses Playwright (not a runtime dependency). Start the app first, then run the script with Playwright available through `require('playwright')` or the `PLAYWRIGHT_MODULE` environment variable. Optional `CHROMIUM_PATH` selects a system Chromium binary; otherwise use Playwright's installed Chromium. `TEST_BASE_URL` overrides the default local port 3000. The script uses an isolated browser context and synthetic personal recipes, never your normal browser profile.

Additional-source provenance and the research pass are documented in `data/RESEARCH.md`. The bundled `data/sources/nickdupuis-colors.csv` is the pinned historical snapshot used for the four alternatives. `public/import-report.json` records its commit, SHA-256, compared/skipped counts, and conflicts. Reimports use only retained local snapshots and require no external network access. Broader community research is incomplete because those sites were blocked by the cloud network policy; saved proposed allowances still need application through environment settings.

## Garage: color lab and tuning bench

The app now opens on a garage dashboard with dedicated Color library, Color lab, Tuning, and Telemetry workspaces. Existing favorites and personal colors retain their original local-storage keys and remain available on the same browser origin. New setup records use `fcc-tunes` in local storage.

**Color lab:** open a valid library recipe and select **Experiment in color lab**, or start a fresh experiment. Adjust HSB sliders/numeric inputs, change a hex preview color, enable a second layer, reset to the starting experiment, and save the result as a personal color. Original library recipes are never modified. L/R source markers remain in the original recipe; numeric experiments generate new personal settings without those markers. Previews use standard HSV and a decorative two-color gradient, not Forza's physical paint rendering. Malformed source recipes must be reviewed before they can initialize an experiment. Existing imported multi-layer recipes and new personal multi-layer colors copy both layers.

**Gearing:** enter tire width/aspect/rim diameter for the driven wheels, shift RPM, final drive, and 4–10 descending gear ratios. Results show theoretical km/h and mph at shift RPM, RPM after each upshift, and the final drive that mathematically reaches the target speed at the selected RPM. Engine power, drag, slip, loaded tire radius, and game-specific physics are not modeled. A gearing-limited speed is not an achievable top-speed prediction; the calculator does not claim an optimized Forza tune.

**Suspension:** enter vehicle mass, front weight percentage, unsprung mass per wheel, desired front/rear ride frequencies, spring/damper motion ratios (spring or damper travel divided by wheel travel), and damping ratio. The worksheet computes sprung corner mass, wheel rates, spring rates in N/mm and lb/in, and idealized damper coefficients in N·s/m. Motion ratio enters as its square. Tire stiffness, aero loading, bump stops, nonlinear suspension, and game slider mappings are not modeled. Default frequencies and motion ratios are editable examples, not recommendations for a particular car. There is no conversion to Forza bump/rebound sliders or claimed anti-roll/alignment/differential tune.

Name a car/build and save the combined setup. Saved setups can be loaded, deleted, or exported as JSON through the browser. They are not synced between devices; clearing browser storage removes them. JSON export is provided; importing JSON is not currently implemented.

`npm test` includes calculator dimensional checks, inverse gearing calculations, color roundtrips, invalid-input cases, and spring/motion-ratio/damping tests. Optional `scripts/garage-smoke.cjs` (same Playwright selectors as `scripts/browser-smoke.cjs`) checks workspace navigation, imported and personal two-layer experiments, persistence, malformed-source guards, both calculator outputs, setup export/load/delete, and mobile layouts.

### LabsGG import status

The requested main and community paint collections at `https://forza.labsgg.com/forza-horizon-6/paint` and `https://forza.labsgg.com/forza-horizon-6/paint?tab=community` are not imported yet. Both were blocked by the cloud network proxy before page content could be inspected. A proposed `forza.labsgg.com` allowance was saved; it must be applied through environment settings before retrying. A user-supplied export is another way to supply the data. The catalogue remains at 11,008 recipes and the workbook has not been changed from these sources. The live Google Sheet has not been edited. See `data/RESEARCH.md` for details and the remaining import steps.
