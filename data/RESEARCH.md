# Additional paint recipe research — 2026-11-05

This is a bounded research pass, not an exhaustive inventory of all Forza recipes online. The original uploaded workbook's 11,004 rows remain unchanged. No FH6 compatibility is inferred from a repository's name or README.

## Sources examined

| Source | Result |
| --- | --- |
| [nickdupuis/forza-paint-code-picker](https://github.com/nickdupuis/forza-paint-code-picker), commit `b2825d88a48f34ea459e3100f76eeb5162b8d7b1`, `colorsheet.csv` | 10,936 vehicle recipes; no additional paint recipes compared with the uploaded workbook. Six comments differed only in numeric formatting. |
| Same revision, [`util/data/forza-colors.csv`](https://github.com/nickdupuis/forza-paint-code-picker/blob/b2825d88a48f34ea459e3100f76eeb5162b8d7b1/util/data/forza-colors.csv) | Older snapshot: 10,899 rows compared; 10,895 matching recipes skipped; four historical alternatives retained with explicit warnings. The project credits GTPlanet's Colour Creation Database. |
| [DxBang/forza-colors](https://github.com/DxBang/forza-colors), commit `7d5db3b8dd57fe50349856a03f42d2e90e43bcde` | Color conversion/photo-sampling tool, not an additional named paint-recipe dataset. No imports. |
| [LeoAguado36/FORZA-COLORS](https://github.com/LeoAguado36/FORZA-COLORS), commit `43bc42e12e27c11ee4e8f877060d3a5dbd2254d7` | Color converter; includes dummy Pantone conversion. No additional named recipes imported. |
| [TheAdmiester/ForzaColourDumper](https://github.com/TheAdmiester/ForzaColourDumper), commit `716e117854ded0e7befdab6e6a15f50d6c67a068` | Extraction utility requiring game assets; no bundled recipe dataset. No imports and no game assets extracted. |
| [Lombax1857/Forza-Color](https://github.com/Lombax1857/Forza-Color), commit `27e6726f160de56f50c9f2b95cacdf9d671460a5` | Seed data explicitly drawn from a sheet, using hex previews; FH6 roster is vehicle information, not new HSB recipes. No imports. |

GitHub repository search included `forza paint`, `forza colors`, `forza colour`, `forza color`, `forza paint codes`, `forza paint database`, `forza colour database`, and `forza colors spreadsheet`. Image/livery generators, graphics mods, and telemetry-color tools were not treated as paint-recipe sources.

## Four retained historical alternatives

| Manufacturer | Name | Status |
| --- | --- | --- |
| Acura | Tiger Eye Pearl | Historical settings differ from current workbook entry; both retained. |
| Chevrolet | Cyber Gray Metallic | Historical settings differ from current workbook entry; both retained. |
| Honda | Meteorite Grey Metallic | Historical settings differ from current workbook entry; both retained. |
| Toyota | Lunar Rock Pearl | Absent under this name from current workbook; may be renamed or superseded. Current Toyota Lunar Rock (Normal) remains. |

These are not four newly verified/current colors: one is a new name in this catalogue and three are alternative historical recipes. None was tested in-game. The app labels them as historical alternatives, links to the pinned source, preserves raw slider text, and includes the warning in copied recipes. Use the Data quality filter to isolate them.

The CSV snapshot is retained at `data/sources/nickdupuis-colors.csv`; its SHA-256, compared counts, source record numbers, and conflicts appear in `public/import-report.json`. The importer compares manufacturer, color name, paint type, and all six raw settings after normalizing case and whitespace. It does not remove L/R markers or merge differing values. Workbook IDs and contents remain intact.

## Blocked research and remaining work

The cloud's enforced HTTP proxy denied CONNECT access (403) to `www.gtplanet.net`, `www.bing.com`, `forums.forza.net`, and `www.reddit.com`. Thus the linked GTPlanet thread, broader web search, the Forza forum, and Reddit have not been researched in this pass. This is a network restriction, not evidence that those sources lack additional recipes.

Proposed allowances were saved in the environment draft, preserving existing `docs.google.com` access requirements. They are not active merely because the draft was saved. Review/save the proposed network settings and publish the environment as required by the environment UI, then retry the sources. Additional redirect hosts may need diagnosis if subsequently encountered. No recipe completeness or verified FH6 collection is claimed.

## Requested LabsGG FH6 sources — pending access

User-requested collections:

- https://forza.labsgg.com/forza-horizon-6/paint
- https://forza.labsgg.com/forza-horizon-6/paint?tab=community

Both requests failed at the cloud proxy's CONNECT step with 403 Forbidden, before any page content could be read. `forza.labsgg.com` was added to the configuration draft's proposed network allowances while preserving existing entries. A draft save does not apply that allowance to this running environment. No LabsGG recipes, counts, author attributions, or game verification claims have been fabricated or added. The original workbook, live Google Sheet, and bundled catalogue have not been updated from these blocked pages.

Next: apply the proposed allowance through environment settings, then retry both URLs, inspect pagination and any public data endpoints actually referenced by the site, and compare all downloaded records against the current recipe fingerprints. Retain author/source links, paint types, all layers, slider markers, and conflicting versions. Add only real sourced records; distinguish main and community collections. Alternatively the user can supply exports of both collections. Updating the live Google Sheet additionally needs a supported editing connection; the retained local workbook can be updated once the source data is available.
