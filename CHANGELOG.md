# Changelog

## 0.1.0 (2026-10-16)

- New: **Video Banner**. A GenerateBlocks Container with a muted, looping video file as its background (Media Library or URL).
- New: "Video source" option, Upload or Video URL; URLs are checked when you leave the field.
- New: Video opacity option (0–100%, default 100). At 0% the video isn't downloaded.
- New: The video plays behind the banner in the block editor, following the breakpoint in Tablet/Mobile previews.
- New: "Disable on mobile" with a custom breakpoint (default 767px). The video is never downloaded at that width and below.
- New: No autoplay for visitors who prefer reduced motion or save data. Lazy loading near the viewport; pausing off-screen and in background tabs.
- The Video Banner is inserted unstyled, with no classes or Global Styles: you style it in GenerateBlocks.
