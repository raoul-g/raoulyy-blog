# Architecture

How raoulyy.blog works technically, from writing Markdown to a page in someone's browser.

**In one sentence:** Markdown and Nunjucks sources in `src/` are compiled by Eleventy 3 into `_site/`. A small set of Node scripts generates the sitemap and mirrors `_site/` into `docs/`, which is committed and served by GitHub Pages at `raoulyy.blog`. On the client, one vanilla JS file handles the theme toggle, sharing, analytics, and the backlinks search.

---

## 1. System overview

```mermaid
flowchart LR
    subgraph Author["✍️ Authoring (local)"]
        MD["src/fragments/*.md<br/>src/marginalia/*.md<br/>src/hidden/*.md"]
        NJK["src/*.njk pages<br/>src/_includes/layouts/*.njk"]
        DATA["src/_data/site.json"]
        STATIC["css/ · js/ · images/<br/>CNAME · robots.txt"]
    end

    subgraph Build["⚙️ Build (Node + pnpm)"]
        ELEVENTY["Eleventy 3<br/>+ .eleventy.js config"]
        SITE[("_site/<br/>(gitignored)")]
        SITEMAP["tools/generate-sitemap.js"]
        COPY["tools/copy-docs.js"]
        DOCS[("docs/<br/>(committed)")]
    end

    subgraph Host["☁️ Hosting"]
        GH["GitHub repo<br/>main branch"]
        PAGES["GitHub Pages<br/>serves /docs<br/>CNAME → raoulyy.blog"]
    end

    subgraph Client["🌐 Browser"]
        HTML["Static HTML + CSS"]
        MAINJS["js/main.js"]
    end

    subgraph Ext["External services"]
        FONTS["Google Fonts<br/>+ jsDelivr (iA Writer Quattro)"]
        GOAT["GoatCounter<br/>raoulyy.goatcounter.com"]
    end

    MD & NJK & DATA --> ELEVENTY
    STATIC -- passthrough copy --> ELEVENTY
    ELEVENTY --> SITE
    SITE --> SITEMAP --> |"sitemap.xml (repo root)"| COPY
    SITE --> COPY --> DOCS
    DOCS -- git push --> GH --> PAGES
    PAGES --> HTML --> MAINJS
    HTML -. "@import / @font-face" .-> FONTS
    MAINJS -. "injects count.js" .-> GOAT
    MAINJS -. "fetch /backlinks-index.json" .-> PAGES
```

---

## 2. Repository layout

```mermaid
flowchart TB
    ROOT["raoulyy-blog/"]

    ROOT --> CFG[".eleventy.js<br/><i>markdown-it, wikilink plugin,<br/>collections, filters, transform</i>"]
    ROOT --> PKG["package.json · pnpm-lock.yaml<br/>pnpm-workspace.yaml<br/><i>scripts, Eleventy dep,<br/>3-day minimumReleaseAge</i>"]
    ROOT --> SRC["src/ <i>(Eleventy input)</i>"]
    ROOT --> ASSETS["css/style.css · js/main.js · images/<br/><i>passthrough assets</i>"]
    ROOT --> TOOLS["tools/<br/><i>clean-site · clean-docs ·<br/>generate-sitemap · copy-docs</i>"]
    ROOT --> OUT["_site/ <i>(build output, gitignored)</i>"]
    ROOT --> DOCS["docs/ <i>(deployed copy of _site + .nojekyll)</i>"]
    ROOT --> ARCH["archive-old-html/<br/><i>pre-Eleventy hand-written HTML, unused</i>"]
    ROOT --> MISC["CNAME · robots.txt · sitemap.xml"]

    SRC --> PAGES_["index.njk · marginalia.njk · fragments.njk<br/>backlinks.njk · 404.njk · rss.njk"]
    SRC --> JSONT["backlinks-index.json.11ty.js<br/><i>JS class template → JSON</i>"]
    SRC --> LAYOUTS["_includes/layouts/<br/>base · marginalia · fragment"]
    SRC --> DATA["_data/site.json<br/><i>global: title, description, url, image</i>"]
    SRC --> CONTENT["fragments/NNN-*.md<br/>marginalia/*.md<br/>hidden/*.md"]
```

---

## 3. Build & deploy pipeline

`pnpm run deploy` is the single command that produces a publishable site. npm-style `pre*` hooks run around the main scripts:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Raoul
    participant PNPM as pnpm
    participant CD as tools/clean-docs.js
    participant CS as tools/clean-site.js
    participant E as Eleventy
    participant SM as tools/generate-sitemap.js
    participant CP as tools/copy-docs.js
    participant GH as GitHub Pages

    Dev->>PNPM: pnpm run deploy
    PNPM->>CD: predeploy
    CD-->>CD: empty docs/ (keep .nojekyll)
    PNPM->>PNPM: npm run build
    PNPM->>CS: prebuild
    CS-->>CS: rm -rf _site/
    PNPM->>E: eleventy
    E-->>E: render src/ → _site/<br/>passthrough css/ js/ images/ CNAME robots.txt sitemap.xml
    PNPM->>SM: node tools/generate-sitemap.js
    SM-->>SM: scan _site/**/*.html (skip _*, 404.html)<br/>write ./sitemap.xml (mtime → lastmod)
    PNPM->>CP: node tools/copy-docs.js
    CP-->>CP: clear docs/, copy _site/ → docs/<br/>overwrite docs/sitemap.xml with fresh root one<br/>write docs/.nojekyll
    Dev->>GH: git add docs && commit && push
    GH-->>GH: publish docs/ at https://raoulyy.blog
```

Other scripts:

| Script | What it does |
|---|---|
| `pnpm run build` | `prebuild` (wipe `_site/`) → `eleventy` |
| `pnpm run serve` | Eleventy dev server with live reload (no clean, no sitemap) |
| `pnpm run watch` | Rebuild on change without a server |

---

## 4. Inside the Eleventy build

```mermaid
flowchart TB
    subgraph Config[".eleventy.js"]
        MDLIB["markdown-it<br/>html · linkify · typographer"]
        WLP["wikilinkPlugin<br/>core rule after 'inline':<br/>[[term]] → &lt;a class=backlink-inline&gt;"]
        COLL["Collections<br/>marginalia = src/marginalia/*.md<br/>fragments = src/fragments/*.md<br/>(both sorted newest first)"]
        FILT["Filters<br/>htmlDate · readableDate · rfc822Date"]
        XFORM["Transform 'wikilinks' (*.html)<br/>catch leftover [[term]] in non-Markdown output<br/>+ ensure backlink-inline class"]
        PT["Passthrough copy<br/>css · js · images · CNAME<br/>robots.txt · sitemap.xml"]
        MDLIB --- WLP
    end

    subgraph Inputs["src/"]
        CM["Content .md<br/>(front matter: layout, title,<br/>description, date, permalink,<br/>book, excerpt)"]
        PG["Pages .njk"]
        BJ["backlinks-index.json.11ty.js"]
        SJ["_data/site.json"]
    end

    subgraph Outputs["_site/"]
        O1["index.html · 404.html"]
        O2["marginalia.html + marginalia/*.html"]
        O3["fragments.html + fragments/*.html"]
        O4["hidden/*.html"]
        O5["backlinks.html"]
        O6["backlinks-index.json"]
        O7["rss.xml"]
    end

    CM --> MDLIB --> LAYOUT["Nunjucks layouts"]
    CM --> COLL
    SJ --> LAYOUT
    PG --> LAYOUT
    COLL --> PG
    COLL --> BJ
    FILT --> LAYOUT
    LAYOUT --> XFORM
    XFORM --> O1 & O2 & O3 & O4 & O5
    PG --> O7
    BJ --> O6
```

### Template inheritance

```mermaid
flowchart TB
    BASE["<b>layouts/base.njk</b><br/>head: title, meta description, canonical,<br/>Open Graph + Twitter card, RSS link, style.css<br/>header: nav + theme toggle checkbox<br/><i>block content</i><br/>footer: year, RSS icon<br/>script: /js/main.js"]
    MARG["<b>layouts/marginalia.njk</b><br/>wraps content in div.review-body"]
    FRAG["<b>layouts/fragment.njk</b><br/>finds own index in collections.fragments<br/>number = total − index<br/>prev / next links with tooltip<br/>Share Fragment button"]

    MARG -- extends --> BASE
    FRAG -- extends --> BASE

    MP["src/marginalia/*.md"] -. layout .-> MARG
    HP["src/hidden/*.md"] -. layout .-> MARG
    FP["src/fragments/NNN-*.md"] -. layout .-> FRAG
    PAGES["index · marginalia · fragments<br/>backlinks · 404 (.njk)"] -. layout .-> BASE
```

`rss.njk` and `backlinks-index.json.11ty.js` render without a layout and are excluded from collections.

### Which page reads which data

| Output | Source | Reads |
|---|---|---|
| `/index.html` | `index.njk` | static text |
| `/marginalia.html` | `marginalia.njk` | `collections.marginalia` → title, `book` (split on ` \| `), date |
| `/fragments.html` | `fragments.njk` | `collections.fragments` → number, title, description, date |
| `/fragments/*.html` | `fragment.njk` layout | `collections.fragments` for numbering + prev/next |
| `/marginalia/*.html` | `marginalia.njk` layout | post content |
| `/hidden/*.html` | `marginalia.njk` layout | not in any collection, so not listed, not in RSS, not in backlinks |
| `/rss.xml` | `rss.njk` | fragments + marginalia merged, sorted by date, full `templateContent` |
| `/backlinks-index.json` | `backlinks-index.json.11ty.js` | collections + **raw `.md` files from disk** |
| `/backlinks.html` | `backlinks.njk` | shell only; filled in by `main.js` |

---

## 5. Wikilinks & backlinks

The blog's "digital garden" feature. Writing `[[willpower]]` in a post does two things:

1. **At render time** it turns into a link: `<a href="/backlinks.html?term=willpower" class="backlink-inline">willpower</a>`.
2. **At build time** it gets indexed into `backlinks-index.json` together with a short text snippet around it.

The backlinks page then works entirely in the browser.

```mermaid
sequenceDiagram
    autonumber
    participant MD as src/fragments/011-tied-to-the-mast.md
    participant MDI as markdown-it + wikilinkPlugin
    participant TR as HTML transform "wikilinks"
    participant IDX as backlinks-index.json.11ty.js
    participant JSON as /backlinks-index.json
    participant U as Reader
    participant JS as main.js · initBacklinksPage()

    rect rgba(250,175,80,0.12)
    Note over MD,JSON: Build time (Eleventy)
    MD->>MDI: "...that [[willpower]] is a limited resource..."
    MDI->>TR: link to /backlinks.html?term=willpower (class backlink-inline)
    TR-->>TR: also converts raw [[...]] in .njk output<br/>(e.g. the [[love]] example on backlinks.njk)
    IDX->>MD: fs.readFileSync, strip front matter
    IDX-->>IDX: regex [[...]], key = lowercase(term)<br/>snippet = 40 chars before … 60 after<br/>dedupe mentions per URL
    IDX->>JSON: { "willpower": { term, mentions[{title,url,collection,date,snippet}] },<br/>  "_terms": [{term,count}] sorted by count }
    end

    rect rgba(137,107,48,0.12)
    Note over U,JS: Run time (browser)
    U->>JS: click "willpower" link → /backlinks.html?term=willpower
    JS->>JSON: fetch('/backlinks-index.json')
    JSON-->>JS: full index
    JS-->>U: renderTags(): top 40 _terms as buttons
    JS-->>U: renderResults("willpower"): list of mentions + snippets
    U->>JS: submit search / click a tag
    JS-->>U: re-render + history.replaceState(?term=…)
    end
```

Terms are case-insensitive (`[[Willpower]]` and `[[willpower]]` share one entry). Only `src/fragments/` and `src/marginalia/` are indexed.

---

## 6. Client-side runtime (`js/main.js`)

A single script, loaded at the end of `<body>` on every page:

```mermaid
flowchart TD
    LOAD(["Page load: main.js"]) --> T1
    T1{"localStorage<br/>theme-override == 'true'?"} -- yes --> T2["check #theme-toggle-checkbox"]
    T1 -- no --> T3
    T2 --> T3["on change → save checked state<br/>to localStorage"]
    T3 --> Y["set #current-year to current year"]
    Y --> S{"#share-btn exists?<br/>(fragment pages)"}
    S -- yes --> S2["on click: navigator.share()<br/>fallback → clipboard.writeText(url)"]
    S -- no --> G
    S2 --> G["inject GoatCounter count.js<br/>(async, gc.zgo.at)"]
    G --> B{"backlinks form +<br/>containers present?"}
    B -- no --> END(["done"])
    B -- yes --> F["fetch /backlinks-index.json"]
    F -- error --> ERR["show 'Unable to load backlinks index.'"]
    F -- ok --> R["render tags · read ?term=<br/>render results or welcome card<br/>wire submit + tag clicks"]
```

### Theme toggle: CSS only, JS just remembers the choice

The checkbox **inverts** whatever the OS prefers. CSS does the switch with `:root:has(#theme-toggle-checkbox:checked)` inside `prefers-color-scheme` media queries. JS only saves and restores the checkbox state.

```mermaid
stateDiagram-v2
    direction LR
    state "OS prefers light" as L {
        [*] --> LightTheme
        LightTheme --> DarkTheme : toggle checked
        DarkTheme --> LightTheme : toggle unchecked
    }
    state "OS prefers dark" as D {
        [*] --> DarkTheme2
        DarkTheme2 --> LightTheme2 : toggle checked
        LightTheme2 --> DarkTheme2 : toggle unchecked
    }
    note right of D
        "theme-override" in localStorage
        stores the checkbox state,
        not a light/dark value
    end note
```

Design tokens (`--bg-color`, `--text-main`, `--accent`, `--text-highlight`, …) are set in `:root` at the top of `css/style.css`. Fonts: iA Writer Quattro (body, via jsDelivr), Fraunces / Playfair Display (titles), Inter (fallback), all loaded from Google Fonts / jsDelivr.

---

## 7. URL map

```mermaid
flowchart LR
    HOME["/ (index.html)"] --> MAR["/marginalia.html"]
    HOME --> FRA["/fragments.html"]
    NAV(("nav on<br/>every page")) --> MAR & FRA & BL["/backlinks.html?term="]
    MAR --> MP["/marginalia/&lt;slug&gt;.html<br/>6 book reflections"]
    FRA --> FP["/fragments/&lt;slug&gt;.html<br/>11 mini-essays, #1…#11"]
    FP -->|prev / next| FP
    MP & FP -- "[[term]] links" --> BL
    BL -. "fetch" .-> IDX["/backlinks-index.json"]
    BL -- "result links" --> MP & FP
    FOOT(("footer")) --> RSS["/rss.xml"]
    HID["/hidden/&lt;slug&gt;.html<br/>unlisted, direct link only"]
    SEO["/sitemap.xml · /robots.txt"]
    E404["/404.html (GitHub Pages fallback)"]
```

---

## 8. Content model

| Field | Marginalia | Fragments | Used by |
|---|:-:|:-:|---|
| `layout` | `layouts/marginalia.njk` | `layouts/fragment.njk` | Eleventy |
| `title` | ✓ | ✓ | `<title>`, OG/Twitter, listings, RSS, backlinks |
| `description` | ✓ | ✓ | meta description, fragment card subtitle, RSS `<description>` |
| `date` | ✓ | ✓ | sort order, numbering, `<time>`, RSS `pubDate` |
| `permalink` | ✓ | ✓ | output URL (file names like `011-…` don't affect the URL) |
| `book` | `"Title \| Author"` | – | marginalia listing subtitle |
| `excerpt` | ✓ | – | currently not rendered anywhere |

Fragment numbers (`#11`) aren't stored anywhere. They come from each fragment's position in the date-sorted collection, so adding one with an earlier date renumbers the ones after it.

---

## 9. Observations & quirks

Found while analysing the project. None of them break the site, but they're good to know:

- **Hidden page is in the sitemap.** `generate-sitemap.js` scans every `.html` in `_site/`, so `/hidden/dezbracarea-unui-suflet.html` is listed in `sitemap.xml` and can be found by search engines. Add `hidden` to the skip list if that isn't intended.
- **`_site/sitemap.xml` is one deploy behind.** Eleventy passthrough-copies the *old* root `sitemap.xml` before the new one is generated. `copy-docs.js` then overwrites `docs/sitemap.xml` with the fresh one, so production is correct.
- **`deploy` calls `npm run build`** even though the project now uses pnpm. It works, but `pnpm run build` would be consistent.
- **Dead passthrough entries:** `assets` and `404.html` don't exist at the root (the 404 page comes from `src/404.njk`).
- **Redundant cleaning:** `copy-docs.js` clears `docs/` itself, so `predeploy` (`clean-docs.js`) does the same work again.
- **Two wikilink mechanisms:** the markdown-it plugin handles Markdown, and the HTML transform handles everything else (and re-checks link classes). The transform alone would be enough, but the plugin avoids regex-on-HTML for content.
- **Backlink snippets come from raw Markdown**, so inline HTML or Markdown syntax next to a `[[term]]` can show up in the snippet text (it's escaped, so it's safe).
- **Theme flash:** `main.js` runs at the end of `<body>`, so a returning visitor with the override set may briefly see the OS theme before the checkbox is restored.
- **`rfc822Date`** formats with *local* hours but always appends `+0000`, so RSS timestamps are shifted by the build machine's UTC offset.
- **`og:type`** is `article` only for URLs containing `marginalia`. Fragments get `website`.
- **`src/404.njk`** nests its own `<main>` inside the layout's `<main>`.
- **`archive-old-html/`** isn't used by the build anymore.
