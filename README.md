[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/saintonyxv/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/saintonyxv/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# ViceCover Studio

Turn any photo into GTA-style multi-panel cover art. Six poster layouts (classic collage, diagonal cut, triptych, quad grid, hero strip, full bleed) with white keyline gutters and the classic frame, six colour grades with a strength slider and vignette, per-panel photo placement with focus and zoom, and editable poster lettering — title, subtitle, caption bar, badge and platform strip — exported as a full-resolution PNG (1080 x 1080, 1080 x 1350 or 1920 x 1080). Fully offline: plain static files, no libraries, no network requests. All lettering is original, drawn from system font stacks.

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty: https://make.fun/bounty/gta6-cover-art-01

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. To produce the hand-in output (app, screenshots and dossier.json) outside the grader's container:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Node.js 22.18 or later, standard library only.

## Try make.fun

Join with referral code `hv020zhf`: https://make.fun/r/hv020zhf

## License

MIT — see LICENSE.
