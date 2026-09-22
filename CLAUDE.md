# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## What this is

A single Vite + React game asset generator, split off from the AssetMaker
prototyping sandbox once this game matured. It renders cards/tiles/boards/
tokens on-screen and exports them as PNG/JPEG for Tabletop Simulator and
Screentop.gg, via the shared [`asset-kit`](https://github.com/poeticmatter/AssetKit)
package.

## Commands

```bash
npm run dev      # start Vite dev server with HMR
npm run build    # production build to dist/
npm run lint     # eslint over the whole project
```

## Export rules (read this before touching any export code)

These rules exist so exports stay consistent without having to re-derive
conventions every time. The canonical version lives in `asset-kit`'s
[`docs/EXPORT_STANDARDS.md`](https://github.com/poeticmatter/AssetKit/blob/main/docs/EXPORT_STANDARDS.md) —
if this section and that file ever disagree, that file wins and this one is
stale.

- **Always export through `asset-kit`.** Use `exportForTTS` / `exportForScreentop`
  from the `asset-kit` package rather than calling `toPng`/`toJpeg` directly.
  Don't hand-roll a new resolution/quality convention per export.
- **Resolution is for screen, not print.** The default (`pixelRatio: 2`,
  `quality: 0.95`) is intentionally "clear, not print-ready." If an export
  looks soft, that's a bug in the source art, not a reason to raise the
  resolution.
- **TTS defaults to a solid black background; Screentop defaults to
  transparent.** That's the opposite of each other on purpose — see the
  table in `EXPORT_STANDARDS.md` for why. Override with `transparent: true`/
  `false` per call, don't change the defaults.
- **Filenames go through `buildAssetFilename({ game, group, variant, modifier })`.**
  Keep the same `game` value across every export in this repo.
- **Print export is opt-in and only when explicitly requested.** `asset-kit`
  ships `exportForPrint` and `STANDARD_TRIM_SIZES`, but do not wire up a
  print button, add print-resolution options, or call `exportForPrint`
  unless the user has explicitly asked for print support in this session.
  Digital/on-screen testing is the default; print is a separate, opt-in ask.
- **New icons/glyphs/card backs should build on `Glyph`** (from `asset-kit`)
  or follow its convention: a single square `viewBox`, a `size` prop driving
  width/height, colors passed as props, no gradients/filters/animation (they
  don't survive `html-to-image` export reliably).
- **No animation, anywhere.** No CSS `@keyframes`, `animate-*` classes, or
  JS-driven animation on anything that gets exported — it causes export
  glitches and has no effect on the final PNG/JPEG.
- **Card data should use `asset-kit`'s card standard** (`validateCardSpec`,
  `importCardsFromJson`, `exportCardsToJson`) rather than only living as a
  hardcoded JS array, so card lists can round-trip through an external
  editor.

## Updating `asset-kit`

This repo depends on `asset-kit` via a pinned git tag
(`"asset-kit": "github:poeticmatter/AssetKit#vX.Y.Z"` in `package.json`).
Bumping it is a deliberate choice, not automatic — when `asset-kit` cuts a
new tag, update the version pin here and re-test exports before committing.
