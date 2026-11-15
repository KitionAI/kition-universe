# Adding to Kition Universe

Kition Universe lists what other people build with the Kition kits. You can add two things,
each through an issue form:

| What | What it is on the map | Form |
| --- | --- | --- |
| **A product planet** | A product you built on the kits. It becomes a planet in the Product Galaxy, with light cables to the kit planets it uses, a page under `/built-with/`, and a place on each of those kits' pages. | [Add your product planet](https://github.com/KitionAI/kition-universe/issues/new?template=built-with-kition.yml) |
| **A scenario galaxy** | A kind of work done by passing a file through two to four kits in order. It becomes a galaxy on the star map with those kits' planets, a route between them, and a page under `/scenarios/`. | [Propose a scenario galaxy](https://github.com/KitionAI/kition-universe/issues/new?template=scenario-galaxy.yml) |

Something wrong with an existing entry (a dead link, a missing badge, a wrong fact)?
[Report it](https://github.com/KitionAI/kition-universe/issues/new?template=report-listing.yml).

A new **kit** is not added here. A kit planet stands for an engine that speaks the Kit Harness
Protocol; build one from the [protocol](https://universe.kition.ai/protocol/) and the
[Kition SDK](https://github.com/KitionAI/kition-sdk), then open a plain issue in this repository
with its public repository, and we will talk about its planet.

## Rules for everything

1. **Free.** Submitting and being listed cost nothing. There is no paid ranking, featured slot,
   advertisement or paywall, and there will not be.
2. **True.** Say what the thing does. No user, customer, download or star counts, no reviews, no
   "best" or "first". Fields you leave empty are simply not shown.
3. **Yours to submit.** You made it or speak for whoever did.
4. **No other company's trademarks** (Office, Adobe, Photoshop, Figma and so on) in a name. They
   may appear in a description where you compare or say what files you open.
5. **Equal.** Every product planet is the same size; so is every scenario galaxy. Order is: the
   maintainer's picks first, then newest first.
6. **Not an endorsement.** A listing says the thing exists and follows these rules, nothing more.
7. **English first.** English text is required. Chinese is welcome; where it is missing, the
   English is shown on the Chinese pages (products) or a maintainer translates it (galaxies).

## A product planet

### What qualifies

- It is **public and working**: anyone can open the URL and see the product, not a waiting list.
- It **really uses at least one kit** through the Kition SDK, in one of four ways:
  `embed` (a kit's editor in your page), `script` (driving a document from code),
  `headless` (the kit with no window, on a server or in a pipeline), `mcp` (the kit's tools
  handed to AI agents).
- Its page shows the **Built with Kition badge**, linking back to `https://universe.kition.ai`.
  Get the badge at [/built-with/badge/](https://universe.kition.ai/built-with/badge/). This is
  the only condition for listing, and the check looks for that link.

### Fields

The form asks for these; they become one entry in `data/products.yaml`.

| Field | Required | Rule |
| --- | --- | --- |
| Product name | yes | As you write it. Gives the id: lowercase letters, digits and dashes, at most 40 characters. `badge` and `submit` are taken. |
| Product URL | yes | `https://`. The page that shows the badge. |
| Tagline (English) | yes | One sentence, at most 200 characters. What it does. |
| Tagline (Chinese) | no | |
| Description (English) | yes | A short paragraph: what it does and how it uses the kits. |
| Description (Chinese) | no | |
| Kits it uses | yes, one or more | Only kits it really uses. Stored in the fixed kit order. |
| Delivery | yes, one or more | `embed`, `script`, `headless`, `mcp`. |
| Collaboration | no | `none`, `cloud` or `server`. Leave out when unsure. |
| Category | yes | `office`, `design`, `video`, `engineering`, `education`, `developer-tools`, `ai-agent`, `other`. |
| Author name | yes | You, your team or your company. |
| Author URL, GitHub | no | `https://` URL; a GitHub user or organisation name. |
| Open source repository | no | `https://` URL. |
| Screenshot | no | One image, ideally 1600×1000. Without one, a maintainer may take one of the public page. |
| Planet look, colour, ring, moons | no | See below. |

### Your planet

Your product is drawn as a planet. You choose how it looks; you do not choose its size.

| Field | Values | Default |
| --- | --- | --- |
| `look` | `terra` ocean world with clouds · `gas` banded gas giant · `rock` cratered rock · `storm` swirling storm world · `city` city grid with lit streets · `lava` dark crust with glowing cracks · `ice` faceted crystal · `dunes` desert ridges | picked from your product's id |
| `color` | one colour, `#rrggbb` | the colour of the first kit you use |
| `ring` | `true` or `false` | `false` |
| `moons` | `0`, `1` or `2` | `0` |

A small dock circles every product planet, lit in the colours of the kits the product uses.

### The entry

```yaml
  - id: ledgerline
    name: Ledgerline
    url: https://ledgerline.example.com
    tagline: Bookkeeping for small studios, with spreadsheets and invoices your agent can fill in.
    description: Ledgerline embeds the sheet kit for ledgers and renders invoices with the pdf kit on the server.
    kits: [sheet, pdf]
    delivery: [embed, headless]
    collab: cloud
    category: office
    author: { name: Ledgerline Ltd, url: https://ledgerline.example.com/about, github: ledgerline }
    planet: { look: city, color: '#2fa8e0', ring: true, moons: 1 }
    badge_verified: false   # set by a maintainer after looking at the badge
    editors_pick: false     # set by a maintainer only
    status: live            # live | paused (a first-party prototype may be preview)
    added: 2026-11-15
```

### After it is listed

- Links to your site carry `rel="nofollow ugc"` until a maintainer has checked the badge
  (`badge_verified: true`).
- To change your entry, open the form again and say it replaces the earlier one, or send a pull
  request that edits `data/products.yaml`.
- A product that stops working, or loses its badge, is marked `paused`: its page stays, and it
  leaves the star map and the lists. To be removed entirely, ask in an issue.

## A scenario galaxy

### What qualifies

- It names **a kind of work**, not a product: "Event Planning", "Research Lab". No product or
  company names in its name or text. Your credit is the "Proposed by" line.
- It has **two to four steps**, each a different kit, in the order the work happens.
- **Every step is a scenario the kit already lists.** The scenarios are on each kit's planet page
  under "What you can make", and their ids are in [`data/scenarios.yaml`](data/scenarios.yaml)
  (three per kit). A galaxy arranges what kits can already do; it cannot promise a capability
  that no kit has. If the step you need is missing, propose the galaxy without it, or ask for the
  scenario in an issue first.
- **Its steps are not the same as an existing galaxy's.** The same kits with other scenarios, or
  in another order for a different kind of work, are fine.

### Fields

They become one entry in `src/lib/scenarioGalaxies.ts` and one line in `scenarioAsks`.

| Field | Required | Rule |
| --- | --- | --- |
| Galaxy name (English) | yes | Two or three words, at most four. Gives the id: lowercase words joined by dashes. |
| Task phrase (English) | yes | What someone would say they want to do, starting with a verb: "Plan and promote an event". Shown in the task bar and search. |
| Summary (English) | yes | One sentence on what happens across the steps. |
| Outcome (English) | yes | The files you end up with, one per step. |
| Chinese name, task phrase, summary, outcome | no | A maintainer translates what is missing before merging. |
| Steps | yes | Two to four lines, `kit: scenario-id`, in order. Each kit once. |
| Layout | yes | `lane` steps strictly one after another · `ring` steps you go round more than once · `binary` two groups of kits working side by side · `hub` one kit in the middle that the others feed. |
| Hub kit | hub layout only | One of the steps. |
| Galaxy colour | no | `#rrggbb`. A maintainer picks or adjusts it so no two galaxies share a colour. |
| Proposed by | yes | Your name, team or company; optional `https://` URL and GitHub name. Shown on the galaxy with a `nofollow` link. |
| Where this work is really done this way | no | A public page that shows the workflow. It helps the review and is not published. |

The place of the galaxy on the map (`position`) is given by a maintainer: the check suggests the
freest spot, at least 100 units from every other galaxy.

### The entry

```ts
  { id:'event-planning', form:'hub', hub:'table', name:c('Event Planning','活动策划'), color:'#7fd0a8', position:[144,0,-443],
    summary:c('Track the tasks, design the poster and send out a signed form.','跟踪任务、设计海报，再发出签好的表单。'),
    outcome:c('A task tracker, an event poster and a filled registration form.','任务跟踪表、活动海报和填好的报名表。'),
    kits:[k('table','task-tracker'),k('photo','event-poster'),k('pdf','fill-sign')],
    by:{ name:'Mira Okafor', github:'mira-okafor' }, added:'2026-11-15' },

  // in scenarioAsks:
  'event-planning': c('Plan and promote an event', '策划并宣传一场活动'),
```

A step that has an [agent replay](docs/DEVELOPMENT.md#agent-replays) shows the kit's own render on the
galaxy's result deck and can be replayed from the galaxy. Replays come from kition-showcase
samples and are added by maintainers; a galaxy does not need them.

## What happens to a submission

1. **You open the form.** One issue per product or galaxy.
2. **An automated check answers on the issue**, usually within minutes. It reads the form and
   lists what must change: an empty required field, a URL that is not `https`, a tagline that is
   too long, a kit or scenario that does not exist, a trademark in a name, promotional wording or
   counts, a duplicate. For a product it also opens the URL and looks for the link back. Edit the
   issue and it checks again. The check never decides a listing.
3. **A maintainer reviews it.** For a product: the page is public and works, the badge is there,
   the kits and delivery forms are plausible for what the product does. For a galaxy: the steps
   make sense in that order for that kind of work, the text follows the rules, and it does not
   repeat an existing galaxy. We may ask questions or suggest wording.
4. **It is merged and deployed.** The maintainer adds the entry, runs the checks and deploys the
   site. We do not promise a time; submissions are handled in the order they pass the check.

A submission can be declined when it breaks a rule above, when the product cannot be opened, or
when a galaxy is a product in disguise. The reason is given on the issue.

## For maintainers

```bash
# read a submission (save the issue body to a file, or pipe it in)
pnpm intake product issue.md --fetch     # checks the form, opens the URL, prints the YAML entry
pnpm intake galaxy issue.md              # checks the form, prints the entry and a free position

# after adding the entry
pnpm check:data                          # the same rules, on the data files
pnpm build && pnpm check:data --dist     # every page builds and links resolve
```

- Product: paste the entry at the end of `products:` in `data/products.yaml`. Add `screenshot:`
  when there is one (1600×1000 webp under `public/assets/products/`). Set `badge_verified: true`
  once you have seen the badge link on the page.
- Galaxy: paste the entry at the end of `scenarioGalaxies` and the task phrase in `scenarioAsks`
  (`src/lib/scenarioGalaxies.ts`). Fill every `TODO` (Chinese text, colour); `pnpm check:data`
  fails while one is left. Look at the galaxy on the map (`pnpm dev`, `/?galaxy=<id>`) before merging.
- The form labels are what `scripts/intake.mjs` reads. Change a label in
  `.github/ISSUE_TEMPLATE/` and in the script together.
- `.github/workflows/intake.yml` runs the check on every new or edited submission and labels the
  issue `check-passed` or `needs-changes`.
