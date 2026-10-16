# BOIM Blocks: Video Banner for GenerateBlocks

A **Video Banner** for GenerateBlocks 2.x: a normal GenerateBlocks **Container** that plays a video file as its background, muted and looping. You can switch the video off below a screen width you choose. Everything you see is a GenerateBlocks block, styled in GB's own Styles panel and Global Styles. The plugin only adds the video.

## Using it

1. **Inserter → Video Banner** (in the GenerateBlocks category). It inserts a Container (`<section>`) with a content area, a heading and a paragraph.
2. In the block sidebar, open **Video background**:
   - **Video source**: choose one of two options.
     - **Upload**: upload a file or pick one from the Media Library (MP4, WebM or Ogg).
     - **Video URL**: paste a direct `http(s)` link to a file ending in `.mp4`, `.m4v`, `.webm` or `.ogv` (not a YouTube or Vimeo page). A link that isn't a video file is flagged when you leave the field, and not saved.
   - **Disable on mobile** (off by default). Turning it on shows a **Breakpoint (px)** field, pre-filled with **767** (GenerateBlocks' mobile breakpoint). The video is switched off at that width and below, and the file is **never downloaded** there.
3. The video plays behind the content **in the editor too**, so you can style the text over it. The editor's Tablet/Mobile previews show it switched off below your breakpoint.
4. Style the banner and its content in GenerateBlocks as usual. Give the Container a background colour or image: it shows until the video plays, and wherever the video is switched off.

Any existing Container can become a video banner too: select it and choose a video in the **Video background** panel.

The video always plays muted and loops. There's no pause button and no poster image.

### Styling tips

| You want… | Do this |
|---|---|
| A tint over the video, for readable text | Keep the `boim-video-banner--overlay` class. Or, in the Container's Styles, add the nested selector `& .boim-video-banner__media::after` with `content: ""`, `position: absolute`, top/right/bottom/left `0` and a background colour. (Not the Container's own `&::after`: the block editor uses it for the selection outline.) |
| A different focal point | In the Container's Styles, add the nested selector `& .boim-video-banner__media > *` and set `object-position` (e.g. `center top`). |
| An image where the video is off | Set a background image on the Container in GB's Styles (optionally only in GB's mobile breakpoint). |
| A full-width banner in GeneratePress | Set the page's *Content Container* to *Full Width* (Layout meta box), or put the banner in a GP Element. |

## How it works

- The settings are stored in the Container's own `htmlAttributes` (GB saves and renders them):

  | Attribute | Value |
  |---|---|
  | `data-boim-video` | Media Library ID or URL. Also marks the Container as a banner (`""` = no file yet). |
  | `data-boim-video-max-width` | Only present when "Disable on mobile" is on. The breakpoint in px (whole number, 1–4000; empty or invalid means 767). |

  If the plugin is switched off, the content is still a valid GenerateBlocks Container.
- **On the server** (`render_block_generateblocks/element`), the settings are validated: Media Library files must be videos, URLs must be `http(s)` and end in a video extension. They're then replaced by a checked `data-boim-video-banner` config, plus a decorative layer (`aria-hidden`) holding an **empty**, muted, looping `<video>`.
- **In the browser**, the view script (~2 KB gzipped, no dependencies) adds the `<source>` only when the video is allowed:
  - not at or below the breakpoint;
  - only near the viewport;
  - never with `prefers-reduced-motion: reduce` or Save-Data.

  It pauses the video off-screen and in background tabs. Resizing to the breakpoint or below pauses the video and hides it, and it comes back when the window is wider again. The video fades in over the Container's background once it actually plays.
- **In the editor**, the same layer is rendered into the Container's element in the canvas (a React portal from an `editor.BlockEdit` filter; GB's own edit component is untouched). Nothing extra is saved. It plays muted and looping, stays still with reduced motion, and uses the canvas width for the breakpoint.
- Pages without a banner load **nothing** from this plugin. On GeneratePress (a classic theme), the small stylesheet is loaded in `<head>` for posts that contain a banner.

### Classes

Added by PHP (structure only; don't use these names for Global Styles): `boim-has-video`, `boim-video-banner__media`, `boim-video-banner__video`.

Default Global Styles, created once with **GenerateBlocks Pro** and never overwritten afterwards:

| Class | What it does |
|---|---|
| `boim-video-banner` | Min height, padding, centred content, white text on a dark fallback background |
| `boim-video-banner--overlay` | A 55% black tint between the video and the content (on `.boim-video-banner__media::after`) |
| `boim-video-banner__content` | Max width 1200px, centred |

Without GB Pro the banner still works; it's just unstyled until you style it.

## Accessibility note

A video that moves for more than 5 seconds with no way to pause it doesn't meet WCAG 2.2.2 (Pause, Stop, Hide, level A). This plugin doesn't include a pause button, by design. To limit the impact:

- visitors who set "reduce motion" on their device never get the video;
- the video layer is hidden from screen readers and has no sound.

If a site needs WCAG 2.2 A/AA conformance, add your own pause control or keep banner videos under 5 seconds without looping.

## Known limitations

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
- **Server markup:** checked before JS runs, including breakpoint parsing.
- **Behaviour:** plays and loops; the breakpoint (default, custom, exact edge, resize); off-screen; nested banners; URL source.
- **Reduced motion** and an **axe scan** (light and dark).
- **Forged configs.**
- **Editor:** valid blocks, the variation, the panel, the two video source options, and the video playing in the canvas (including the breakpoint).

Locally the tests use your installed Chrome so MP4 plays. `node scripts/make-fixtures.js` regenerates the test videos.

```bash
npm run lint
```

```bash
npm run zip
```

`npm run zip` writes `dist/boim-blocks.zip` from an allowlist of runtime files. PHP follows `phpcs.xml.dist` (WordPress-Extra, WordPress-Docs, PHPCompatibilityWP 7.4+).

Requires WordPress 6.6+, PHP 7.4+, GenerateBlocks 2.0+.
