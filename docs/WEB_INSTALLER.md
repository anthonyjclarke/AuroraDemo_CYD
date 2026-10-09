# Web installer – AuroraDemo_CYD

The installer at <https://anthonyjclarke.github.io/AuroraDemo_CYD/> is built
by the shared [cyd-web-installer](https://github.com/anthonyjclarke/cyd-web-installer)
workflow from `.github/workflows/firmware.yml`. Two boards are offered:
`esp32-cyd-28` (CYD 2.8″) and `esp32-cyd-40` (CYD 4.0″).

The demo has no WiFi, no settings and no OTA. It has no Improv, so the
installer can't identify a running board and always offers **Install**, never
**Update**. Erasing loses nothing.

---

## Smoke test (RUNBOOK 5a)

| Date       | Board          | MAC                 | Result |
|:-----------|:---------------|:--------------------|:-------|
| 09-10-2026 | CYD 2.8″ S028R | `b0:cb:d8:da:ae:8c` | Pass   |

CI run 37894402547 was green for both envs (FastLED 3.10.3, four-part
manifests). The 2.8″ was erased with `pio run -t erase`, then installed from
the CI preview (`0.7.0-dev`) in macOS Chrome with erase. It booted to the demo
and logged `Running from app0`. Patterns rotated, and a 30 s serial capture
showed no panic or watchdog reset. The WiFi step and the Connect check don't
apply (no Improv). The 4.0″ relies on CI alone.

---

## Release v0.7.0 (09-10-2026)

Release run 37895570983 published the GitHub release (firmware and merged
images for both boards, plus `SHA256SUMS.txt`) and deployed Pages. The live
page loads, `index.json` and both manifests say `0.7.0` with four parts, and
every part is served from Pages. The same 2.8″ (`b0:cb:d8:da:ae:8c`) was
installed from the live page in macOS Chrome. It was offered **Install**, as
expected with no Improv, booted `v0.7.0` on `app0`, and ran patterns with no
panic.

---

## Tests owed

Smoke-tested only. Run these on the next real work on this project, or before
the next release, and tick them off with date and board MAC.

- [ ] Case 1 – fresh install, erased, on each remaining board (4.0″)
- [ ] Case 2 – Update on a provisioned board (settings kept) – N/A: no Improv, so Update is never offered
- [ ] Case 3 – Update from `app1` (only if the project has OTA) – N/A: no OTA
- [x] Case 4 – wrong board image, then reinstall (multi-env only) – Pass
  09-10-2026, 2.8″ `b0:cb:d8:da:ae:8c`. The live v0.7.0 4.0″ parts were
  written at the installer's four offsets with no erase. The board booted,
  reported a 4.0″ on `app0`, ran patterns and didn't crash. Writing the 2.8″
  parts back restored it on `app0`. Checked over serial; the screen wasn't
  inspected (a dark screen is expected – backlight GPIO 27 vs 21).
