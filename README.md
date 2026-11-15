<div align="center">

# Kition Universe

A 3D star map of Kition, the open pro suite for AI. Every kit is a planet: fly around, land on one, and watch an AI agent do real work on a real file.

**[Open Kition Universe → universe.kition.ai](https://universe.kition.ai)**

**English** · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Deutsch](README.de.md) · [Français](README.fr.md) · [Español](README.es.md) · [Português](README.pt-BR.md) · [Tiếng Việt](README.vi.md)

</div>

[![Kition Universe](docs/images/kits.webp)](https://universe.kition.ai)

## What it is

Kition is a set of 16 professional editors, called kits: documents, spreadsheets, slides, PDFs, images, video, vector art, CAD, 3D scenes and more. Each kit opens real files, and each one can be driven by an AI agent through one open protocol, the Kit Harness Protocol (KHP).

Kition Universe is the place to see all of that at a glance. It answers three questions: what can each kit make, how does an AI use it, and how can you use it yourself.

## What you can do here

### Visit 16 planets, one per kit

Each kit has its own world: an ocean planet, a gas giant, a city grid, a lava world. Click a planet to see what the kit makes, then land on it and walk its city, where every building is something the kit can do.

### Watch an agent at work

Press play and see the commands an agent sends, one by one, next to the pictures the kit rendered after each step. The buildings in use light up. When it ends, copy the prompt and the setup for your own AI. These are recordings of real kit commands, not a live model.

![Watch an agent at work](docs/images/replay.webp)

### Follow one piece of work across kits

Twelve scenario galaxies show how kits combine: a business review goes from spreadsheet to report to slides to a signed PDF. A courier carries the file from planet to planet, and the finished files land on the result deck.

![Follow one piece of work across kits](docs/images/scenario.webp)

### Start from what you want to do

Type "quarterly review", "pivot" or ".psd" and fly straight there. Search covers scenarios, kits, capabilities, agent commands and file formats. It runs in your browser; nothing is sent anywhere.

![Start from what you want to do](docs/images/search.webp)

### See what others have built

Products built on the kits are planets in the Product Galaxy, each linked by light to the kits it uses. Listing is free, and every product planet is the same size.

![See what others have built](docs/images/products.webp)

### See how everything connects

From the overview, point at a scenario galaxy to see lines to the kit planets it is made of. A 60-second tour walks you through the protocol, one kit, one scenario and the products.

![See how everything connects](docs/images/overview.webp)

## The 16 kits

Each kit is one planet. Kits marked Preview are still under construction, and their planets wear scaffolding.

| Kit | What it edits | File | Its planet |
| --- | --- | --- | --- |
| [**motion**](https://universe.kition.ai/planet/motion/) | Motion graphics | `.kmotion` | Lava world |
| [**note**](https://universe.kition.ai/planet/note/) | Markdown notes that link to each other | `.md` | Gas giant |
| [**table**](https://universe.kition.ai/planet/table/) | Structured tables with typed fields and views | `.ktable` | City world |
| [**board**](https://universe.kition.ai/planet/board/) | Whiteboards and mind maps | `.kboard` | Ocean world |
| [**photo**](https://universe.kition.ai/planet/photo/) | Layered images | `.psd` | Storm world |
| [**film**](https://universe.kition.ai/planet/film/) | Video editing | `.kfilm` | Gas giant |
| [**doc**](https://universe.kition.ai/planet/doc/) | Word-processing documents | `.docx` | Ocean world |
| [**sheet**](https://universe.kition.ai/planet/sheet/) | Spreadsheets | `.xlsx` | City world |
| [**slide**](https://universe.kition.ai/planet/slide/) | Presentations | `.kslide` | Gas giant |
| [**pdf**](https://universe.kition.ai/planet/pdf/) | PDF pages, forms and redaction | `.pdf` | Cratered rock |
| [**vector**](https://universe.kition.ai/planet/vector/) | Vector illustration | `.kvector` | Crystal world |
| [**layout**](https://universe.kition.ai/planet/layout/) · Preview | Page layout | `.klayout` | Dune world |
| [**cad**](https://universe.kition.ai/planet/cad/) · Preview | 2D technical drawings | `.dxf` | Cratered rock |
| [**html**](https://universe.kition.ai/planet/html/) · Preview | Web pages | `.html` | Storm world |
| [**scene**](https://universe.kition.ai/planet/scene/) · Preview | 3D scenes | `.kscene` | Ocean world |
| [**design**](https://universe.kition.ai/planet/design/) · Preview | Interface design | `.kdesign` | Crystal world |

## Good to know

- Nothing on the site calls an AI model. Replays are recordings of real kit commands; the pictures were rendered by the kits.
- Your progress (planets visited, replays watched) stays in your browser. There are no accounts.
- The site works without WebGL: a static map and the same content, including replays.
- Available in English and Chinese.

## Add your product or your galaxy

Built something on the kits? It can become a planet in the Product Galaxy. Have a way of working that goes through several kits? Propose a scenario galaxy. Both are free and come in through an issue form.

- [Add your product planet](https://github.com/KitionAI/kition-universe/issues/new?template=built-with-kition.yml)
- [Propose a scenario galaxy](https://github.com/KitionAI/kition-universe/issues/new?template=scenario-galaxy.yml)
- [The rules and the format](CONTRIBUTING.md)

## For developers

The site is static: Astro, three.js and one data file. To run it locally:

```bash
pnpm install
pnpm dev        # http://localhost:4330
```

How it is built, checked and deployed: [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Links

- [Kition](https://kition.ai) · [GitHub](https://github.com/KitionAI/kition)
- [Kition SDK](https://github.com/KitionAI/kition-sdk)
- [Kit Harness Protocol](https://universe.kition.ai/protocol/)

## License

Apache-2.0
