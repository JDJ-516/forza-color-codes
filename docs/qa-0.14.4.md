# Build 0.14.4 QA

## Changes

- Removed the Color Library section-level scrollIntoView call. Workspace navigation resets to the page top, preserving the header instead of scrolling it partly away. Explicit pagination and saved-setup scrolling remain intentional actions.
- Clarified the car widget's source: spreadsheet edits are not Thursday game releases. Empty and unavailable states no longer assert that the game has no new seasonal cars.
- Added explicitly dated Car Pass DLC entries from the previous seven calendar days alongside first-detected Seasonal entries. Dated releases do not depend on first-seen timestamps, so already-listed upcoming cars can appear when their listed date enters the window. Dates and category are labeled separately from sheet-addition detection.
- Verified the actual uploaded sheet's 2025 Ford Mustang GTD record has release date 2026-11-05 and appears for a 2026-11-07 test date. Earlier 2026-10-29 entries are excluded. Future/invalid dates and source-marked unreleased entries are not promoted as current releases.
- Added plain-language Telemetry help separating currently captured channels, analyses, optional fields that could be implemented, and unavailable tuning/release information.

## Checks

- 44 Node tests passed.
- Six browser suites passed: navigation, Seasonal carousel/empty forms, workspace, release/responsive/storage, Dashboard, and paint-library regression.
- New navigation test checks scrollY and the header position after Color Library opens on desktop and mobile, after returning from a scrolled page, and via Explore.
- The real workbook drives the dated-release browser fixture. Car Pass category navigation, honest empty-state text and telemetry help are checked.
- Existing carousel rotation, pause, expiry/failure and saved-build behaviors remain covered.
- Installer checksum/content/extracted app lifecycle, JavaScript syntax and whitespace checks.

## Source limits

This is not a complete Festival Playlist integration. The Seasonal tab has no week/season dates. Car Pass entries provide useful explicit release dates but do not cover every Thursday reward or every player's availability. A dated weekly playlist/news feed is still needed for complete coverage. The official Forza news request returned HTTP 403 from this cloud. The date-only source does not establish an unlock hour or independently verify an in-game release. Native Windows and actual FH6 gameplay validation remain PC tasks.
