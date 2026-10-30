=== BOIM Blocks ===
Contributors: boim
Tags: generateblocks, video background, banner, hero, block
Requires at least: 6.6
Tested up to: 6.9
Requires PHP: 7.4
Stable tag: 1.0.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A collection of custom blocks that are compatible with GenerateBlocks.

== Description ==

Two blocks, in the GenerateBlocks category.

**Patterns** adds one of your site's local patterns (the Local library GenerateBlocks Pro adds to the GenerateBlocks Pattern Library) right where you put the block:

* Adding the block opens the GenerateBlocks Pattern Library on your Local library.
* The pattern you insert takes the block's place, also inside a Container.
* Closed without choosing? The block stays as a placeholder with an "Open local patterns" button. It outputs nothing on the front end.
* No GenerateBlocks Pro? It opens the Pattern Library on its default library instead.

**Video Banner**: insert it, then choose its video in the block's **Video background** panel. Ordinary GenerateBlocks Containers are left alone.

* Two video sources: **Upload** (Media Library: MP4, WebM, Ogg) or **Video URL**.
* The video plays in the block editor too, behind the content.
* Plays muted and loops.
* Video opacity option (0–100%), so the Container's background can show through.
* **Disable on mobile** with a custom breakpoint (767px by default): the video file is never downloaded at that width and below. The Container's own background shows instead.
* Never plays for visitors who prefer reduced motion or save data.
* The video only loads near the viewport and pauses off-screen.
* Nothing loads on pages without a Video Banner.
* Everything visible is a GenerateBlocks block, inserted unstyled with no classes, so you style it all in GenerateBlocks.

There's no pause button: a looping video longer than 5 seconds doesn't meet WCAG 2.2.2 on its own. Visitors who prefer reduced motion never see it.

If the plugin is deactivated, your banners remain valid GenerateBlocks Containers.

== Frequently Asked Questions ==

= How do I darken the video so text is readable? =

Add the nested selector `& .boim-video-banner__media::after` to the Container's Styles (`content: ""`, `position: absolute`, inset 0, a background colour).

= How do I change the video's focal point? =

In the Container's Styles add the nested selector `& .boim-video-banner__media > *` and set `object-position`.

= What shows where the video is switched off? =

The Container's own background. Set a colour or image in its GenerateBlocks Styles.

== Changelog ==

= 1.0.1 =
* Fixed: Synced patterns inserted from the Patterns block stay synced on sites with GenerateBlocks Pro.
* Fixed: Synced patterns from a GenerateCloud library served by the same site stay synced too.
* Changed: The Plugins screen shows the author, Blue Ocean Interactive Marketing.

= 1.0.0 =
* Fixed: Synced patterns inserted from the Patterns block stay synced.
* Changed: The Patterns block tells you when your Local pattern library is switched off.

= 0.2.0 =
* New: Patterns block. Opens the GenerateBlocks Pattern Library on your Local library; the pattern you insert takes the block's place.
* Changed: The BOIM blocks are listed side by side in the inserter.

= 0.1.0 =
* First release: Video Banner.
