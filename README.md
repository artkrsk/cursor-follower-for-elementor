# Arts Cursor Follower for Elementor

[![Tests](https://img.shields.io/github/actions/workflow/status/artkrsk/cursor-follower-for-elementor/test.yml?style=flat-square&logo=githubactions&logoColor=white&label=tests)](https://github.com/artkrsk/cursor-follower-for-elementor/actions/workflows/test.yml)
[![PHP](https://img.shields.io/badge/PHP-8.0+-777bb4?style=flat-square&logo=php&logoColor=white)](https://www.php.net/)
[![WordPress](https://img.shields.io/badge/WordPress-6.0+-21759b?style=flat-square&logo=wordpress&logoColor=white)](https://wordpress.org)
[![Version](https://img.shields.io/wordpress/plugin/v/cursor-follower-for-elementor?style=flat-square&logo=wordpress&logoColor=white&label=wp.org)](https://wordpress.org/plugins/cursor-follower-for-elementor/)
[![Installs](https://img.shields.io/wordpress/plugin/installs/cursor-follower-for-elementor?style=flat-square)](https://wordpress.org/plugins/cursor-follower-for-elementor/)
[![Rating](https://img.shields.io/wordpress/plugin/rating/cursor-follower-for-elementor?style=flat-square)](https://wordpress.org/plugins/cursor-follower-for-elementor/reviews/)
[![License](https://img.shields.io/badge/license-GPLv3-blue?style=flat-square)](LICENSE)

An animated cursor follower for Elementor: magnetic buttons, link highlights, text and icon hints, drag effects. Loads nothing on touch devices.

Visitors get a ~1 KB inline loader and nothing else up front — the engine, under 20 KB gzipped including its CSS, arrives on the first mouse movement. No jQuery, no runtime dependencies.

## Quick Links

| Users                                                                                        | Developers                                                                                    |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [Guide](https://artkrsk.github.io/cursor-follower-for-elementor/guide)                       | [Developer reference](https://artkrsk.github.io/cursor-follower-for-elementor/developers)     |
| [Live effect demos](https://artkrsk.github.io/cursor-follower-for-elementor/effects)         | [Releases](https://github.com/artkrsk/cursor-follower-for-elementor/releases)                 |

Requires Elementor (the free version is fine).

## Development

```bash
git clone https://github.com/artkrsk/cursor-follower-for-elementor.git
cd cursor-follower-for-elementor
pnpm install
composer install
```

To mirror builds into a local WordPress site, copy `.env.example` to `.env` and point `DEV_TARGET` at the site's plugin directory:

```bash
DEV_TARGET="/Users/you/Local Sites/my-site/app/public/wp-content/plugins/cursor-follower-for-elementor"
```

### Commands

| Command            | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `pnpm docs:dev`    | Docs site on port 5200 — also the browser harness for the engine   |
| `pnpm dev:plugin`  | Watch-compile the bundle, mirroring to `DEV_TARGET` when set       |
| `pnpm build`       | Production build (creates the distribution ZIP)                    |
| `pnpm test`        | Vitest                                                             |
| `pnpm typecheck`   | `tsc --noEmit`                                                     |
| `pnpm lint`        | Biome                                                              |
| `pnpm phpstan`     | PHPStan at level max                                               |

A `pre-commit` hook runs the lint, typecheck, test and PHPStan gate; `pnpm install` installs it.

## License

[GPL-3.0-or-later](LICENSE)

---

Made by [Artem Semkin](https://artemsemkin.com)
