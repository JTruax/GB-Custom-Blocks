=== BOIM Blocks ===
Contributors: boim
Tags: generateblocks, video background, banner, hero, block
Requires at least: 6.6
Tested up to: 6.9
Requires PHP: 7.4
Requires Plugins: generateblocks
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

A Video Banner for GenerateBlocks: any GenerateBlocks Container can play a looping video file as its background, switched off below a screen width you choose.

== Description ==

Insert **Video Banner** from the GenerateBlocks category, or pick a video in the **Video background** panel of any GenerateBlocks Container.

* Two video sources: **Upload** (Media Library: MP4, WebM, Ogg) or **Video URL**.
* The video plays in the block editor too, behind the content.
* Plays muted and loops.
* Video opacity option (0–100%), so the Container's background can show through.
* **Disable on mobile** with a custom breakpoint (767px by default): the video file is never downloaded at that width and below. The Container's own background shows instead.
* Never plays for visitors who prefer reduced motion or save data.
* The video only loads near the viewport and pauses off-screen.
* Nothing loads on pages without a Video Banner.
* Everything visible is a GenerateBlocks block. With GenerateBlocks Pro, the starting layout comes with Global Styles you can edit.

There's no pause button: a looping video longer than 5 seconds doesn't meet WCAG 2.2.2 on its own. Visitors who prefer reduced motion never see it.

If the plugin is deactivated, your banners remain valid GenerateBlocks Containers.

== Frequently Asked Questions ==

= How do I darken the video so text is readable? =

Keep the `boim-video-banner--overlay` class, or add the nested selector `& .boim-video-banner__media::after` to the Container's Styles (`content: ""`, `position: absolute`, inset 0, a background colour).

= How do I change the video's focal point? =

In the Container's Styles add the nested selector `& .boim-video-banner__media > *` and set `object-position`.

= What shows where the video is switched off? =

The Container's own background. Set a colour or image in its GenerateBlocks Styles.

== Changelog ==

= 0.1.0 =
* First release: Video Banner.
