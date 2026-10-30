# BOIM Blocks

A collection of custom blocks that are compatible with GenerateBlocks 2.x:

- **[Video Banner](#video-banner)**: a GenerateBlocks Container with a looping video background.
- **[Patterns](#patterns)**: adds one of your site's local patterns from the GenerateBlocks Pattern Library, right where you put the block.

## Download

**[Download boim-blocks.zip](https://github.com/JTruax/GB-Custom-Blocks/releases/latest/download/boim-blocks.zip)** (latest release, ready to install in WordPress)

In WordPress, go to **Plugins → Add New Plugin → Upload Plugin**, choose the zip and click **Install Now**, then **Activate**. To update, upload the new zip the same way and choose **Replace current with uploaded**.

Use this zip, not GitHub's green **Code → Download ZIP** button: that one is the source code, without the built files, and won't run as a plugin. Older versions are on the [Releases](https://github.com/JTruax/GB-Custom-Blocks/releases) page.

Requires GenerateBlocks 2.0+ (and GenerateBlocks Pro for the Local pattern library).

## Video Banner

A GenerateBlocks Container with a muted, looping video background. It assigns no classes or styles: you style it in GenerateBlocks.

### Using it

1. Add the **Video Banner** block (GenerateBlocks category).
2. In the sidebar, open **Video background**:
   - **Video source**: **Upload** an MP4, WebM or Ogg file, or paste a **Video URL** (a direct link to a video file, not YouTube or Vimeo).
   - **Video opacity (%)**: lower it to let the Container's background show through.
   - **Disable on mobile**: switches the video off at the **Breakpoint (px)** and below (767 by default).
3. Give the Container a background colour or image in its Styles. It shows until the video plays, and wherever the video is switched off.

#### Styling tips

| You want… | Do this |
|---|---|
| A tint over the video, for readable text | In the Container's Styles, add the nested selector `& .boim-video-banner__media::after` with `content: ""`, `position: absolute`, top/right/bottom/left `0` and a background colour. (Not the Container's own `&::after`: the block editor uses it for the selection outline.) |
| A different focal point | In the Container's Styles, add the nested selector `& .boim-video-banner__media > *` and set `object-position` (e.g. `center top`). |
| An image where the video is off | Set a background image on the Container in GB's Styles (optionally only in GB's mobile breakpoint). |
| A full-width banner in GeneratePress | Set the page's *Content Container* to *Full Width* (Layout meta box), or put the banner in a GP Element. |

### Accessibility note

A video that moves for more than 5 seconds with no way to pause it doesn't meet WCAG 2.2.2 (Pause, Stop, Hide, level A). This plugin doesn't include a pause button, by design. To limit the impact:

- visitors who set "reduce motion" on their device never get the video;
- the video layer is hidden from screen readers and has no sound.

If a site needs WCAG 2.2 A/AA conformance, add your own pause control or keep banner videos under 5 seconds without looping.

### Known limitations

- URL sources can point at any host, like an image URL in a post.

## Patterns

Adds a pattern from the GenerateBlocks Pattern Library exactly where you put the block.

### Using it

1. Turn on your **Local** library once (GenerateBlocks Pro): open the Pattern Library, choose **Manage Libraries** and enable **Local**.
2. Add the **Patterns** block where the pattern should go (GenerateBlocks category, or type `/patterns`). The Pattern Library opens on your Local library.
3. Pick a pattern and click **Insert**. It replaces the Patterns block.

**Synced patterns stay synced**, from the Local library or a GenerateCloud library served by your site. Other patterns are inserted as copies.

If you close the library without choosing, the block stays as a placeholder (it shows nothing on the front end). Click **Open local patterns** to try again, or delete it.

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

The Playground command starts a local WordPress at http://127.0.0.1:9400 with GenerateBlocks, GeneratePress and a demo page (`/video-banner-demo/`). For the Patterns block, a test-only mu-plugin adds a stand-in "Local (test)" library with one pattern, since GenerateBlocks Pro can't run there. It also stands in for GB Pro's own Insert button filter, which replaces GB's button. The demo content is saved through kses, as an Author would save it, and is styled with ordinary GB local styles, as a user would style it.

```bash
npm run test:e2e
```

That runs 47 Playwright tests:

- **Assets:** nothing loads without a banner.
- **Server markup:** checked before JS runs, including breakpoint and opacity parsing.
- **Behaviour:** plays and loops; opacity (fade target, 0% never downloads); the breakpoint (default, custom, exact edge, resize); off-screen; nested banners; URL source.
- **Reduced motion** and an **axe scan** (light and dark).
- **Forged configs.**
- **Editor:** valid blocks, the variation, the panel, the two video source options, the opacity slider, and the video playing in the canvas (including the breakpoint).
- **Patterns:** in the inserter; opens on the Local library; GB's Insert puts the pattern in the block's place (also inside a Container); closing keeps the placeholder with no extra undo steps; the button reopens it; no auto-open on load; the notice when GB's library is unavailable; nothing on the front end; listed beside Video Banner in the inserter; synced patterns inserted as synced references, also from a same-site GenerateCloud library (unsynced, another site's and GB's own button stay copies); a switched-off Local library explained.

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
