# Changelog

## 1.1.0

* added: a refresh() method — a host that swaps content under a resting pointer (a lightbox changing slides) can ask the cursor to re-resolve what it is hovering.
* improved: the loading spinner now takes over through a sequenced scale swap — the circle shrinks away, the spinner grows in already spinning — instead of an abrupt cross-fade.
* improved: the lightbox cursor controls moved into their own Cursor Effects section beside Elementor's Lightbox settings.
* fixed: the cursor drew underneath the admin bar, popups and replacement lightboxes; it now draws above every overlay, the way the real pointer does.
* fixed: crossing into an embedded iframe (a video, a map) left the ring parked over the embed holding the last hover state; it now folds away and returns when the pointer resurfaces.
* fixed: an arrows-only drag pill kept the previous hover's text or icon visible inside the arrows.

## 1.0.4

* improved: confirmed compatibility with WordPress 7.1.

## 1.0.3

* added: an Element Scale setting under Magnetic — the magnetized element itself can now shrink or grow slightly while the cursor holds it.

## 1.0.2

* improved: the no-cursor-follower class is no longer added on admin screens, where WordPress puts its own class on the same tag.
* improved: now requires WordPress 6.2 or newer.
* fixed: the no-cursor-follower class being dropped from the html tag when another plugin adds a class to it as well.

## 1.0.1

* fixed: the cursor briefly jumping to a wrong position on the first magnetic hover after scrolling, when the target sits inside a fixed or sticky container such as a sticky header.

## 1.0.0

Initial release.
