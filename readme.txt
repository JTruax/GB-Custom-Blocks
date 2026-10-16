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

A Video Banner for GenerateBlocks: any GenerateBlocks Container can play a video file as its background, with options to switch the video off on mobile and tablet.

== Description ==

Insert **Video Banner** from the GenerateBlocks category, or pick a video in the **Video background** panel of any GenerateBlocks Container.

* Video from the Media Library (MP4, WebM, Ogg) or an http(s) URL.
* Optional poster image, shown until the video plays and wherever it is switched off.
* **Disable on mobile** (up to 767px) and **Disable on tablet** (768–1024px): the video file is never downloaded there.
* Loop on or off.
* A pause button (WCAG 2.2.2) that you style in GenerateBlocks like any other block.
* Respects reduced motion and Save-Data: no autoplay, the visitor can press play.
* The video only loads near the viewport and pauses off-screen.
* Nothing loads on pages without a Video Banner.
* Everything visible is a GenerateBlocks block. With GenerateBlocks Pro, the starting layout comes with Global Styles you can edit.

If the plugin is deactivated, your banners remain valid GenerateBlocks Containers.

== Frequently Asked Questions ==

= How do I darken the video so text is readable? =

Keep the `boim-video-banner--overlay` class, or add a nested `&::after` style to the Container (`content: ""`, `position: absolute`, inset 0, `z-index: -1`, a background colour).

= How do I change the video's focal point? =

In the Container's Styles add the nested selector `& .boim-video-banner__media > *` and set `object-position`.

= How do I style the paused button? =

Use the nested selector `&[aria-pressed="true"]` on the button.

== Changelog ==

= 0.1.0 =
* First release: Video Banner.
