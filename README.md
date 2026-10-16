# BOIM Blocks: Video Banner for GenerateBlocks

A **Video Banner** for GenerateBlocks 2.x: a normal GenerateBlocks **Container** that plays a video file as its background. You can switch the video off on mobile and tablet. Everything you see is a GenerateBlocks block, styled in GB's own Styles panel and Global Styles. The plugin only adds the video and the pause button's behaviour.

## Using it

1. **Inserter → Video Banner** (in the GenerateBlocks category). It inserts a Container (`<section>`) with a content area, a heading, a paragraph and a **Pause video** button.
2. In the block sidebar, open **Video background**:
   - **Choose video**: pick from the Media Library or upload (MP4, WebM or Ogg), or *Insert from URL* (an `http(s)` link ending in `.mp4`, `.m4v`, `.webm` or `.ogv`).
   - **Poster image** (optional): shown before the video plays, where the video is switched off, and to visitors who prefer reduced motion. It also previews the banner in the editor.
   - **Disable on mobile** (up to 767px) and **Disable on tablet** (768–1024px). On those screens the video file is **never downloaded**, and the poster (or the banner's own background) shows instead.
   - **Loop** (on by default).
3. Style the banner, its content and the button in GenerateBlocks as usual.

Any existing Container can become a video banner too: select it and choose a video in the **Video background** panel.

### Styling tips

| You want… | Do this |
|---|---|
| A tint over the video, for readable text | Keep the `boim-video-banner--overlay` class. Or, in the Container's Styles, add the nested selector `&::after` with `content: ""`, `position: absolute`, top/right/bottom/left `0`, `z-index: -1` and a background colour. |
| A different focal point | In the Container's Styles, add the nested selector `& .boim-video-banner__media > *` and set `object-position` (e.g. `center top`). |
| A different look while paused | On the button, use the nested selector `&[aria-pressed="true"]`. |
| A full-width banner in GeneratePress | Set the page's *Content Container* to *Full Width* (Layout meta box), or put the banner in a GP Element. |

### The pause button ("Video banner part")

Moving content that lasts more than 5 seconds needs a way to pause it (WCAG 2.2.2). The starting layout includes one. Any GenerateBlocks block inside a banner can be made the pause button: select it, open **Video banner part**, and choose **Pause toggle**. A Text block set to `<button>` is best. If the banner has no pause button, the **Video background** panel shows a warning.

- The button keeps the same text in both states. While paused it has `aria-pressed="true"` and `data-boim-state="paused"`.
- If the video can't play (switched off on this screen, or the file fails to load), the button is hidden.
- An icon-only button needs an `aria-label` (add it under GenerateBlocks' HTML Attributes).

## How it works

- The settings are stored in the Container's own `htmlAttributes` (GB saves and renders them):

  | Attribute | Value |
  |---|---|
  | `data-boim-video` | Media Library ID or URL. Also marks the Container as a banner (`""` = no file yet). |
  | `data-boim-video-poster` | Image ID |
  | `data-boim-video-hide` | `mobile`, `tablet` or `mobile tablet` |
  | `data-boim-video-loop` | `false` when looping is off |
  | `data-boim-video-part` | `toggle`, on the pause button |

  If the plugin is switched off, the content is still a valid GenerateBlocks Container.
- **On the server** (`render_block_generateblocks/element`), the settings are validated: Media Library files must be videos, URLs must be `http(s)` and end in a video extension. They're then replaced by a checked `data-boim-video-banner` config, plus a decorative layer (`aria-hidden`) holding the poster `<img>` (responsive `srcset`) and an **empty** `<video>`. The pause button gets `type="button"` and `aria-pressed`.
- **In the browser**, the view script (~2 KB gzipped, no dependencies) adds the `<source>` only when the video is allowed:
  - not on a switched-off screen size;
  - only near the viewport;
  - not automatically with `prefers-reduced-motion: reduce` or Save-Data (the visitor can still press play).

  It pauses the video off-screen, in background tabs, and when the window is resized into a switched-off range. The video fades in over the poster once it actually plays.
- Pages without a banner load **nothing** from this plugin. On GeneratePress (a classic theme), the small stylesheet is loaded in `<head>` for posts that contain a banner, so nothing flashes.

### Classes

Added by PHP (structure only; don't use these names for Global Styles): `boim-has-video`, `boim-video-hide-mobile`, `boim-video-hide-tablet`, `boim-video-banner__media`, `boim-video-banner__poster`, `boim-video-banner__video`.

Default Global Styles, created once with **GenerateBlocks Pro** and never overwritten afterwards:

| Class | What it does |
|---|---|
| `boim-video-banner` | Min height, padding, centred content, white text on a dark fallback background |
| `boim-video-banner--overlay` | A 55% black tint between the video and the content |
| `boim-video-banner__content` | Max width 1200px, centred |
| `boim-video-banner__toggle` | Bottom-corner pill (white on 75% black), CSS-drawn pause/play icon, visible focus ring |

Without GB Pro the banner still works; it's just unstyled until you style it.

## Known limitations

- The mobile/tablet breakpoints are GenerateBlocks' defaults (767px / 1024px).
- The editor shows the poster, not the moving video.
- A banner nested inside a banner that's switched off on a device also hides the inner banner's pause button on that device.
- GB icons inside the pause button are removed when an Author or Contributor saves (WordPress strips inline SVG for them; a GenerateBlocks limitation). The CSS-drawn icon in the default style isn't affected.
- URL sources can point at any host, like an image URL in a post.

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

The Playground command starts a local WordPress at http://127.0.0.1:9400 with GenerateBlocks, GeneratePress and a demo page (`/video-banner-demo/`). The demo content is saved through kses, as an Author would save it. GB Pro can't run there, so a test-only mu-plugin prints the default Global Styles.

```bash
npm run test:e2e
```

That runs 27 Playwright tests:

- **Assets:** nothing loads without a banner.
- **Server markup:** checked before JS runs.
- **Behaviour:** play/pause, mobile, tablet, resize, off-screen, nested banners, URL source, no-loop.
- **Reduced motion, keyboard** and an **axe scan** (light and dark).
- **Forged configs.**
- **Editor:** valid blocks, the variation, and both panels.

Locally the tests use your installed Chrome so MP4 plays. `node scripts/make-fixtures.js` regenerates the test videos.

```bash
npm run lint
```

```bash
npm run zip
```

`npm run zip` writes `dist/boim-blocks.zip` from an allowlist of runtime files. PHP follows `phpcs.xml.dist` (WordPress-Extra, WordPress-Docs, PHPCompatibilityWP 7.4+).

Requires WordPress 6.6+, PHP 7.4+, GenerateBlocks 2.0+.
