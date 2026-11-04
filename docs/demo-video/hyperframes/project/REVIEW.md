# Visual review log

## Pass 1 — 2026-11-04

`hyperframes lint --json` reported 0 errors and 0 warnings after distributing timed clips across Studio tracks. `hyperframes check --json --at 1,8,20,44,77,99,120,145,170` ran actual Chrome frame audits with 0 runtime/layout/motion errors. A ten-frame snapshot/contact sheet was inspected at 1, 8, 20, 44, 77, 99, 120, 145, 170 and 179.75 seconds; full-resolution frames at 77, 99, 120 and 145 were inspected.

Observed issues: small page/eyebrow labels, low-contrast page number on light backgrounds, and architecture boxes in an incorrect order that placed Meta reasoning before local retrieval. The label sizes/colors and architecture ordering were corrected in `build_video.py`. The film uses still product captures with deliberately paced explanatory holds, so the craft check reports dead stretches; these are documented as a film limitation, not hidden by audit opt-outs.

## Pass 2 — 2026-11-04

After the correction, `hyperframes lint --json` again returned 0 errors/0 warnings. The second full browser check reported `ok=true` with 0 runtime/layout/motion errors, 2 transient contrast warnings on dark page-number labels, 15 `dead_stretch` warnings, and an expected silent-film warning. The dark page-number color was corrected afterward. A revised snapshot at 153 and 179.75 seconds was inspected at full resolution: the Meta pipeline now follows interpretation → local retrieval/graph → reasoning/review → evidence gate → brief/MCP; the final official logo and URL are legible. The sixth pipeline box starts at 153 seconds and should be inspected after its entrance transition in the final render.

The Studio preview started at `http://127.0.0.1:3017/#project/project`, and HTTP returned 200. No user-visible browser interaction in Studio was claimed; frame review used HyperFrames' real Chrome renderer.

## Remaining media limitation

Only genuine still captures were available for the UI workflows. The film animates labels, illustrated graph paths and the transition between real report states, but it does not contain a recorded cursor session or authentic UI Proposal screen capture. A human voice-over is also absent. These are submission refinements, not presented as completed work.
