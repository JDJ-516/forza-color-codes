# Forza Color Codes

A responsive, self-contained paint inspiration library for Forza players. Search by color or manufacturer, filter by color family and finish, sort the collection, open HSB paint recipes, copy recipes, save favorites, and add or delete personal recipes.

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
- `public/data.js`: 12 clearly labeled illustrative starter recipes.
- `test/server.test.js`: server behavior and starter data checks.

## Data and scope

Starter recipes are illustrative approximations, **not verified Forza settings or exact factory paint matches**. HSB values range from 0 to 1. Metallic recipes describe a base color only; additional metallic settings need in-game tuning. Preview swatches are approximations and can differ from in-game rendering. Replace starter data with independently verified recipes as available.

Personal recipes and favorites use this origin's browser local storage. They are not shared between users, browsers, or devices, and clearing browser data removes them. The UI reports storage failures. There is no account system or online submission service. An independent fan project, unaffiliated with Forza or vehicle manufacturers.

## Validation

`npm test` exercises real HTTP requests, assets, HEAD requests, unknown paths, rejected write methods, and sample data integrity. Chromium smoke validation also exercised search, combined filters, sorting, favorite persistence across reloads, custom recipe creation/persistence/deletion, safe rendering of user-entered text, dialogs, and a 390px mobile layout without horizontal overflow.

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
