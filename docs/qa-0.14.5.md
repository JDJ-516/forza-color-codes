# Build 0.14.5 — standalone Windows distribution

The portable Windows x64 ZIP and single-file installer both include the official
Node.js v26.13.0 executable and its complete license. SHA-256 pins for the official
release archive and executable are in packaging/node-runtime.json. Builds reject
mismatching archives. No credentials, workbooks, Git metadata or developer tools
are packaged. npm is unnecessary for this dependency-free app and is not shipped.

Start/Stop use the bundled runtime by absolute path. Setup stops the matching
managed instance, copies the app and runtime into the per-user install folder,
then creates shortcuts referencing the installed runtime, never a temporary path.
No admin privileges or runtime downloads are needed. Existing browser storage and
managed runtime paths remain unchanged. Windows 10/11 x64 is the supported target.

Results: all 44 Node regression tests and both packaging tests pass.

Validation: archive checksum and deterministic regeneration; packaged PE x64
header, executable hash, license and launcher paths; extracted app starts, serves
its assets and stops using the Linux host runtime; existing Node regression suite.
Native Windows CMD/PowerShell, shortcut activation, antivirus/SmartScreen behavior
and actual gameplay cannot be validated in this Linux environment. The installer
has an integrity checksum, not a publisher code signature.

See qa-0.14.4.md for prior UI and gameplay/data limitations, which still apply.
