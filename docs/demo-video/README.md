# ScopeGraph hackathon video project

Editable HyperFrames source: [hyperframes/project](hyperframes/project/). The film uses eight seekable scenes over 180 seconds, genuine local ScopeGraph screenshots from the bundled sample, source-backed claims and timed English captions. The AI UI Proposal scene is explicitly a conceptual offline prototype. No new paid inference was made.

Open the [English script](VIDEO_SCRIPT_3MIN_EN.md), [Vietnamese translation](VIDEO_SCRIPT_3MIN_VI.md), [storyboard](VIDEO_STORYBOARD.md), [feature verification](FEATURE_VERIFICATION.md), [asset manifest](MEDIA_ASSET_MANIFEST.md), [visual review log](hyperframes/project/REVIEW.md), and [submission handoff](FINAL_SUBMISSION_CHECKLIST.md).

## Local reproduction on this Windows workspace

The video-only dependencies are pinned in `hyperframes/package.json` and `package-lock.json`. After `npm ci` in that directory, from the repository root:

```powershell
.\docs\demo-video\render-local.ps1 -CheckOnly
.\docs\demo-video\render-local.ps1
```

The second command renders to `docs/demo-video/output/scopegraph-hackathon-demo.mp4`. The output directory and `node_modules` are Git-ignored. The preview can be opened from `hyperframes/project` with `npx --no-install hyperframes preview --background --port 3017`; the project URL is `http://127.0.0.1:3017/#project/project` while that server is running.

This build has no voice-over or music. Windows SAPI offered only Microsoft David/Zira Desktop voices; the natural local Kokoro engine was absent. The SRT is aligned to the planned scene narration and needs word-level retiming after a human recording. Do not describe the silent MP4 as a narrated final submission.
