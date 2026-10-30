# Changelog

## Unreleased

- Fixed: Synced patterns inserted from the **Patterns** block were still detached on sites with GenerateBlocks Pro, whose own Insert button replaced the Patterns block's.

## 1.0.0 (2026-10-30)

- Fixed: Synced patterns inserted from the **Patterns** block now stay synced (inserted as a synced reference). GenerateBlocks' Insert always inserted a copy. Unsynced and remote patterns are still inserted as copies.
- Changed: The **Patterns** block now tells you when your Local pattern library is switched off in GenerateBlocks' Manage Libraries, instead of silently opening another library.

## 0.2.0 (2026-10-30)

- New: **Patterns** block. Adding it opens the GenerateBlocks Pattern Library on the site's Local library (GenerateBlocks Pro); the pattern inserted takes the block's place. Closed without choosing, it stays as a placeholder that renders nothing on the front end.
- Changed: The BOIM blocks are listed side by side in the GenerateBlocks category of the inserter (Patterns, then Video Banner).

## 0.1.0 (2026-10-16)

- New: **Video Banner**. A GenerateBlocks Container with a muted, looping video file as its background (Media Library or URL).
- New: "Video source" option, Upload or Video URL; URLs are checked when you leave the field.
- New: Video opacity option (0–100%, default 100). At 0% the video isn't downloaded.
- New: The video plays behind the banner in the block editor, following the breakpoint in Tablet/Mobile previews.
- New: "Disable on mobile" with a custom breakpoint (default 767px). The video is never downloaded at that width and below.
- New: No autoplay for visitors who prefer reduced motion or save data. Lazy loading near the viewport; pausing off-screen and in background tabs.
- The Video Banner is inserted unstyled, with no classes or Global Styles: you style it in GenerateBlocks.
