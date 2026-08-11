<?php
/**
 * Builds the "Cursor Follower — Demo" page: the Live Preview landing page on
 * WordPress.org and the page this plugin is judged by.
 *
 * Run against a dev site (Homebrew PHP needs Local's mysql socket):
 *   php -d mysqli.default_socket="$SOCK" "$(which wp)" eval-file dev/seed/demo-page.php
 *
 * Also inlined verbatim into .wordpress-org/blueprints/blueprint.json's
 * writeFile step by dev/blueprint/build-blueprint.js — there is no wp-cli in
 * that context, which is why every WP_CLI:: call below is guarded.
 *
 * The six posters are embedded rather than downloaded: plugins.svn.wordpress.org
 * serves no CORS headers, so a blueprint cannot fetch from there. The panel
 * screenshot is the exception and IS fetched — it already ships as a listing
 * asset, and ps.w.org (a different host to the SVN one) answers cross-origin
 * GETs with `access-control-allow-origin: *`. Embedding it too cost 41 KB of
 * base64 and pushed blueprint.json past the 100 KB the plugin directory
 * accepts, which disables Live Preview outright.
 *
 * Idempotent. Finds the page by slug and rewrites it wholesale; attachments are
 * keyed on a meta value and reused.
 *
 * The page body below is the exported _elementor_data of the page that was
 * built by hand in Elementor and verified at 1440 / 1024 / 390. It is embedded
 * rather than transcribed into PHP arrays on purpose: it is ~30 KB of JSON, and
 * hand-writing it would risk shipping a demo that differs from the verified one.
 * Everything site-specific in it (attachment ids, upload URLs, the editor deep
 * link) is rewritten below against the ids this run actually creates.
 *
 * To regenerate after editing the page on the dev site: re-export
 * _elementor_data and the kit's arts_cursor_* settings, and replace the two
 * JSON blobs.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Pinned so the blueprint's landingPage can address the page without guessing.
 * dev/blueprint/build-blueprint.js reads this constant — keep the literal on
 * one line.
 */
define( 'ARTS_CF_DEMO_PAGE_ID', 9931 );

// Elementor otherwise hijacks the first admin request with its onboarding
// wizard. Harmless on an already-onboarded dev site.
update_option( 'elementor_onboarded', true );
delete_transient( 'elementor_activation_redirect' );

/** key => [ filename, width, height, title ] */
$arts_cf_posters = array(
	'hint-1'  => array( 'poster-hint-1.svg', 1200, 900, 'Cursor Follower — Poster Hint 1' ),
	'hint-2'  => array( 'poster-hint-2.svg', 1200, 900, 'Cursor Follower — Poster Hint 2' ),
	'hint-3'  => array( 'poster-hint-3.svg', 1200, 900, 'Cursor Follower — Poster Hint 3' ),
	'slide-1' => array( 'poster-slide-1.svg', 1200, 800, 'Cursor Follower — Poster Slide 1' ),
	'slide-2' => array( 'poster-slide-2.svg', 1200, 800, 'Cursor Follower — Poster Slide 2' ),
	'slide-3' => array( 'poster-slide-3.svg', 1200, 800, 'Cursor Follower — Poster Slide 3' ),
);

$arts_cf_svg = array();

$arts_cf_svg['hint-1'] = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <pattern id="ph1" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="28" stroke="#2AA9B5" stroke-width="3" opacity="0.3"/>
      <line x1="14" y1="0" x2="14" y2="28" stroke="#2AA9B5" stroke-width="1" opacity="0.18"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="#0B0B0D"/>
  <rect width="1200" height="900" fill="url(#ph1)"/>
</svg>
SVG;

$arts_cf_svg['hint-2'] = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <pattern id="ph2" width="40" height="40" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="3" fill="#2B2F7A" opacity="0.85"/>
      <circle cx="30" cy="30" r="3" fill="#2AA9B5" opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="#0B0B0D"/>
  <rect width="1200" height="900" fill="url(#ph2)"/>
</svg>
SVG;

$arts_cf_svg['hint-3'] = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">
  <defs>
    <pattern id="ph3" width="60" height="104" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#2AA9B5" stroke-width="1.5" opacity="0.17">
        <path d="M0 0 L30 52 L0 104"/>
        <path d="M60 0 L30 52 L60 104"/>
        <path d="M0 0 L60 0 M0 104 L60 104"/>
      </g>
    </pattern>
  </defs>
  <rect width="1200" height="900" fill="#0B0B0D"/>
  <rect width="1200" height="900" fill="url(#ph3)"/>
</svg>
SVG;

$arts_cf_svg['slide-1'] = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <pattern id="ps1" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="#2AA9B5" stroke-width="1" opacity="0.3"/>
    </pattern>
    <pattern id="ps1b" width="192" height="192" patternUnits="userSpaceOnUse">
      <path d="M192 0H0V192" fill="none" stroke="#2AA9B5" stroke-width="2" opacity="0.5"/>
    </pattern>
  </defs>
  <rect width="1200" height="800" fill="#0B0B0D"/>
  <rect width="1200" height="800" fill="url(#ps1)"/>
  <rect width="1200" height="800" fill="url(#ps1b)"/>
</svg>
SVG;

$arts_cf_svg['slide-2'] = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <pattern id="ps2" width="64" height="64" patternUnits="userSpaceOnUse">
      <g stroke="#2B2F7A" stroke-width="2" opacity="0.75" stroke-linecap="round">
        <path d="M16 8 v16 M8 16 h16"/>
        <path d="M48 40 v16 M40 48 h16"/>
      </g>
      <g stroke="#2AA9B5" stroke-width="2" opacity="0.3" stroke-linecap="round">
        <path d="M48 8 v16 M40 16 h16"/>
        <path d="M16 40 v16 M8 48 h16"/>
      </g>
    </pattern>
  </defs>
  <rect width="1200" height="800" fill="#0B0B0D"/>
  <rect width="1200" height="800" fill="url(#ps2)"/>
</svg>
SVG;

$arts_cf_svg['slide-3'] = <<<'SVG'
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800">
  <defs>
    <pattern id="ps3" width="80" height="80" patternUnits="userSpaceOnUse">
      <g fill="none" stroke="#2AA9B5" stroke-width="1.5">
        <circle cx="0" cy="0" r="26" opacity="0.5"/>
        <circle cx="80" cy="0" r="26" opacity="0.5"/>
        <circle cx="0" cy="80" r="26" opacity="0.5"/>
        <circle cx="80" cy="80" r="26" opacity="0.5"/>
        <circle cx="40" cy="40" r="26" opacity="0.28"/>
      </g>
    </pattern>
  </defs>
  <rect width="1200" height="800" fill="#0B0B0D"/>
  <rect width="1200" height="800" fill="url(#ps3)"/>
</svg>
SVG;


$arts_cf_page_json = <<<'JSON'
[
 {
  "id": "2c3acd1",
  "elType": "container",
  "settings": {
   "content_width": "full",
   "min_height": {
    "unit": "vh",
    "size": 100,
    "sizes": []
   },
   "min_height_tablet": {
    "unit": "vh",
    "size": "",
    "sizes": []
   },
   "min_height_mobile": {
    "unit": "vh",
    "size": "",
    "sizes": []
   },
   "flex_direction": "row",
   "flex_justify_content": "center",
   "flex_align_items": "center",
   "flex_gap": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "px",
    "size": null
   },
   "flex_wrap": "wrap",
   "background_background": "classic",
   "background_color": "#181818",
   "arts_cursor_container": "yes",
   "padding": {
    "unit": "px",
    "top": "200",
    "right": "20",
    "bottom": "200",
    "left": "20",
    "isLinked": false
   },
   "padding_tablet": {
    "unit": "px",
    "top": "120",
    "right": "32",
    "bottom": "120",
    "left": "32",
    "isLinked": false
   },
   "padding_mobile": {
    "unit": "px",
    "top": "80",
    "right": "20",
    "bottom": "80",
    "left": "20",
    "isLinked": false
   }
  },
  "elements": [
   {
    "id": "85176e2",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "flex_direction": "row",
     "flex_justify_content": "center",
     "flex_gap": {
      "column": "2",
      "row": "2",
      "isLinked": true,
      "unit": "rem",
      "size": 2
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_wrap": "wrap"
    },
    "elements": [
     {
      "id": "773bcab",
      "elType": "container",
      "settings": {
       "content_width": "full",
       "width": {
        "unit": "px",
        "size": 900,
        "sizes": []
       },
       "flex_align_items": "center",
       "flex_gap": {
        "column": "1",
        "row": "1",
        "isLinked": true,
        "unit": "rem",
        "size": 1
       },
       "flex_gap_tablet": {
        "column": "",
        "row": "",
        "isLinked": true,
        "unit": "rem",
        "size": null
       },
       "flex_gap_mobile": {
        "column": "",
        "row": "",
        "isLinked": true,
        "unit": "rem",
        "size": null
       }
      },
      "elements": [
       {
        "id": "18eba27",
        "elType": "widget",
        "settings": {
         "title": "Free plugin for Elementor",
         "typography_typography": "custom",
         "typography_font_family": "Space Grotesk",
         "typography_font_size": {
          "unit": "px",
          "size": 16,
          "sizes": []
         },
         "typography_font_weight": "700",
         "typography_text_transform": "uppercase",
         "typography_letter_spacing": {
          "unit": "em",
          "size": 0.1,
          "sizes": []
         },
         "typography_letter_spacing_tablet": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_letter_spacing_mobile": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "title_color": "#888888",
         "typography_font_size_mobile": {
          "unit": "px",
          "size": 13,
          "sizes": []
         }
        },
        "elements": [],
        "widgetType": "heading"
       },
       {
        "id": "90c35fb",
        "elType": "widget",
        "settings": {
         "title": "Cursor Follower",
         "typography_typography": "custom",
         "typography_font_family": "Space Grotesk",
         "typography_font_size": {
          "unit": "px",
          "size": 96,
          "sizes": []
         },
         "typography_font_weight": "300",
         "typography_letter_spacing": {
          "unit": "em",
          "size": -0.05,
          "sizes": []
         },
         "typography_letter_spacing_tablet": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_letter_spacing_mobile": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "title_color": "#DDDDDD",
         "typography_font_size_tablet": {
          "unit": "px",
          "size": 64,
          "sizes": []
         },
         "typography_font_size_mobile": {
          "unit": "px",
          "size": 40,
          "sizes": []
         }
        },
        "elements": [],
        "widgetType": "heading"
       },
       {
        "id": "9879d4a",
        "elType": "widget",
        "settings": {
         "editor": "<p>Magnetic buttons, link highlights, hints and drag affordances. Zero bytes downloaded on touch devices.</p>",
         "align": "center",
         "typography_typography": "custom",
         "typography_font_family": "Space Grotesk",
         "typography_font_weight": "400",
         "paragraph_spacing": {
          "unit": "px",
          "size": 0,
          "sizes": []
         },
         "text_color": "#FFFFFF",
         "_element_width": "initial",
         "_element_custom_width": {
          "unit": "px",
          "size": 600,
          "sizes": []
         }
        },
        "elements": [],
        "widgetType": "text-editor"
       }
      ],
      "isInner": true
     },
     {
      "id": "20f4af7",
      "elType": "container",
      "settings": {
       "content_width": "full",
       "width": {
        "unit": "%",
        "size": 100,
        "sizes": []
       },
       "width_tablet": {
        "unit": "%",
        "size": "",
        "sizes": []
       },
       "width_mobile": {
        "unit": "%",
        "size": "",
        "sizes": []
       },
       "flex_direction": "row",
       "flex_justify_content": "center",
       "flex_gap": {
        "column": "1",
        "row": "1",
        "isLinked": true,
        "unit": "rem",
        "size": 1
       },
       "flex_gap_tablet": {
        "column": "",
        "row": "",
        "isLinked": true,
        "unit": "rem",
        "size": null
       },
       "flex_gap_mobile": {
        "column": "",
        "row": "",
        "isLinked": true,
        "unit": "rem",
        "size": null
       },
       "flex_wrap": "wrap"
      },
      "elements": [
       {
        "id": "b405f7c",
        "elType": "widget",
        "settings": {
         "text": "Try the effects",
         "link": {
          "url": "#effects",
          "is_external": "",
          "nofollow": "",
          "custom_attributes": ""
         },
         "selected_icon": {
          "value": "fas fa-magic",
          "library": "fa-solid"
         },
         "typography_typography": "custom",
         "typography_font_family": "Space Grotesk",
         "typography_font_size": {
          "unit": "px",
          "size": 13,
          "sizes": []
         },
         "typography_font_size_tablet": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_font_size_mobile": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_font_weight": "700",
         "typography_text_transform": "uppercase",
         "typography_letter_spacing": {
          "unit": "em",
          "size": 0.1,
          "sizes": []
         },
         "typography_letter_spacing_tablet": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_letter_spacing_mobile": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "button_text_color": "#FFFFFF",
         "button_background_hover_color": "#26262600",
         "border_border": "solid",
         "border_color": "#FFFFFF",
         "border_radius": {
          "unit": "px",
          "top": "999",
          "right": "999",
          "bottom": "999",
          "left": "999",
          "isLinked": true
         },
         "text_padding": {
          "unit": "em",
          "top": "1.5",
          "right": "2.5",
          "bottom": "1.5",
          "left": "2.5",
          "isLinked": false
         },
         "text_padding_tablet": {
          "unit": "em",
          "top": "",
          "right": "",
          "bottom": "",
          "left": "",
          "isLinked": true
         },
         "text_padding_mobile": {
          "unit": "em",
          "top": "",
          "right": "",
          "bottom": "",
          "left": "",
          "isLinked": true
         },
         "arts_cursor_magnetic": "yes",
         "__globals__": {
          "button_background_hover_color": ""
         },
         "background_color": "#26262600"
        },
        "elements": [],
        "widgetType": "button"
       },
       {
        "id": "9827d4b",
        "elType": "widget",
        "settings": {
         "text": "See Configuration",
         "link": {
          "url": "#configuration",
          "is_external": "",
          "nofollow": "",
          "custom_attributes": ""
         },
         "selected_icon": {
          "value": "fas fa-magic",
          "library": "fa-solid"
         },
         "typography_typography": "custom",
         "typography_font_family": "Space Grotesk",
         "typography_font_size": {
          "unit": "px",
          "size": 13,
          "sizes": []
         },
         "typography_font_size_tablet": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_font_size_mobile": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_font_weight": "700",
         "typography_text_transform": "uppercase",
         "typography_letter_spacing": {
          "unit": "em",
          "size": 0.1,
          "sizes": []
         },
         "typography_letter_spacing_tablet": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "typography_letter_spacing_mobile": {
          "unit": "em",
          "size": "",
          "sizes": []
         },
         "button_text_color": "#FFFFFF",
         "button_background_hover_color": "#26262600",
         "button_hover_border_color": "#FFFFFF",
         "border_border": "solid",
         "border_color": "#FFFFFF33",
         "border_radius": {
          "unit": "px",
          "top": "999",
          "right": "999",
          "bottom": "999",
          "left": "999",
          "isLinked": true
         },
         "text_padding": {
          "unit": "em",
          "top": "1.5",
          "right": "2.5",
          "bottom": "1.5",
          "left": "2.5",
          "isLinked": false
         },
         "text_padding_tablet": {
          "unit": "em",
          "top": "",
          "right": "",
          "bottom": "",
          "left": "",
          "isLinked": true
         },
         "text_padding_mobile": {
          "unit": "em",
          "top": "",
          "right": "",
          "bottom": "",
          "left": "",
          "isLinked": true
         },
         "arts_cursor_magnetic": "yes",
         "__globals__": {
          "button_background_hover_color": ""
         },
         "background_color": "#26262600"
        },
        "elements": [],
        "widgetType": "button"
       }
      ],
      "isInner": true
     }
    ],
    "isInner": true
   }
  ],
  "isInner": false
 },
 {
  "id": "da3221f",
  "elType": "container",
  "settings": {
   "content_width": "full",
   "flex_direction": "row",
   "flex_justify_content": "center",
   "flex_gap": {
    "column": "3",
    "row": "3",
    "isLinked": true,
    "unit": "rem",
    "size": 3
   },
   "flex_gap_tablet": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_gap_mobile": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_wrap": "wrap",
   "padding": {
    "unit": "px",
    "top": "200",
    "right": "20",
    "bottom": "200",
    "left": "20",
    "isLinked": false
   },
   "_element_id": "effects",
   "padding_tablet": {
    "unit": "px",
    "top": "120",
    "right": "32",
    "bottom": "120",
    "left": "32",
    "isLinked": false
   },
   "padding_mobile": {
    "unit": "px",
    "top": "80",
    "right": "20",
    "bottom": "80",
    "left": "20",
    "isLinked": false
   }
  },
  "elements": [
   {
    "id": "91f7820",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "%",
      "size": 100,
      "sizes": []
     },
     "width_tablet": {
      "unit": "%",
      "size": "",
      "sizes": []
     },
     "width_mobile": {
      "unit": "%",
      "size": "",
      "sizes": []
     },
     "flex_align_items": "center",
     "flex_gap": {
      "column": "1",
      "row": "1",
      "isLinked": true,
      "unit": "rem",
      "size": 1
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "5de5de0",
      "elType": "widget",
      "settings": {
       "title": "Hover over icons",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 16,
        "sizes": []
       },
       "typography_font_weight": "700",
       "typography_text_transform": "uppercase",
       "typography_letter_spacing": {
        "unit": "em",
        "size": 0.1,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#888888",
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 13,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     },
     {
      "id": "85e92a4",
      "elType": "widget",
      "settings": {
       "title": "Small, native, yours to style",
       "align": "center",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 64,
        "sizes": []
       },
       "typography_font_weight": "300",
       "typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#666666",
       "typography_font_size_tablet": {
        "unit": "px",
        "size": 48,
        "sizes": []
       },
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 32,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     }
    ],
    "isInner": true
   },
   {
    "id": "03ad851",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "px",
      "size": 900,
      "sizes": []
     },
     "flex_direction": "row",
     "flex_wrap": "wrap",
     "flex_gap": {
      "column": "3",
      "row": "3",
      "isLinked": true,
      "unit": "rem",
      "size": 3
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "70371ab",
      "elType": "widget",
      "settings": {
       "selected_icon": {
        "value": "fas fa-cog",
        "library": "fa-solid"
       },
       "title_text": "Zero config",
       "description_text": "Widgets, carousels and the lightbox are wired the moment you activate.",
       "link": {
        "url": "#",
        "is_external": "",
        "nofollow": "",
        "custom_attributes": ""
       },
       "icon_space": {
        "unit": "rem",
        "size": 0,
        "sizes": []
       },
       "icon_space_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_space_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_bottom_space": {
        "unit": "px",
        "size": 0,
        "sizes": []
       },
       "primary_color": "#FFFFFF",
       "icon_size": {
        "unit": "rem",
        "size": 3,
        "sizes": []
       },
       "icon_size_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_size_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_typography_typography": "custom",
       "title_typography_font_family": "Space Grotesk",
       "title_typography_font_size": {
        "unit": "px",
        "size": 36,
        "sizes": []
       },
       "title_typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "title_typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#666666",
       "hover_title_color": "#000000",
       "hover_title_color_transition_duration": {
        "unit": "s",
        "size": 0.3,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_width_mobile": "inherit",
       "_element_custom_width": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_tablet": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": "",
        "sizes": []
       },
       "_flex_size": "grow",
       "view": "framed",
       "secondary_color": "#181818",
       "border_width": {
        "unit": "px",
        "top": "1",
        "right": "1",
        "bottom": "1",
        "left": "1",
        "isLinked": true
       },
       "__globals__": {
        "secondary_color": ""
       },
       "title_typography_font_size_tablet": {
        "unit": "px",
        "size": 28,
        "sizes": []
       },
       "title_typography_font_size_mobile": {
        "unit": "px",
        "size": 24,
        "sizes": []
       },
       "description_color": "#888888"
      },
      "elements": [],
      "widgetType": "icon-box"
     },
     {
      "id": "2144b2d",
      "elType": "widget",
      "settings": {
       "selected_icon": {
        "value": "fas fa-power-off",
        "library": "fa-solid"
       },
       "title_text": "Nothing on touch",
       "description_text": "A 1 KB gate loads the engine on the first mouse move. Phones get none of it.",
       "link": {
        "url": "#",
        "is_external": "",
        "nofollow": "",
        "custom_attributes": ""
       },
       "icon_space": {
        "unit": "rem",
        "size": 0,
        "sizes": []
       },
       "icon_space_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_space_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_bottom_space": {
        "unit": "px",
        "size": 0,
        "sizes": []
       },
       "primary_color": "#FFFFFF",
       "icon_size": {
        "unit": "rem",
        "size": 3,
        "sizes": []
       },
       "icon_size_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_size_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_typography_typography": "custom",
       "title_typography_font_family": "Space Grotesk",
       "title_typography_font_size": {
        "unit": "px",
        "size": 36,
        "sizes": []
       },
       "title_typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "title_typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#666666",
       "hover_title_color": "#000000",
       "hover_title_color_transition_duration": {
        "unit": "s",
        "size": 0.3,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_width_mobile": "inherit",
       "_element_custom_width": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_tablet": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": "",
        "sizes": []
       },
       "_flex_size": "grow",
       "view": "framed",
       "secondary_color": "#181818",
       "border_width": {
        "unit": "px",
        "top": "1",
        "right": "1",
        "bottom": "1",
        "left": "1",
        "isLinked": true
       },
       "__globals__": {
        "secondary_color": ""
       },
       "title_typography_font_size_tablet": {
        "unit": "px",
        "size": 28,
        "sizes": []
       },
       "title_typography_font_size_mobile": {
        "unit": "px",
        "size": 24,
        "sizes": []
       },
       "description_color": "#888888"
      },
      "elements": [],
      "widgetType": "icon-box"
     },
     {
      "id": "d4963d2",
      "elType": "widget",
      "settings": {
       "selected_icon": {
        "value": "fas fa-wave-square",
        "library": "fa-solid"
       },
       "title_text": "60 FPS",
       "description_text": "An allocation-free loop that sleeps the moment the pointer stops.",
       "link": {
        "url": "#",
        "is_external": "",
        "nofollow": "",
        "custom_attributes": ""
       },
       "icon_space": {
        "unit": "rem",
        "size": 0,
        "sizes": []
       },
       "icon_space_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_space_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_bottom_space": {
        "unit": "px",
        "size": 0,
        "sizes": []
       },
       "primary_color": "#FFFFFF",
       "icon_size": {
        "unit": "rem",
        "size": 3,
        "sizes": []
       },
       "icon_size_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_size_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_typography_typography": "custom",
       "title_typography_font_family": "Space Grotesk",
       "title_typography_font_size": {
        "unit": "px",
        "size": 36,
        "sizes": []
       },
       "title_typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "title_typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#666666",
       "hover_title_color": "#000000",
       "hover_title_color_transition_duration": {
        "unit": "s",
        "size": 0.3,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_width_mobile": "inherit",
       "_element_custom_width": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_tablet": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": "",
        "sizes": []
       },
       "_flex_size": "grow",
       "view": "framed",
       "secondary_color": "#181818",
       "border_width": {
        "unit": "px",
        "top": "1",
        "right": "1",
        "bottom": "1",
        "left": "1",
        "isLinked": true
       },
       "__globals__": {
        "secondary_color": ""
       },
       "title_typography_font_size_tablet": {
        "unit": "px",
        "size": 28,
        "sizes": []
       },
       "title_typography_font_size_mobile": {
        "unit": "px",
        "size": 24,
        "sizes": []
       },
       "description_color": "#888888"
      },
      "elements": [],
      "widgetType": "icon-box"
     },
     {
      "id": "32e4cad",
      "elType": "widget",
      "settings": {
       "selected_icon": {
        "value": "fas fa-paint-brush",
        "library": "fa-solid"
       },
       "title_text": "Customizable",
       "description_text": "Its own CSS layer and six theming variables. Your theme always wins.",
       "link": {
        "url": "#",
        "is_external": "",
        "nofollow": "",
        "custom_attributes": ""
       },
       "icon_space": {
        "unit": "rem",
        "size": 0,
        "sizes": []
       },
       "icon_space_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_space_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_bottom_space": {
        "unit": "px",
        "size": 0,
        "sizes": []
       },
       "primary_color": "#FFFFFF",
       "icon_size": {
        "unit": "rem",
        "size": 3,
        "sizes": []
       },
       "icon_size_tablet": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "icon_size_mobile": {
        "unit": "rem",
        "size": "",
        "sizes": []
       },
       "title_typography_typography": "custom",
       "title_typography_font_family": "Space Grotesk",
       "title_typography_font_size": {
        "unit": "px",
        "size": 36,
        "sizes": []
       },
       "title_typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "title_typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#666666",
       "hover_title_color": "#000000",
       "hover_title_color_transition_duration": {
        "unit": "s",
        "size": 0.3,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_width_mobile": "inherit",
       "_element_custom_width": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_tablet": {
        "unit": "%",
        "size": 40,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": "",
        "sizes": []
       },
       "_flex_size": "grow",
       "view": "framed",
       "secondary_color": "#181818",
       "border_width": {
        "unit": "px",
        "top": "1",
        "right": "1",
        "bottom": "1",
        "left": "1",
        "isLinked": true
       },
       "__globals__": {
        "secondary_color": ""
       },
       "title_typography_font_size_tablet": {
        "unit": "px",
        "size": 28,
        "sizes": []
       },
       "title_typography_font_size_mobile": {
        "unit": "px",
        "size": 24,
        "sizes": []
       },
       "description_color": "#888888"
      },
      "elements": [],
      "widgetType": "icon-box"
     }
    ],
    "isInner": true
   }
  ],
  "isInner": false
 },
 {
  "id": "13a3c79",
  "elType": "container",
  "settings": {
   "content_width": "full",
   "flex_direction": "row",
   "flex_justify_content": "center",
   "flex_align_items": "center",
   "flex_gap": {
    "column": "3",
    "row": "3",
    "isLinked": true,
    "unit": "rem",
    "size": 3
   },
   "flex_gap_tablet": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_gap_mobile": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_wrap": "wrap",
   "background_background": "classic",
   "background_color": "#181818",
   "padding": {
    "unit": "px",
    "top": "200",
    "right": "20",
    "bottom": "200",
    "left": "20",
    "isLinked": false
   },
   "padding_tablet": {
    "unit": "px",
    "top": "120",
    "right": "32",
    "bottom": "120",
    "left": "32",
    "isLinked": false
   },
   "padding_mobile": {
    "unit": "px",
    "top": "80",
    "right": "20",
    "bottom": "80",
    "left": "20",
    "isLinked": false
   }
  },
  "elements": [
   {
    "id": "4b7acb1",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "flex_align_items": "center",
     "flex_gap": {
      "column": "1",
      "row": "1",
      "isLinked": true,
      "unit": "rem",
      "size": 1
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "72cb732",
      "elType": "widget",
      "settings": {
       "title": "Text & Icon hints",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 16,
        "sizes": []
       },
       "typography_font_weight": "700",
       "typography_text_transform": "uppercase",
       "typography_letter_spacing": {
        "unit": "em",
        "size": 0.1,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#888888",
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 13,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     },
     {
      "id": "7da1029",
      "elType": "widget",
      "settings": {
       "title": "The cursor tells you what a click will do",
       "align": "center",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 64,
        "sizes": []
       },
       "typography_font_weight": "300",
       "typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#DDDDDD",
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "px",
        "size": 720,
        "sizes": []
       },
       "typography_font_size_tablet": {
        "unit": "px",
        "size": 48,
        "sizes": []
       },
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 32,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     }
    ],
    "isInner": true
   },
   {
    "id": "34e92ff",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "px",
      "size": 1300,
      "sizes": []
     },
     "flex_direction": "row",
     "flex_gap": {
      "column": "3",
      "row": "3",
      "isLinked": true,
      "unit": "rem",
      "size": 3
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_direction_mobile": "column"
    },
    "elements": [
     {
      "id": "32a849d",
      "elType": "widget",
      "settings": {
       "image_size": "full",
       "caption_source": "custom",
       "caption": "Opens the lightbox",
       "link_to": "file",
       "open_lightbox": "yes",
       "text_color": "#FFFFFF",
       "arts_cursor_image": "yes",
       "_flex_size": "shrink",
       "image": {
        "url": "https://fluid-ds.local/wp-content/uploads/2026/08/poster-hint-1.svg",
        "id": 10818,
        "size": "",
        "alt": "",
        "source": "library"
       },
       "width": {
        "unit": "%",
        "size": 100,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "%",
        "size": 30,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": 100,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "image"
     },
     {
      "id": "4cb138c",
      "elType": "widget",
      "settings": {
       "image_size": "full",
       "caption_source": "custom",
       "caption": "Opens the lightbox too",
       "link_to": "file",
       "open_lightbox": "yes",
       "text_color": "#FFFFFF",
       "arts_cursor_image": "yes",
       "arts_cursor_image_content": "icon",
       "_flex_size": "shrink",
       "image": {
        "url": "https://fluid-ds.local/wp-content/uploads/2026/08/poster-hint-2.svg",
        "id": 10819,
        "size": "",
        "alt": "",
        "source": "library"
       },
       "width": {
        "unit": "%",
        "size": 100,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "%",
        "size": 30,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": 100,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "image"
     },
     {
      "id": "052e059",
      "elType": "widget",
      "settings": {
       "image_size": "full",
       "caption_source": "custom",
       "caption": "Just links elsewhere",
       "link_to": "custom",
       "link": {
        "url": "#",
        "is_external": "",
        "nofollow": "",
        "custom_attributes": ""
       },
       "open_lightbox": "yes",
       "text_color": "#FFFFFF",
       "arts_cursor_image": "yes",
       "arts_cursor_image_label": "View Project",
       "_flex_size": "shrink",
       "image": {
        "url": "https://fluid-ds.local/wp-content/uploads/2026/08/poster-hint-3.svg",
        "id": 10820,
        "size": "",
        "alt": "",
        "source": "library"
       },
       "width": {
        "unit": "%",
        "size": 100,
        "sizes": []
       },
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "%",
        "size": 30,
        "sizes": []
       },
       "_element_custom_width_mobile": {
        "unit": "%",
        "size": 100,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "image"
     }
    ],
    "isInner": true
   }
  ],
  "isInner": false
 },
 {
  "id": "a6335cd",
  "elType": "container",
  "settings": {
   "content_width": "full",
   "flex_direction": "row",
   "flex_justify_content": "center",
   "flex_gap": {
    "column": "3",
    "row": "3",
    "isLinked": true,
    "unit": "rem",
    "size": 3
   },
   "flex_gap_tablet": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_gap_mobile": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_wrap": "wrap",
   "padding": {
    "unit": "px",
    "top": "200",
    "right": "20",
    "bottom": "200",
    "left": "20",
    "isLinked": false
   },
   "padding_tablet": {
    "unit": "px",
    "top": "120",
    "right": "32",
    "bottom": "120",
    "left": "32",
    "isLinked": false
   },
   "padding_mobile": {
    "unit": "px",
    "top": "80",
    "right": "20",
    "bottom": "80",
    "left": "20",
    "isLinked": false
   }
  },
  "elements": [
   {
    "id": "a8da041",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "%",
      "size": 100,
      "sizes": []
     },
     "width_tablet": {
      "unit": "%",
      "size": "",
      "sizes": []
     },
     "width_mobile": {
      "unit": "%",
      "size": "",
      "sizes": []
     },
     "flex_align_items": "center",
     "flex_gap": {
      "column": "1",
      "row": "1",
      "isLinked": true,
      "unit": "rem",
      "size": 1
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "66b902f",
      "elType": "widget",
      "settings": {
       "title": "Hover over controls and indicators",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 16,
        "sizes": []
       },
       "typography_font_weight": "700",
       "typography_text_transform": "uppercase",
       "typography_letter_spacing": {
        "unit": "em",
        "size": 0.1,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#888888",
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 13,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     },
     {
      "id": "85893ca",
      "elType": "widget",
      "settings": {
       "title": "Enhances carousels too",
       "align": "center",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 64,
        "sizes": []
       },
       "typography_font_weight": "300",
       "typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#666666",
       "typography_font_size_tablet": {
        "unit": "px",
        "size": 48,
        "sizes": []
       },
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 32,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     }
    ],
    "isInner": true
   },
   {
    "id": "988f1a7",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "px",
      "size": 1300,
      "sizes": []
     },
     "flex_direction": "row",
     "flex_wrap": "wrap",
     "flex_gap": {
      "column": "3",
      "row": "3",
      "isLinked": true,
      "unit": "rem",
      "size": 3
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "32fde2c",
      "elType": "widget",
      "settings": {
       "carousel_name": "Image Carousel",
       "carousel": [
        {
         "id": 10821,
         "url": "https://fluid-ds.local/wp-content/uploads/2026/08/poster-slide-1.svg"
        },
        {
         "id": 10822,
         "url": "https://fluid-ds.local/wp-content/uploads/2026/08/poster-slide-2.svg"
        },
        {
         "id": 10823,
         "url": "https://fluid-ds.local/wp-content/uploads/2026/08/poster-slide-3.svg"
        }
       ],
       "thumbnail_size": "full",
       "image_spacing": "custom",
       "image_spacing_custom": {
        "unit": "px",
        "size": 10,
        "sizes": []
       },
       "arrows_color": "#181818",
       "dots_color": "#181818"
      },
      "elements": [],
      "widgetType": "image-carousel"
     }
    ],
    "isInner": true
   }
  ],
  "isInner": false
 },
 {
  "id": "f6883ec",
  "elType": "container",
  "settings": {
   "content_width": "full",
   "flex_direction": "row",
   "flex_justify_content": "center",
   "flex_align_items": "center",
   "flex_gap": {
    "column": "3",
    "row": "3",
    "isLinked": true,
    "unit": "rem",
    "size": 3
   },
   "flex_gap_tablet": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_gap_mobile": {
    "column": "",
    "row": "",
    "isLinked": true,
    "unit": "rem",
    "size": null
   },
   "flex_wrap": "wrap",
   "background_background": "classic",
   "background_color": "#181818",
   "padding": {
    "unit": "px",
    "top": "200",
    "right": "20",
    "bottom": "48",
    "left": "20",
    "isLinked": false
   },
   "_element_id": "configuration",
   "padding_tablet": {
    "unit": "px",
    "top": "120",
    "right": "32",
    "bottom": "48",
    "left": "32",
    "isLinked": false
   },
   "padding_mobile": {
    "unit": "px",
    "top": "80",
    "right": "20",
    "bottom": "40",
    "left": "20",
    "isLinked": false
   }
  },
  "elements": [
   {
    "id": "60c09d6",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "flex_align_items": "center",
     "flex_gap": {
      "column": "1",
      "row": "1",
      "isLinked": true,
      "unit": "rem",
      "size": 1
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "29af1b0",
      "elType": "widget",
      "settings": {
       "title": "Nothing above was code",
       "align": "center",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 64,
        "sizes": []
       },
       "typography_font_weight": "300",
       "typography_letter_spacing": {
        "unit": "em",
        "size": -0.03,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "title_color": "#DDDDDD",
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "px",
        "size": 720,
        "sizes": []
       },
       "typography_font_size_tablet": {
        "unit": "px",
        "size": 48,
        "sizes": []
       },
       "typography_font_size_mobile": {
        "unit": "px",
        "size": 32,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "heading"
     },
     {
      "id": "5fe5c33",
      "elType": "widget",
      "settings": {
       "editor": "<p>Settings are adjustable from <strong>Elementor → Site Settings → Cursor Follower </strong>panel. Per-widget switches live in each widget's Style tab under <strong>Cursor Effects.</strong></p>",
       "align": "center",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_weight": "400",
       "paragraph_spacing": {
        "unit": "px",
        "size": 0,
        "sizes": []
       },
       "text_color": "#FFFFFF",
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "px",
        "size": 720,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "text-editor"
     },
     {
      "id": "df886f8",
      "elType": "widget",
      "settings": {
       "text": "Open Settings",
       "link": {
        "url": "https://fluid-ds.local/wp-admin/post.php?post=10716&action=elementor&active-document=82&active-tab=arts-cursor",
        "is_external": "",
        "nofollow": "",
        "custom_attributes": ""
       },
       "selected_icon": {
        "value": "fab fa-elementor",
        "library": "fa-brands"
       },
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_size": {
        "unit": "px",
        "size": 13,
        "sizes": []
       },
       "typography_font_size_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_font_size_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_font_weight": "700",
       "typography_text_transform": "uppercase",
       "typography_letter_spacing": {
        "unit": "em",
        "size": 0.1,
        "sizes": []
       },
       "typography_letter_spacing_tablet": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "typography_letter_spacing_mobile": {
        "unit": "em",
        "size": "",
        "sizes": []
       },
       "button_text_color": "#FFFFFF",
       "button_background_hover_color": "#26262600",
       "border_border": "solid",
       "border_color": "#FFFFFF",
       "border_radius": {
        "unit": "px",
        "top": "999",
        "right": "999",
        "bottom": "999",
        "left": "999",
        "isLinked": true
       },
       "text_padding": {
        "unit": "em",
        "top": "1.5",
        "right": "2.5",
        "bottom": "1.5",
        "left": "2.5",
        "isLinked": false
       },
       "text_padding_tablet": {
        "unit": "em",
        "top": "",
        "right": "",
        "bottom": "",
        "left": "",
        "isLinked": true
       },
       "text_padding_mobile": {
        "unit": "em",
        "top": "",
        "right": "",
        "bottom": "",
        "left": "",
        "isLinked": true
       },
       "arts_cursor_magnetic": "yes",
       "__globals__": {
        "button_background_hover_color": ""
       },
       "background_color": "#26262600"
      },
      "elements": [],
      "widgetType": "button"
     }
    ],
    "isInner": true
   },
   {
    "id": "1ed3f4c",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "px",
      "size": 720,
      "sizes": []
     },
     "flex_direction": "row",
     "flex_gap": {
      "column": "3",
      "row": "3",
      "isLinked": true,
      "unit": "rem",
      "size": 3
     },
     "flex_gap_tablet": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     },
     "flex_gap_mobile": {
      "column": "",
      "row": "",
      "isLinked": true,
      "unit": "rem",
      "size": null
     }
    },
    "elements": [
     {
      "id": "786cad5",
      "elType": "widget",
      "settings": {
       "image_size": "full",
       "caption": "Opens the lightbox",
       "open_lightbox": "yes",
       "text_color": "#FFFFFF",
       "arts_cursor_image": "yes",
       "_flex_size": "shrink",
       "image": {
        "url": "https://fluid-ds.local/wp-content/uploads/2026/08/screenshot-2.png",
        "id": 10793,
        "size": "",
        "alt": "",
        "source": "library"
       }
      },
      "elements": [],
      "widgetType": "image"
     }
    ],
    "isInner": true
   },
   {
    "id": "30d24e2",
    "elType": "container",
    "settings": {
     "content_width": "full",
     "width": {
      "unit": "%",
      "size": 100,
      "sizes": []
     },
     "flex_align_items": "center"
    },
    "elements": [
     {
      "id": "db909c6",
      "elType": "widget",
      "settings": {
       "editor": "<p>Crafted by <a href=\"https://artemsemkin.com/\">Artem Semkin</a> </p>",
       "align": "center",
       "typography_typography": "custom",
       "typography_font_family": "Space Grotesk",
       "typography_font_weight": "400",
       "paragraph_spacing": {
        "unit": "px",
        "size": 0,
        "sizes": []
       },
       "text_color": "#FFFFFF",
       "_element_width": "initial",
       "_element_custom_width": {
        "unit": "px",
        "size": 600,
        "sizes": []
       },
       "link_color": "#888888",
       "link_hover_color": "#EEEEEE",
       "link_hover_color_transition_duration": {
        "unit": "s",
        "size": 0.3,
        "sizes": []
       }
      },
      "elements": [],
      "widgetType": "text-editor"
     }
    ],
    "isInner": true
   }
  ],
  "isInner": false
 }
]
JSON;

$arts_cf_kit_json = <<<'JSON'
{
 "arts_cursor_background_color": "#F2F1ED00",
 "arts_cursor_blend_mode": "difference",
 "arts_cursor_border_color": "#FFFFFF",
 "arts_cursor_duration": {
  "unit": "s",
  "size": 0.3,
  "sizes": []
 },
 "arts_cursor_elastic_strength": {
  "unit": "x",
  "size": 2,
  "sizes": []
 },
 "arts_cursor_highlight_background_color": "#FFFFFF1A",
 "arts_cursor_highlight_border_color": "#FFFFFF00",
 "arts_cursor_highlight_size": {
  "unit": "px",
  "size": 100,
  "sizes": []
 },
 "arts_cursor_hint_backdrop_blur": {
  "unit": "px",
  "size": 16,
  "sizes": []
 },
 "arts_cursor_hint_background_color": "#FFFFFF33",
 "arts_cursor_hint_border_color": "#F2F1ED00",
 "arts_cursor_hint_border_width": {
  "unit": "px",
  "size": 1,
  "sizes": []
 },
 "arts_cursor_hint_icon_size": {
  "unit": "px",
  "size": 20,
  "sizes": []
 },
 "arts_cursor_hint_offset_x": {
  "unit": "px",
  "size": 50,
  "sizes": []
 },
 "arts_cursor_hint_offset_y": {
  "unit": "px",
  "size": 50,
  "sizes": []
 },
 "arts_cursor_hint_text_color": "#FFFFFF",
 "arts_cursor_hint_typography_font_family": "Raleway",
 "arts_cursor_hint_typography_font_size": {
  "unit": "custom",
  "size": "clamp(0.625rem, 0.5817rem + 0.1923vw, 0.8125rem)",
  "sizes": []
 },
 "arts_cursor_hint_typography_font_weight": "700",
 "arts_cursor_hint_typography_letter_spacing": {
  "unit": "px",
  "size": "2",
  "sizes": []
 },
 "arts_cursor_hint_typography_line_height": {
  "unit": "em",
  "size": "1.3",
  "sizes": []
 },
 "arts_cursor_hint_typography_text_transform": "uppercase",
 "arts_cursor_hint_typography_typography": "custom",
 "arts_cursor_lightbox_drag_style": "arrows",
 "arts_cursor_magnetic_background_color": "#F2F1ED00",
 "arts_cursor_magnetic_border_width": {
  "unit": "px",
  "size": 2,
  "sizes": []
 },
 "arts_cursor_press_scale": {
  "unit": "x",
  "size": 0.92,
  "sizes": []
 },
 "arts_cursor_text_color": "#FFFFFF"
}
JSON;

$arts_cf_log = static function ( string $message ): void {
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		WP_CLI::log( $message );
	}
};

$arts_cf_fail = static function ( string $message ): void {
	if ( defined( 'WP_CLI' ) && WP_CLI ) {
		WP_CLI::error( $message );
	}
	throw new RuntimeException( $message );
};

$upload = wp_upload_dir();

if ( ! empty( $upload['error'] ) ) {
	$arts_cf_fail( $upload['error'] );
}

/**
 * Writes a file into uploads and registers it as an attachment, reusing one
 * previously created under the same key.
 *
 * Neither asset can go through the media uploader: SVG is not on WordPress's
 * mime whitelist, and nothing here runs an SVG-enabling plugin. Inserting the
 * attachment directly bypasses that, since the whitelist only guards uploads.
 *
 * The metadata is hand-written because generate_attachment_metadata() would
 * hand the file to the image editor, which cannot measure an SVG (getimagesize
 * does not read one) and would record zeros. No `sizes` array: every consuming
 * widget is set to `full`.
 */
$arts_cf_attach = static function (
	string $key,
	string $filename,
	string $bytes,
	int $width,
	int $height,
	string $title,
	string $mime
) use ( $upload, $arts_cf_fail ): array {
	$existing = get_posts(
		array(
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => 1,
			'meta_key'       => '_arts_cf_asset',
			'meta_value'     => $key,
			'fields'         => 'ids',
		)
	);

	$target = "{$upload['path']}/{$filename}";

	if ( false === file_put_contents( $target, $bytes ) ) {
		$arts_cf_fail( "Could not write {$target}" );
	}

	$relative = ltrim( str_replace( $upload['basedir'], '', $target ), '/' );
	$id       = $existing ? (int) $existing[0] : 0;

	if ( $id ) {
		wp_update_post( array( 'ID' => $id, 'post_title' => $title, 'post_mime_type' => $mime ) );
		update_post_meta( $id, '_wp_attached_file', $relative );
	} else {
		$id = wp_insert_attachment(
			array(
				'post_mime_type' => $mime,
				'post_title'     => $title,
				'post_content'   => '',
				'post_status'    => 'inherit',
			),
			$target,
			0,
			true
		);

		if ( is_wp_error( $id ) ) {
			$arts_cf_fail( $id->get_error_message() );
		}

		update_post_meta( $id, '_arts_cf_asset', $key );
	}

	wp_update_attachment_metadata(
		$id,
		array(
			'width'  => $width,
			'height' => $height,
			'file'   => $relative,
			'sizes'  => array(),
		)
	);

	return array( 'id' => (int) $id, 'url' => "{$upload['url']}/{$filename}" );
};

$assets = array();

foreach ( $arts_cf_posters as $key => list( $filename, $width, $height, $title ) ) {
	$assets[ $key ] = $arts_cf_attach(
		$key,
		$filename,
		$arts_cf_svg[ $key ],
		$width,
		$height,
		$title,
		'image/svg+xml'
	);
}

// Fetched, not embedded — see the header. A failure here is deliberately not
// fatal: the settings band loses one image and the rest of the page still
// seeds, which is a better preview than none at all.
$arts_cf_panel = wp_remote_get(
	'https://ps.w.org/cursor-follower-for-elementor/assets/screenshot-2.png',
	array( 'timeout' => 20 )
);

if ( ! is_wp_error( $arts_cf_panel ) && 200 === (int) wp_remote_retrieve_response_code( $arts_cf_panel ) ) {
	$arts_cf_png = wp_remote_retrieve_body( $arts_cf_panel );

	if ( '' !== $arts_cf_png ) {
		$assets['panel'] = $arts_cf_attach(
			'panel',
			'cursor-follower-site-settings.png',
			$arts_cf_png,
			1520,
			1520,
			'Cursor Follower — Site Settings',
			'image/png'
		);
	}
}

// --- Persist ------------------------------------------------------------------

$slug     = 'cursor-follower-demo';
$existing = get_page_by_path( $slug );

$post_id = $existing ? $existing->ID : wp_insert_post(
	array(
		'import_id'   => ARTS_CF_DEMO_PAGE_ID,
		'post_type'   => 'page',
		'post_status' => 'publish',
		'post_title'  => 'Cursor Follower Demo',
		'post_name'   => $slug,
	),
	true
);

if ( is_wp_error( $post_id ) ) {
	$arts_cf_fail( $post_id->get_error_message() );
}

$kit_id = 0;

if ( class_exists( '\Elementor\Plugin' ) && \Elementor\Plugin::$instance && \Elementor\Plugin::$instance->kits_manager ) {
	$kit_id = (int) \Elementor\Plugin::$instance->kits_manager->get_active_id();
}

$elements = json_decode( $arts_cf_page_json, true );

if ( ! is_array( $elements ) ) {
	$arts_cf_fail( 'Embedded page JSON did not decode: ' . json_last_error_msg() );
}

/**
 * Rewrites everything in the exported body that was specific to the site it was
 * exported from. Keyed on stable content rather than on position:
 *
 * - the three Hints images by their caption, and only when caption_source is
 *   'custom' — the panel screenshot further down carries a leftover copy of the
 *   first caption but never renders it
 * - the carousel by widget type
 * - the editor deep link by the action=elementor in its href
 */
$hint_captions = array(
	'Opens the lightbox'     => 'hint-1',
	'Opens the lightbox too' => 'hint-2',
	'Just links elsewhere'   => 'hint-3',
);

$settings_url = $kit_id
	? add_query_arg(
		array(
			'post'            => $post_id,
			'action'          => 'elementor',
			'active-document' => $kit_id,
			'active-tab'      => 'arts-cursor',
		),
		admin_url( 'post.php' )
	)
	: admin_url( 'admin.php?page=elementor' );

$rewrite = static function ( array &$nodes ) use (
	&$rewrite,
	$assets,
	$hint_captions,
	$settings_url
): void {
	foreach ( $nodes as &$node ) {
		$settings = $node['settings'] ?? array();
		$widget   = $node['widgetType'] ?? '';

		if ( 'image' === $widget ) {
			$caption = $settings['caption'] ?? '';
			$key     = ( 'custom' === ( $settings['caption_source'] ?? '' ) && isset( $hint_captions[ $caption ] ) )
				? $hint_captions[ $caption ]
				: ( ! empty( $settings['image'] ) ? 'panel' : '' );

			// isset(), not just $key: the panel screenshot is fetched at run
			// time and may legitimately be absent.
			if ( $key && isset( $assets[ $key ] ) ) {
				$settings['image'] = array(
					'url'    => $assets[ $key ]['url'],
					'id'     => $assets[ $key ]['id'],
					'size'   => '',
					'alt'    => '',
					'source' => 'library',
				);
			}
		}

		if ( 'image-carousel' === $widget ) {
			$settings['carousel'] = array(
				array( 'id' => $assets['slide-1']['id'], 'url' => $assets['slide-1']['url'] ),
				array( 'id' => $assets['slide-2']['id'], 'url' => $assets['slide-2']['url'] ),
				array( 'id' => $assets['slide-3']['id'], 'url' => $assets['slide-3']['url'] ),
			);
		}

		if ( 'button' === $widget && str_contains( (string) ( $settings['link']['url'] ?? '' ), 'action=elementor' ) ) {
			$settings['link']['url'] = $settings_url;
		}

		$node['settings'] = $settings;

		if ( ! empty( $node['elements'] ) && is_array( $node['elements'] ) ) {
			$rewrite( $node['elements'] );
		}
	}
	unset( $node );
};

$rewrite( $elements );

$page_settings = array(
	'template'   => 'elementor_canvas',
	'hide_title' => 'yes',
);

// Mirrors Document::save()'s sequence (elementor/core/base/document.php).
update_post_meta( $post_id, '_elementor_page_settings', wp_slash( $page_settings ) );
update_post_meta( $post_id, '_elementor_data', wp_slash( wp_json_encode( $elements, JSON_UNESCAPED_UNICODE ) ) );
update_post_meta( $post_id, '_elementor_edit_mode', 'builder' );
update_post_meta( $post_id, '_elementor_template_type', 'wp-page' );
update_post_meta( $post_id, '_wp_page_template', 'elementor_canvas' );

if ( defined( 'ELEMENTOR_VERSION' ) ) {
	update_post_meta( $post_id, '_elementor_version', ELEMENTOR_VERSION );
}

// The cursor's own kit settings — the styling the demo is built around, blend
// mode Difference above all. Only control IDs that exist in SiteSettingsTab /
// LightboxControls today are carried; the source kit still holds pre-1.0
// leftovers that nothing reads.
if ( $kit_id ) {
	$kit_settings = get_post_meta( $kit_id, '_elementor_page_settings', true );
	$kit_settings = is_array( $kit_settings ) ? $kit_settings : array();
	$cursor       = json_decode( $arts_cf_kit_json, true );

	if ( is_array( $cursor ) ) {
		update_post_meta( $kit_id, '_elementor_page_settings', wp_slash( array_merge( $kit_settings, $cursor ) ) );
	}

	if ( class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
		\Elementor\Core\Files\CSS\Post::create( $kit_id )->delete();
	}
}

// Post CSS never diffs (is_update_required() is hard-coded false) — delete to regen.
if ( class_exists( '\Elementor\Core\Files\CSS\Post' ) ) {
	\Elementor\Core\Files\CSS\Post::create( $post_id )->delete();
}

delete_post_meta( $post_id, '_elementor_element_cache' );

// The editor prefers newer autosave revisions over raw meta — remove them all.
foreach ( wp_get_post_revisions( $post_id, array( 'fields' => 'ids' ) ) as $revision_id ) {
	wp_delete_post_revision( $revision_id );
}

$arts_cf_log( sprintf( 'Demo page seeded: post_id=%d %s', $post_id, get_permalink( $post_id ) ) );

if ( defined( 'WP_CLI' ) && WP_CLI ) {
	WP_CLI::success( sprintf( '%d assets, kit %d.', count( $assets ), $kit_id ) );
}
