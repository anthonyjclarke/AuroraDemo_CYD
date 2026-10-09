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

| Date | Board | MAC | Result |
|:-----|:------|:----|:-------|
| –    | –     | –   | Pending |

Applicable steps: CI green for both envs; erase the board, fresh install from
the CI preview with erase, boots to the demo, logs `Running from app0`, no
crash. The WiFi step and the Connect check don't apply (no Improv).

---

## Tests owed

Smoke-tested only. Run these on the next real work on this project, or before
the next release, and tick them off with date and board MAC.

- [ ] Case 1 – fresh install, erased, on each remaining board
- [ ] Case 2 – Update on a provisioned board (settings kept) – N/A: no Improv, so Update is never offered
- [ ] Case 3 – Update from `app1` (only if the project has OTA) – N/A: no OTA
- [ ] Case 4 – wrong board image, then reinstall (multi-env only)
