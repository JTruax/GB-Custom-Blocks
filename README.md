# BOIM Blocks

A collection of custom blocks that are compatible with GenerateBlocks 2.x:

- **[Video Banner](#video-banner)**: a GenerateBlocks Container with a looping video background.
- **[Patterns](#patterns)**: adds one of your site's local patterns from the GenerateBlocks Pattern Library, right where you put the block.

## Video Banner

A **Video Banner** for GenerateBlocks 2.x: a normal GenerateBlocks **Container** that plays a video file as its background, muted and looping. You can switch the video off below a screen width you choose. Everything you see is a GenerateBlocks block, styled in GB's own Styles panel and Global Styles. The plugin only adds the video, and assigns no classes or styles: you style the banner yourself.

### Using it

1. **Inserter → Video Banner** (in the GenerateBlocks category). It inserts an unstyled Container (`<section>`) with a content area, a heading and a paragraph. No classes or styles are assigned.
2. In the block sidebar, open **Video background**:
   - **Video source**: choose one of two options.
     - **Upload**: upload a file or pick one from the Media Library (MP4, WebM or Ogg).
     - **Video URL**: paste a direct `http(s)` link to a file ending in `.mp4`, `.m4v`, `.webm` or `.ogv` (not a YouTube or Vimeo page). A link that isn't a video file is flagged when you leave the field, and not saved.
   - **Video opacity (%)**: 100 by default. Lower it to let the Container's background show through the video. At 0 the video isn't downloaded at all. A tint you add on the video layer (below) isn't affected.
   - **Disable on mobile** (off by default). Turning it on shows a **Breakpoint (px)** field, pre-filled with **767** (GenerateBlocks' mobile breakpoint). The video is switched off at that width and below, and the file is **never downloaded** there.
3. The video plays behind the content **in the editor too**, so you can style the text over it. The editor's Tablet/Mobile previews show it switched off below your breakpoint.
4. Style the banner and its content in GenerateBlocks as usual. Give the Container a background colour or image: it shows until the video plays, and wherever the video is switched off.

The **Video background** panel only appears on Video Banner blocks; ordinary Containers are left alone. **Remove video** clears the video but keeps the block a Video Banner.

The video always plays muted and loops. There's no pause button and no poster image.

#### Styling tips

| You want… | Do this |
|---|---|
| A tint over the video, for readable text | In the Container's Styles, add the nested selector `& .boim-video-banner__media::after` with `content: ""`, `position: absolute`, top/right/bottom/left `0` and a background colour. (Not the Container's own `&::after`: the block editor uses it for the selection outline.) |
| A different focal point | In the Container's Styles, add the nested selector `& .boim-video-banner__media > *` and set `object-position` (e.g. `center top`). |
| An image where the video is off | Set a background image on the Container in GB's Styles (optionally only in GB's mobile breakpoint). |
| A full-width banner in GeneratePress | Set the page's *Content Container* to *Full Width* (Layout meta box), or put the banner in a GP Element. |

### How it works

- The settings are stored in the Container's own `htmlAttributes` (GB saves and renders them):

  | Attribute | Value |
  |---|---|
  | `data-boim-video` | Media Library ID or URL. Also marks the Container as a banner (`""` = no file yet). |
  | `data-boim-video-opacity` | Only present below 100: the video's opacity as a whole percentage (0–100). Invalid means 100. |
  | `data-boim-video-max-width` | Only present when "Disable on mobile" is on. The breakpoint in px (whole number, 1–4000; empty or invalid means 767). |

  If the plugin is switched off, the content is still a valid GenerateBlocks Container.
- **On the server** (`render_block_generateblocks/element`), the settings are validated: Media Library files must be videos, URLs must be `http(s)` and end in a video extension. They're then replaced by a checked `data-boim-video-banner` config, plus a decorative layer (`aria-hidden`) holding an **empty**, muted, looping `<video>`.
- **In the browser**, the view script (~2 KB gzipped, no dependencies) adds the `<source>` only when the video is allowed:
  - not at or below the breakpoint;
  - not at 0% opacity;
  - only near the viewport;
  - never with `prefers-reduced-motion: reduce` or Save-Data.

  It pauses the video off-screen and in background tabs. Resizing to the breakpoint or below pauses the video and hides it, and it comes back when the window is wider again. The video fades in over the Container's background, to the chosen opacity, once it actually plays.
- **In the editor**, the same layer is rendered into the Container's element in the canvas (a React portal from an `editor.BlockEdit` filter; GB's own edit component is untouched). Nothing extra is saved. It plays muted and looping at the chosen opacity, stays still with reduced motion, and uses the canvas width for the breakpoint.
- Pages without a banner load **nothing** from this plugin. On GeneratePress (a classic theme), the small stylesheet is loaded in `<head>` for posts that contain a banner.

#### Classes

Added by PHP (structure only; don't use these names for Global Styles): `boim-has-video`, `boim-video-banner__media`, `boim-video-banner__video`.

These only position the video behind the content (no colours, sizes or spacing). The plugin creates no Global Styles; the Video opacity setting is the one value it applies to the video itself.

### Accessibility note

A video that moves for more than 5 seconds with no way to pause it doesn't meet WCAG 2.2.2 (Pause, Stop, Hide, level A). This plugin doesn't include a pause button, by design. To limit the impact:

- visitors who set "reduce motion" on their device never get the video;
- the video layer is hidden from screen readers and has no sound.

If a site needs WCAG 2.2 A/AA conformance, add your own pause control or keep banner videos under 5 seconds without looping.

### Known limitations

- URL sources can point at any host, like an image URL in a post.

## Patterns

A block for adding one of your site's **local patterns** (the Local library that GenerateBlocks Pro adds to the GenerateBlocks Pattern Library) exactly where you want it.

### Using it

1. Add the **Patterns** block (GenerateBlocks category, or type `/patterns`) where the pattern should go: between blocks, or inside a Container.
2. The GenerateBlocks Pattern Library opens straight away on your **Local** library.
3. Pick a pattern and click **Insert** (or use **Bulk Insert**). The pattern takes the Patterns block's place.
4. If you close the library without choosing, the Patterns block stays as a placeholder. Click **Open local patterns** to try again, or delete it.

**Synced patterns stay synced.** If the pattern you insert is one of your site's **synced** patterns, the Patterns block inserts it as a synced reference, so editing the pattern later updates it everywhere. GenerateBlocks' own Insert always inserts a copy, which is no longer synced. These are still inserted as copies, as GenerateBlocks does: unsynced patterns, patterns from remote libraries, and a Bulk Insert that mixes synced with other patterns. The same goes for patterns inserted from GenerateBlocks' own Pattern Library button.

**Turn on your Local library.** GenerateBlocks Pro makes each pattern Collection a library ("Local" is the default one), but it's **switched off** until you turn it on. Open the Pattern Library, choose **Manage Libraries**, and enable **Local**. Until then, the block says so and opens another library.

A leftover placeholder outputs nothing on the front end and loads no files there.

If the site has no Local library (no GenerateBlocks Pro), the block opens the Pattern Library on its default library instead, and says so. If GenerateBlocks' Pattern Library is turned off or GenerateBlocks isn't active, the block shows a notice instead of opening it.

### How it works

It uses GenerateBlocks' own Pattern Library rather than imitating it:

- It finds the Local library through GB's `/generateblocks/v1/pattern-library/libraries` endpoint (switched-on libraries flagged `isLocal`, preferring Pro's default `local-patterns` collection), and sets it as the library to open first (`generateBlocksPatternLibrary.defaultOpenLibrary`) while the library is open.
- It swaps itself for an empty paragraph in the same spot and opens the library with GB's `generateblocks.patternLibrary.open` action. GB's Insert replaces an empty selected paragraph with the pattern, so the pattern lands exactly there.
- When the library closes, GB's setting is put back, and if nothing was inserted the Patterns block returns. Neither swap is an undo step.
- **Synced patterns:** GB Pro lists each local pattern as `id: "pattern-<post ID>"` with its full content (`build_tree()` in GB Pro 2.8). While the library is open for a Patterns block, GB's Insert button is wrapped through GB's `generateblocks.patterns.insertPatternButton` filter. If every pattern being inserted is a synced `wp_block` on this site with identical content (compared as parsed blocks), a `core/block` reference replaces the paragraph instead and the library closes. Anything else goes to GB's Insert untouched.

These are GenerateBlocks internals (GB 2.5 / GB Pro 2.8), not a documented API, so each is checked before use. A future GenerateBlocks release could change them.

## Development

```bash
npm install
```

```bash
npm run build
```

```bash
npm run playground
```

The Playground command starts a local WordPress at http://127.0.0.1:9400 with GenerateBlocks, GeneratePress and a demo page (`/video-banner-demo/`). For the Patterns block, a test-only mu-plugin adds a stand-in "Local (test)" library with one pattern, since GenerateBlocks Pro can't run there. The demo content is saved through kses, as an Author would save it, and is styled with ordinary GB local styles, as a user would style it.

```bash
npm run test:e2e
```

That runs 46 Playwright tests:

- **Assets:** nothing loads without a banner.
- **Server markup:** checked before JS runs, including breakpoint and opacity parsing.
- **Behaviour:** plays and loops; opacity (fade target, 0% never downloads); the breakpoint (default, custom, exact edge, resize); off-screen; nested banners; URL source.
- **Reduced motion** and an **axe scan** (light and dark).
- **Forged configs.**
- **Editor:** valid blocks, the variation, the panel, the two video source options, the opacity slider, and the video playing in the canvas (including the breakpoint).
- **Patterns:** in the inserter; opens on the Local library; GB's Insert puts the pattern in the block's place (also inside a Container); closing keeps the placeholder with no extra undo steps; the button reopens it; no auto-open on load; the notice when GB's library is unavailable; nothing on the front end; listed beside Video Banner in the inserter; synced patterns inserted as synced references (unsynced, lookalike and GB's own button stay copies); a switched-off Local library explained.

Locally the tests use your installed Chrome so MP4 plays. `node scripts/make-fixtures.js` regenerates the test videos.

```bash
npm run lint
```

```bash
npm run zip
```

`npm run zip` writes `dist/boim-blocks.zip` from an allowlist of runtime files. PHP follows `phpcs.xml.dist` (WordPress-Extra, WordPress-Docs, PHPCompatibilityWP 7.4+).

### Versions and releases

See [VERSIONING.md](VERSIONING.md): how to choose the next version number, the seven places it lives, the release checklist (build, test, zip, tag), and what to do when adding a block.

Requires WordPress 6.6+, PHP 7.4+, GenerateBlocks 2.0+.
