# Developing Kition Universe

How the site is built, run, checked and deployed. For what the site is, see the
[README](../README.md); for adding a product or a galaxy, see [CONTRIBUTING.md](../.github/CONTRIBUTING.md).

## Run

```bash
pnpm install
pnpm dev              # http://localhost:4330
pnpm build            # static site in dist/ (set SITE_URL for the real domain)
pnpm preview
pnpm check:data       # validates the data files and built replays (add --dist to scan the build)
pnpm check:links      # the same, and requests every documentation link
pnpm build:replays    # re-render agent replays through the kits (see Agent replays)
npx astro check       # types
```

`SITE_URL` drives canonical URLs, hreflang, sitemap.xml and OG URLs. The production
site is **https://universe.kition.ai**, its own site. To serve it under a path
instead, set `UNIVERSE_BASE` (for example `/universe`); every link and asset goes
through `src/lib/base.ts`, and `scripts/nest-dist.mjs` moves the build under that
path for Workers Static Assets.

Add `?mode=static` or `?mode=3d` to any URL to force the static map or the 3D scene.
The choice sticks for the rest of the tab session.

## Deploy to Cloudflare

This is a fully static site. Astro generates HTML, CSS, browser JavaScript,
PNG images and text files in `dist/`; Three.js runs in the browser. Production
needs no Node server, database, R2 bucket or Astro Cloudflare adapter.

`wrangler.jsonc` deploys `dist/` as **Workers Static Assets**, with directory
URLs, the generated `404.html`, and the custom domain `universe.kition.ai`.
The `kition.ai` zone must belong to the deploying Cloudflare account.

Use Node **24.22.1** (see `.node-version`) and pnpm **10.34.9**:

```bash
pnpm install --frozen-lockfile
pnpm exec wrangler login
pnpm run deploy
```

`pnpm run deploy` sets `SITE_URL=https://universe.kition.ai`, validates the site
URL and data, builds the site, checks the generated content, then uploads it. `SITE_URL` must be a public HTTPS origin;
it is required to prevent publishing SEO links pointing at localhost. For
automation, set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in the runner's
secret/environment settings instead of using `wrangler login`. The token needs
Workers Scripts edit, Zone read and Workers Routes edit access for this account
and zone. Never put credentials in the repository.

To check a release locally before uploading:

```bash
SITE_URL=https://universe.kition.ai pnpm build:cloudflare
pnpm exec wrangler deploy --dry-run
pnpm exec wrangler dev --port 8787  # http://localhost:8787/
```

For automatic deploys, connect this repository to the `kition-universe` Worker
in Cloudflare Workers Builds, using:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | repository root |
| Build command | `pnpm build:cloudflare` |
| Deploy command | `pnpm exec wrangler deploy` |
| Build variable `SITE_URL` | `https://universe.kition.ai` |
| Build variable `NODE_VERSION` | `24.22.1` |
| Build variable `PNPM_VERSION` | `10.34.9` |

If you use **Cloudflare Pages** instead, the same static build works: choose
the Astro preset, build with `pnpm build:cloudflare`, set the output directory
to `dist`, and use the build variables above. Configure the domain in Pages;
`wrangler.jsonc` describes the Workers deployment, not a Pages project.

References: [Static Assets](https://developers.cloudflare.com/workers/static-assets/),
[Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/),
[Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## How it is built

- **One data file.** `data/universe.yaml` holds the star, clusters, planets,
  capabilities ("buildings"), agent commands, stations and galaxies.
  The star map, catalog, planet pages, sitemap.xml, llms.txt and OG images are
  all generated from it. Every kit fact cites its source file in KitionAI/kition.
- **Astro, static output.** Pages live in `src/components/pages/*` and are
  rendered for `en` (root) and `zh` (`/zh/`). UI strings are in `src/i18n/ui.ts`.
- **Poster first, 3D second.** The home page and each planet page paint an SVG
  poster first (the LCP element, and the no-WebGL fallback with real links).
  The three.js scene is imported when the browser is idle and fades in on top.
  `src/lib/layout.ts` projects the poster with the same camera the scene opens
  with, so the swap does not jump.
- **Scenes.** `src/scripts/scene/universe.ts` (star map) and `planet.ts` (city).
  Each planet city has one signature landmark on its pole (a tower crane on cad,
  a projector tower on film), built in `signature.ts`.
- **AI and UI.** The Agent Relay connects the map to the KHP/MCP workflow;
  the Tessera station introduces the shared tokens, icons and editor components.
  Both have localized sections on the home page. Deep space is the default
  theme; a visitor's explicit light-theme choice is remembered.
- **Infinite sky.** `public/assets/space/infinite-sky.webp` is the active sky,
  generated with the built-in ImageGen tool and converted to WebP (1774 × 887).
  `deepSpace.ts` renders it inside a camera-centred sphere with blended texture
  seams and fine repeated sampling. Three recycled star volumes give different
  parallax at different distances without allocating objects as the camera moves.
  Horizontal travel has no map boundary; the galaxy dock always returns to known
  destinations. The immersive-view button fills the viewport; Escape restores
  the page, scroll and background interactivity. Reduced motion freezes ambient
  drift while preserving direct navigation; image-load failure uses a dark sky
  and the procedural stars. The original `deep-field.webp` remains in the brand
  archived illustration.
- **Two ways to build, one canvas.** The star map is an open canvas: drag moves
  across it, right-drag (or Shift/Ctrl + drag, two fingers on touch) turns it.
  Next to the KHP galaxy lies the Product Galaxy (`productGalaxy.ts`): the
  Kition SDK is its star, its four delivery forms (embed, script, headless,
  mcp) are rings, every product from `data/products.yaml` is a product planet of
  the same size, and light cables run back to the kit planets it uses. In the
  KHP galaxy, the empty next orbit invites a new kit (`newKit` in
  `universe.yaml`). Edge chips point at the galaxy that is off screen and fly
  you there. Layout and copy: `productGalaxy` and `newKit` in `universe.yaml`.
- **What you can make.** `data/scenarios.yaml` gives every kit three
  scenarios, drawn as holograms over its city (`scenarioArt.ts`, pure canvas)
  and listed on the planet page. Each scenario names the capabilities it uses;
  table and board link to published templates on kition.ai/templates.
  `pnpm check:data` checks that every `uses` is a real capability of the kit.
  On the star map each planet has a `look` (`surface.look` in `universe.yaml`: terra, gas, rock,
  storm, city, lava, ice, dunes) drawn by one shader from 3D noise (`planetSurface.ts`): relief,
  a day and a night side lit from the star, night lights, clouds, rings with the planet's shadow,
  moons, and its own `size` and `tilt`. The planet page's ground still uses procedural canvases. The deep-space sky is a locally hosted WebP asset.
  Bloom post-processing (`post.ts`) runs at half resolution.
- **Graceful degradation.** No WebGL, a software renderer (SwiftShader,
  llvmpipe), save-data or very low memory → static map with a "Load 3D" button.
  While running, a frame guard steps down quality (pixel ratio 1, then no bloom,
  then 30 fps). `prefers-reduced-motion` skips the warp, stops orbits and ships.
- **Accessibility.** Every 3D object has an HTML button label (Tab through
  planets, Enter to land, Esc to close panels). The star catalog (`/catalog/`)
  lists everything as a plain table.

## Agent replays

A replay shows how an agent uses a kit: the kit commands in order, written as the KHP calls
an agent sends (`<kit>_inspect`, `<kit>_run`, `<kit>_check`), beside the pictures the kit
rendered after each group of commands. It is a recording, never a live model, and the panel says so.

- **Source.** `data/replays.yaml` pairs a kit scenario with a
  [kition-showcase](https://github.com/KitionAI/kition-showcase) sample (a list of real kit
  commands), and says where the frames fall (`upto`), what each group did (`say`) and which
  buildings it lights (`lights`, capability ids). A scenario with no honestly matching sample
  has no replay; the file's header lists those.
- **Build.** `pnpm build:replays [kit ...]` runs the first `upto` commands of the sample through
  the kit's own `showcase` example for every frame and writes `public/assets/replay/<kit>/<scenario>/`
  (`1.webp` ..., `replay.json`) and `public/assets/replay/manifest.json`. It needs the sibling
  checkouts (kition-showcase, the kit repositories, kition-fonts), each kit's runner
  (`cargo build --release -p kition-<kit>-kit --example showcase`) and `cwebp`. The output is
  committed, so building the site needs none of that. Only replays in the manifest are offered.
- **Where they play.** `src/components/AgentReplay.astro` and `src/scripts/replay.ts`: one panel
  per page, opened by any `data-replay="<kit>/<scenario>"` element or `?replay=<kit>/<scenario>`.
  It works without WebGL. On a planet page the buildings named in `lights` glow while their
  commands run, and a scenario's hologram shows the kit's render instead of a drawing.

## Finding your way

- **Scenario galaxies** are laid out by `form` in `src/lib/scenarioGalaxies.ts` (`lane`, `ring`,
  `binary`, `hub`; positions in `src/lib/scenarioLayout.ts`, shared with the static poster). Each
  has the kits' own planets and landmarks, a route in step order, a courier carrying the file, and
  a result deck with the kits' renders. Detail is built on first approach and unfolds on arrival.
- **Task bar and search.** `src/components/Search.astro`, `src/scripts/search.ts`, index from
  `src/lib/searchIndex.ts` (`/search/<lang>.json`): scenarios, kits, capabilities, commands, file
  formats, products. Keyword matching in the browser; no model. Open with the task bar, ⌘K or `/`.
- **Tour.** `src/scripts/tour.ts`: four stops, started by the visitor.
- **Focus before landing.** Clicking a planet opens its panel (render, replay, the scenario
  galaxies that use it, related sections); landing is the panel's button. In the overview, pointing
  at a scenario galaxy draws lines to the kit planets it is made of.
- **Progress** (localStorage only): planets landed on, replays watched, scenario galaxies visited.
- **Documentation links** (`docs` in `universe.yaml`) go to the page about that very thing, never a
  home page. `pnpm check:data` checks their shape; `pnpm check:links` also requests each one.

## Routes

| Path | What |
| --- | --- |
| `/` | Universe overview (3D canvas): Kit, Product and 12 scenario galaxies |
| `/scenarios/` | Scenario atlas, with 12 combinations of real kit capabilities |
| `/scenarios/:id/` | A focused galaxy and its kit examples, capability links and preview status |
| `/missions/` | Legacy alias for the scenario atlas |
| `/planet/{kit}/` | Planet city, scenarios, capabilities, product planets, agent commands, formats, FAQ |
| `/catalog/` | Star catalog: the whole universe as a list |
| `/protocol/` | Kit Harness Protocol |
| `/built-with/`, `/built-with/{id}/` | Built with Kition: product planets (products built on the kits) |
| `/built-with/badge/`, `/built-with/submit/` | The badge, and how to get listed |
| `/zh/...` | Chinese versions of all of the above |
| `/llms.txt`, `/sitemap.xml`, `/robots.txt`, `/og/*.png` | Generated from the data file |

## Rules this repo keeps

- Kit order is fixed: motion, note, table, board, photo, film, doc, sheet, slide, pdf,
  vector, layout, cad, html, scene, design. motion comes first. `scripts/check-data.mjs` enforces it.
- layout, cad, html and design are Preview and are drawn under construction (scaffolding).
- Trademarks (Photoshop, AutoCAD, ...) appear only in comparison copy, never in
  planet or building names.
- No invented numbers, no subscriptions, ads or paywalls, no third-party KHP
  implementations that do not exist.
- No in-browser tools yet: each planet has an empty `tools: []` for the next phase.
- Nothing on the site calls a model. Replays are recordings; search is keyword matching.

## Built with Kition

Products other people build on the kits with the Kition SDK. On the site they
are product planets (产品星球): in the Product Galaxy on the star map, on
`/built-with/` and under each planet they use.

- **Data.** `data/products.yaml`, loaded by `src/lib/products.ts`. The header
  of that file lists every field and enum. `pnpm check:data` validates it:
  required fields, unique ids, kits valid and in the fixed order, enums, dates,
  that the screenshot exists under `public/`, banned wording, and no trademark
  in a product planet name. Screenshots live in `public/assets/products/` (1600×1000 webp).
- **Rules.** Free to submit and free to list. No paid ranking, featured slots,
  prices, ads or paywalls. Order: `editors_pick` first (set by the maintainer
  only), then newest `added`. Every product planet is shown at the same size.
  Listing needs a public, working product with the "Built with Kition" badge
  linking back (products `by_kition` excepted). Never invent a product, number,
  review or user count: fields without data are not shown. Links to someone
  else's site carry `rel="nofollow ugc"` until `badge_verified` is true. A
  listing is not an endorsement; paused products keep their page but leave the
  star map and lists.
- **First-party previews.** A sourced `by_kition` prototype can use
  `status: preview` and omit `url` until a public destination is confirmed.
  Preview badges appear on cards, detail pages, the 3D product planet and OG images;
  no external launch button is shown without a URL. Kition One is such a
  preview: its current `kinds.json` registers 13 kits, independently of the
  universe's 16-kit catalog. Its description distinguishes managed workspace
  features from local-demo collaboration and AI. The home page, product galaxy,
  kit pages and `llms.txt` all use the same product data.
- **Pages.** `/built-with/` (cards, filters `?kit=&delivery=&category=`),
  `/built-with/{id}/`, `/built-with/badge/` (badge SVGs in `public/badge/`,
  plain SVG with no scripts or external fonts) and `/built-with/submit/`, all
  under `/zh/` too. Strings are in `src/i18n/builtWith.ts`. The star catalog
  lists each planet's product planets; `src/components/Settlements.astro` (the component keeps its old name) is the
  per-planet list.
- **Submissions.** [CONTRIBUTING.md](../.github/CONTRIBUTING.md) is the spec for what others can add: a
  product planet (`.github/ISSUE_TEMPLATE/built-with-kition.yml`) or a scenario galaxy
  (`scenario-galaxy.yml`); `report-listing.yml` reports a problem. `scripts/intake.mjs`
  (`pnpm intake product|galaxy issue.md`) checks a submission against the spec and prints the
  entry to add; `.github/workflows/intake.yml` runs it on every new or edited submission and
  answers on the issue. A maintainer reviews and merges. The form links live in
  `data/universe.yaml` under `site.links` (`submit`, `galaxy`, `report`, `contributing`).
- **Product planets.** Each product is drawn as a planet in the Product Galaxy with the look,
  colour, ring and moons from its `planet:` field (defaults from its id and first kit), always
  the same size. A contributed scenario galaxy carries `by` and `added` and shows "Proposed by".

## Infinite sky asset

### Generation prompt

Built-in ImageGen, opaque background; output: `public/assets/space/infinite-sky.webp`.

> Use case: stylized-concept. Asset type: production background texture for an immersive infinite 3D universe website. Generate a wide 2:1 equirectangular 360-degree deep-space sky panorama, seamless left/right edges, no frame, no text, no logos, no planets, no foreground objects, no horizon. Looking outward into an immense quiet cosmos. Almost-black ink navy negative space across most of the image, delicate dim indigo and desaturated blue-teal interstellar dust filaments, a little distant muted violet, very fine pinprick stars at many depths, a few tiny faraway galaxies. Subtle physically inspired astronomical photography with fine fractal wisps and restrained luminous detail. Extremely expansive and spacious, as if the view continues forever outside the frame; no central hero subject, no dominant bright diagonal Milky Way band, no large sun, no rainbow colors, no overexposed white patches. Sparse luminous cloud detail at irregular distributed locations with broad dark areas so interactive foreground planets and white labels remain readable. The upper and lower edges should fade naturally toward near-black for spherical mapping. Highest practical resolution, wide 2:1 composition.

## Scenario galaxies

`src/lib/scenarioGalaxies.ts` defines twelve localized use-case galaxies. Each
references real entries in `data/scenarios.yaml`; all sixteen kits appear in at
least one combination. Add another definition to create its bilingual detail
pages, OG images, sitemap entries, cards and star-map destination automatically.

The home page opens the fourteen-galaxy overview (Kit, Product and twelve scenes).
The dock offers overview, Kits, Products and a scrollable scenario selector.
`?galaxy=brand-studio` focuses a destination; `/scenarios/brand-studio/` provides a
shareable page with the same galaxy and the underlying capabilities. The legacy
`?galaxy=missions&mission=brand` query maps to Brand Studio. `/missions/` remains
an alias with the scenario atlas as its canonical URL.

`scene/scenarioGalaxies.ts` draws each galaxy by its `form` (see "Finding your way").
From afar a galaxy is dust in its kits' colours and a glow; on first approach it
builds the kit worlds (the same planets as in the KHP galaxy), the route, the
courier and the result deck. Navigation reuses the infinite-space camera.
`ScenarioMapPoster.astro` preserves navigable destinations without JavaScript or
WebGL. These scenes organize documented capabilities; they do not execute AI.

English is the default at `/`, regardless of browser language. Chinese pages
live under `/zh/` and remain an explicit language-switch option. Every canonical
page has English, Chinese and English x-default alternate links.
