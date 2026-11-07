# Build 0.14.1 QA

Changes: removed the brand/browser-title subtitle; restored neutral unreleased-car notices; added the SVG browser-tab icon; compacted the desktop Dashboard without hiding its content; and added green connection text to Dashboard and Telemetry headings/status badges only while receiving fresh decoded data. Fresh inactive-game data remains connected. Stale, invalid/raw-only, stopped/error states and HTTP failures clear the green indication and show the appropriate state.

Verified:

- 37 Node tests, including the new icon's HTTP asset route.
- Four browser suites: Dashboard, workspace, Rare Cars and release regression checks.
- No Dashboard scrolling at 1280×720, 1366×768, 1440×900 and 1920×1080, using the longest two-layer library recipe. Mobile layouts retain normal scrolling for readability; nothing is clipped to force a fit.
- Favicon link, SVG content type, successful image decoding and inclusion in the extracted installer bundle.
- Active/inactive telemetry connections are green; stale/waiting/disabled/error, raw-only packets and app disconnection are not green. Simulated connection states are explicit test fixtures.
- Existing desktop/mobile navigation, category/New filters, refresh/cached fallback, dialogs and invalid browser-storage recovery.
- Installer checksum/content and extracted-app start/stop lifecycle checks.

See [0.14.0 baseline QA](qa-0.14.0.md) for the preceding full seven-suite browser pass and source-workbook audits. Native Windows installation/shortcut activation and actual FH6 gameplay remain PC validation tasks. Live Google Sheets access is not established by the fixture-based refresh tests.
