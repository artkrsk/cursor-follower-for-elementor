# User Guide

Cursor Follower adds an animated custom cursor to your Elementor site: it trails the mouse with a smooth lag, grows over links, pulls itself onto buttons, and turns slides and images into labeled targets. You judge it by feel — the cursor browsing these docs *is* the plugin, and the [Effects page](/effects) shows every trick live.

## Install

1. Install and activate the plugin from the WordPress plugin directory (or upload the zip under **Plugins → Add New → Upload**).
2. That's it — the cursor is live on your site's front end with the link highlight on by default. Everything else is opt-in.

Requirements: WordPress 6.0+, PHP 8.0+, Elementor (free). Elementor Pro is not required — Pro widgets simply get their Cursor Effects sections when Pro is present.

## Site Settings — the global switches

All global configuration lives in Elementor's Site Settings: open any page **Edit with Elementor → ⚙ Site Settings → Cursor Follower** (the plugin's row on the Plugins screen deep-links there too). Changes preview live without saving.

- **Cursor** — size, text color, background color, backdrop blur, border width and color. These are the cursor's base look; per-state styling beyond that is plain CSS (see the [Developer Reference](/developers#css)).
- **Motion** — the trailing lag and the elastic squash-and-stretch, with strength tuning.
- **Hints** — typography, colors, backdrop blur and offset for the cursor whenever it's showing content: the pill over linked images, cards and slides, and the circle that grows around a word or an icon. Leave the Cursor section's background and blur empty and this section owns the entire filled look, so the free-roam cursor stays a bare ring.
- **Highlight** — the grow-and-fade over links and buttons. On by default, and automatic: links need no setup.
- **Magnetic** — global pull strength and release radius. Which elements magnetize is decided per widget, not here.
- **Loading** — the spinner that takes over the cursor during loading states.

## Per-element Cursor Effects

A **Cursor Effects** section appears at the end of the Style tab for the Container and for the widgets the plugin integrates. Effects with an obvious win default on; anything presumptuous defaults off — every switch is per instance.

| Element | What you control |
|---|---|
| Container | A hint over the whole region — the "Scroll" circle over a hero. Wording or icon, circle or pill, optional arrows, and hiding the native cursor inside it. Links, buttons and integrated widgets inside keep their own effect |
| Button, Call to Action, Flip Box | Magnetic pull onto the button (the cursor collapses; the button's own hover state is the feedback) |
| Icon, Icon Box | Magnetic pull with the cursor wrapping the icon |
| Social Icons | Magnetic pull per icon |
| Image | "Zoom" / "View" hint over linked images — wording and icon per instance |
| Image Box | The same hint over the linked thumbnail and title |
| Image Carousel, Media Carousel, Testimonial Carousel, Slides, Carousel | Magnetic arrows and dots, plus the drag hint over the track — three styles (label pill, label growing arrows, arrows with a press dot). Media Carousel adds the "Zoom"/"View" hint over linked slides |
| Portfolio | The "View Project" pill over cards — wording per instance |

Typed hint wording is translatable the normal way when entered per instance, and falls back to the plugin's built-in strings otherwise.

## The lightbox

Elementor's lightbox gets the same treatment site-wide (Site Settings → Cursor Follower): magnetic prev/next arrows and the drag hint over slideshows, in the same three styles. Single-media lightboxes never show a drag hint — there is nothing to drag to.

## Touch devices

Touch devices download **nothing** — no script, no styles. The plugin prints a tiny inline gate that fetches the engine only on the first real mouse or trackpad signal. Hybrid devices work both ways: dock a mouse and the cursor appears; switch to touch and it steps aside. Your theme can style both worlds via the `has-cursor-follower` / `no-cursor-follower` classes on `<html>`.

## Troubleshooting

- **The cursor doesn't appear.** It only exists for fine pointers — check you're on a device with a mouse/trackpad and that `<html>` carries `has-cursor-follower`. If the class says `no-cursor-follower` on a desktop, a caching layer may be serving a broken copy of the engine assets; purge and reload.
- **Theme styles fight the cursor.** They shouldn't be able to: all plugin CSS ships in a cascade layer that any theme CSS outranks. If something looks off, your own rules win by default — inspect `.arts-cursor` and adjust.
- **Optimizer plugins.** The gate is marked for Autoptimize, LiteSpeed, WP Rocket and Cloudflare's Rocket Loader to skip, and the engine's asset tags are created at runtime where optimizers can't rewrite them. No exclusion rules needed.
- **Turning it off somewhere.** Every effect has its own switch, and developers can disable the whole plugin conditionally — see [Disabling per request](/developers#disabling-per-request).
