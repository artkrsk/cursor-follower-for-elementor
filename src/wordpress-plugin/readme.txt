=== Arts Cursor Follower for Elementor ===
Contributors: artemsemkin
Tags: cursor, custom cursor, cursor effects, mouse cursor, elementor
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 8.0
Stable tag: 1.1.0
License: GPLv3
License URI: https://www.gnu.org/licenses/gpl-3.0
GitHub Plugin URI: https://github.com/artkrsk/cursor-follower-for-elementor/

An animated cursor follower for Elementor: magnetic buttons, link highlights, text and icon hints, drag effects. Loads nothing on touch devices.

== Description ==

Cursor Follower adds an animated custom cursor to your Elementor site. It trails the mouse with a smooth lag, grows over links, pulls itself onto buttons, and turns slides and images into labeled targets: "Drag", "Zoom", "View Project".

This is a plugin you judge by feel. Press Live Preview above and move your mouse around.

One thing it is not: a static cursor image swapper. If you want to replace the pointer with a PNG, plenty of plugins do that. Cursor Follower is a motion engine that reacts to what's under the pointer.

Live demos and developer documentation: https://artkrsk.github.io/cursor-follower-for-elementor/

= The effects =

* **Link highlight.** The cursor grows and fades over links and buttons. On by default, works everywhere.
* **Magnetic hover.** Buttons, icons and carousel arrows pull the cursor onto themselves. Switched on per widget, tuned globally. No HTML classes to hand-edit, and none of it is paywalled.
* **Text and icon hints.** A pill follows the cursor across linked images, portfolio cards and slides. Change the wording per widget, or swap the text for any Elementor icon, SVG included.
* **Drag hints for carousels.** Three styles: a text pill that grows arrows as you drag, the same pill with its arrows always out, or arrows only with a dot that stands in for the native cursor once you press.
* **Elastic squash and click feedback.** The cursor stretches along its own movement and dips when pressed. Both optional, both tunable.
* **Blend modes.** Difference and exclusion, per state, so the cursor stays readable over photos and dark sections.
* **Loading state.** A spinner takes over the cursor while something is in flight. Developers can toggle it from JavaScript, along with a busy-pointer state.

= Built for Elementor, not "compatible with page builders" =

Most cursor plugins ship one global effect and tell you to add CSS classes. This one plugs into Elementor itself:

* A Cursor Follower tab in Site Settings covers the whole cursor: size, colors, borders, blend modes, hint typography, follow smoothing and transition timing, plus per-state overrides for highlight, magnetic and hints, and the loading spinner's color. Changes apply live in the editor.
* A Cursor Effects section appears inside the widgets themselves: Button, Icon, Icon Box, Image, Image Box, Social Icons, Call to Action, Flip Box, Slides, Portfolio, and every carousel including the new nested Carousel. Each widget only shows the effects that make sense for it.
* The defaults already work. Carousel arrows and dots become magnetic, carousels get a drag hint, portfolio cards get a "View Project" pill, and the Elementor Lightbox gets magnetic navigation, before you touch a single setting.
* Elementor Free and Pro widgets are both covered.

= Performance, in numbers =

Every cursor plugin calls itself lightweight. Here are actual numbers:

* Visitors get one inline block — the loader plus your settings, about 1.7 KB gzipped — and nothing else up front. The engine, around 13 KB gzipped including its CSS, loads on the first mouse movement.
* Phones and tablets never produce that movement, so they download zero bytes of engine code.
* No jQuery. No dependencies.
* The cursor moves by writing a single transform per frame, and its state changes are CSS transitions. The JavaScript goes to sleep whenever the cursor is at rest.
* Caching and optimizer plugins are accounted for: the loader carries the standard opt-out markers so Autoptimize, WP Rocket and similar tools leave it alone.

== Installation ==

1. Install and activate Elementor (the free version is fine).
2. Install and activate Arts Cursor Follower for Elementor.
3. Browse your site. The defaults are already on. To restyle the cursor, open Elementor's Site Settings and find the Cursor Follower tab.

Or press Live Preview on this page and try it without installing anything.

== Frequently Asked Questions ==

= Will it slow down my site? =

Visitors download one inline block of about 1.7 KB gzipped — the loader plus your settings. The engine itself, around 13 KB gzipped, only loads after the first mouse movement, and phones and tablets never load it at all. The JavaScript sleeps while the cursor is idle.

= What happens on phones and tablets? =

Nothing, on purpose. There is no mouse to follow, so the engine never downloads and the native touch experience is untouched.

= Does it replace my visitor's real cursor? =

No. The follower draws alongside the native cursor, so pointing stays precise. The one exception is the arrows-only drag style, which hides the native cursor while you're pressing and brings it back when you let go.

= Does it need Elementor Pro? =

No. It works with free Elementor, and if you have Pro, widgets like Media Carousel, Testimonial Carousel, Slides and Portfolio get their own Cursor Effects too.

= Can I change the hint wording, like "Drag" or "View Project"? =

Yes, per widget, in its Cursor Effects section. You can also replace the text with an icon. The built-in wording is translation-ready.

= Does it work with my theme? =

It's theme-agnostic: the plugin builds its own markup and ships styles in a CSS cascade layer, so your theme's CSS keeps the upper hand. Blend modes keep the cursor readable on busy backgrounds.

= Does it work with caching and optimization plugins? =

Yes. The loader is marked so optimizers (Autoptimize, WP Rocket, LiteSpeed Cache and others) skip it instead of deferring or combining it.

= Does it work with smooth scrolling? =

Yes. Magnetic effects stay glued to their targets while the page scrolls, including under Lenis-based smooth scrolling.

= How do I turn it off? =

Deactivate the plugin, or for conditional control use the "arts_cursor_follower/enabled" PHP filter. Individual effects have their own switches in Site Settings and per widget.

== Screenshots ==

1. The Cursor Follower tab sits with Elementor's own Site Settings, next to Lightbox and Custom CSS.
2. Site Settings: cursor size, background and border colors, border width and blend mode, with a section per visual state below.
3. Slides: magnetic arrows and dots, a drag hint set to the arrows-only style, and a magnetic pull on the slide button.
4. Media Carousel: a "Drag" text hint for the gesture, plus a separate icon hint for slides that open a lightbox or a link.
5. Portfolio: a "View Project" pill following the cursor across a card, live in the editor preview.

== Changelog ==

= 1.1.0 =
* added: a refresh() method — a host that swaps content under a resting pointer (a lightbox changing slides) can ask the cursor to re-resolve what it is hovering.
* improved: the loading spinner now takes over through a sequenced scale swap — the circle shrinks away, the spinner grows in already spinning — instead of an abrupt cross-fade.
* improved: the lightbox cursor controls moved into their own Cursor Effects section beside Elementor's Lightbox settings.
* fixed: the cursor drew underneath the admin bar, popups and replacement lightboxes; it now draws above every overlay, the way the real pointer does.
* fixed: crossing into an embedded iframe (a video, a map) left the ring parked over the embed holding the last hover state; it now folds away and returns when the pointer resurfaces.
* fixed: an arrows-only drag pill kept the previous hover's text or icon visible inside the arrows.

= 1.0.4 =
* improved: confirmed compatibility with WordPress 7.1.

= 1.0.3 =
* added: an Element Scale setting under Magnetic — the magnetized element itself can now shrink or grow slightly while the cursor holds it.

= 1.0.2 =
* improved: the no-cursor-follower class is no longer added on admin screens, where WordPress puts its own class on the same tag.
* improved: now requires WordPress 6.2 or newer.
* fixed: the no-cursor-follower class being dropped from the html tag when another plugin adds a class to it as well.

= 1.0.1 =
* fixed: the cursor briefly jumping to a wrong position on the first magnetic hover after scrolling, when the target sits inside a fixed or sticky container such as a sticky header.

= 1.0.0 =
Initial release.
