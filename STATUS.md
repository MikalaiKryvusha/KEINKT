# STATUS — KEINKT

Updated 2026-11-08 10:35 UTC. Until now KEINKT was developed from the owner's laptop as a side thread of the reader workspace
(`~/Xteink`), driven by an agent of an unrelated work project. From now on it is a standalone project.

## Language contract

- Documents the agent reads (this file, plans, researches, code comments, commit messages) — **English**.
- Every word to the owner — chat, questions, reports — **Russian**.
- Interviews for the owner and owner-facing documents — **Russian**. The README stays bilingual (EN + RU), as it is.

## START HERE — Task 0: bring the project up on the owner's PC and deploy KAIF 2.9 + 2.10 WIP

This is the first and only task until it is closed. Do it in order; each step has an exit you can check.

1. **Clone.**
   - [ ] `git clone https://github.com/MikalaiKryvusha/KEINKT.git` into the owner's chosen folder.
   - [ ] Optional, for calibration evidence and the firmware side (CrossPoint PR #4377, `panel_curve.txt` on the card):
     [`MikalaiKryvusha/Krinik-Custom-CrossPoint`](https://github.com/MikalaiKryvusha/Krinik-Custom-CrossPoint) — the reader
     workspace, its own STATUS and the same Task 0.
   - Exit: `git log --oneline -1` shows a176601 or newer.

2. **Restore the toolchain.**
   - [ ] Node.js ≥ 20 and a current Chromium-based browser; `gh` logged in as MikalaiKryvusha.
   - [ ] `node calibrator/test.mjs` → all scenarios PASS (12 on 2026-11-05).
   - [ ] Open `calibrator/index.html` from disk and check that it loads offline.
   - Exit: both checks pass; record the Node version in the closing report.

3. **Deploy KAIF from `main` (2.9 release + 2.10 WIP).**
   - [ ] `curl -fsSL https://raw.githubusercontent.com/MikalaiKryvusha/KAIF/main/KAIF.md -o KAIF.md` in the repo root.
   - [ ] Run it with the owner's phrasing: **"Deploy KAIF from KAIF.md, my working language is Russian"**.
   - [ ] Record the exact KAIF commit SHA (2.10 is unreleased; `main` moves daily). If the 2.10 WIP installer fails, report it
     upstream by KAIF's field-report route and fall back to the `v2.9` tag:
     `https://raw.githubusercontent.com/MikalaiKryvusha/KAIF/v2.9/KAIF.md`.
   - [ ] KAIF must not change the shipped tool pages, `LICENSE` or the bilingual `README.md` content; framework files go beside
     them. Check `git diff --stat` before the first KAIF commit.
   - [ ] `GOAL.md` comes from the owner: a Russian interview after the install.
   - Exit: `.kaif/kaif.json` exists with the version and origin; the install self-check is green; `node calibrator/test.mjs` still
     passes; GitHub Pages still serves https://mikalaikryvusha.github.io/KEINKT/calibrator/.

4. **Adapt.** Move the backlog below into the KAIF canon (`STATUS.md` backlog, `ideas/` for the Image Editor), write the lessons
   that matter (`EXPERIENCE.md`).

5. **Close Task 0.** Commit and push; the closing report (Russian) names the KAIF SHA and test results. Tell the owner the laptop
   can now work from a fresh clone.

## Carry-over backlog (state on 2026-11-08)

- **Released:** v1.0.0 — Calibrator (tag on 02d6130, asset `KEINKT-Calibrator-1.0.0.html`, GitHub Pages).
- **On `main`, not released:** a176601 — install and troubleshooting docs for `/.crosspoint/` (RU/EN), hidden files in Finder and
  over Wi-Fi, checkbox reload after replacing the curve. A 1.0.1 release is the owner's call.
- **Accepted judge tail (P3):** calibrator notes are not re-translated when the UI language is switched.
- **Planned:** KEINKT Image Editor — prepare pictures for the panel (`image-editor/` is reserved; nothing written yet). Starts with
  a requirements interview with the owner.
- **Stale branch:** `fix/curve-config-directory` points at the same commit as `main` (a176601); delete it on the owner's word.
- **Firmware side:** CrossPoint PR #4377 (calibration card + KEINKT link) is open upstream, CI green, waiting for review; tracked
  in Krinik Custom CrossPoint.
