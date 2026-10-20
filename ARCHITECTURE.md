# Architecture

How raoulyy.blog works technically, from writing Markdown to a page in someone's browser.

**In one sentence:** Markdown and Nunjucks sources in `src/` are compiled by Eleventy 3 into `_site/`. On every push to `main`, a GitHub Actions workflow runs that build and publishes `_site/` to GitHub Pages at `raoulyy.blog`. On the client, one small vanilla JS file handles the theme toggle, sharing and analytics. Everything else, including the topic pages, is plain static HTML.

---

## 1. System overview

```mermaid
flowchart LR
    subgraph Author["✍️ Authoring (local)"]
        MD["src/fragments/*.md<br/>src/marginalia/*.md<br/>src/hidden/*.md"]
        NJK["src/*.njk pages<br/>src/_includes/layouts/*.njk"]
        DATA["src/_data/site.json"]
        STATIC["css/ (+ self-hosted fonts) · js/ · images/<br/>CNAME · robots.txt"]
        SERVE["pnpm run serve<br/>localhost:8080"]
    end

    subgraph CI["⚙️ GitHub Actions (.github/workflows/deploy.yml)"]
        ELEVENTY["pnpm install + pnpm run build<br/>Eleventy 3 + .eleventy.js"]
        SITE[("_site/<br/>(Pages artifact)")]
    end

    subgraph Host["☁️ Hosting"]
        GH["GitHub repo<br/>main branch"]
        PAGES["GitHub Pages<br/>CNAME → raoulyy.blog"]
    end

    subgraph Client["🌐 Browser"]
        HTML["Static HTML + CSS"]
        MAINJS["js/main.js"]
    end

    subgraph Ext["External services"]
        GOAT["GoatCounter<br/>raoulyy.goatcounter.com"]
    end

    MD & NJK & DATA & STATIC -. "local preview" .-> SERVE
    MD & NJK & DATA & STATIC -- git push --> GH
    GH -- "push to main" --> ELEVENTY --> SITE
    SITE -- "deploy-pages" --> PAGES
    PAGES --> HTML --> MAINJS
    MAINJS -. "injects count.js" .-> GOAT
```

---

## 2. Repository layout

```mermaid
flowchart TB
    ROOT["raoulyy-blog/"]

    ROOT --> WF[".github/workflows/deploy.yml<br/><i>build + publish to Pages</i>"]
    ROOT --> CFG[".eleventy.js<br/><i>markdown options, RSS plugin, collections<br/>(incl. topics), filters, wikilinks transform</i>"]
    ROOT --> PKG["package.json · pnpm-lock.yaml<br/>pnpm-workspace.yaml<br/><i>scripts, Eleventy dep,<br/>3-day minimumReleaseAge</i>"]
    ROOT --> SRC["src/ <i>(Eleventy input)</i>"]
    ROOT --> ASSETS["css/style.css · css/fonts/ · js/main.js · images/<br/><i>passthrough assets</i>"]
    ROOT --> TOOLS["tools/clean-site.js<br/><i>wipes _site/ before each build</i>"]
    ROOT --> OUT["_site/ <i>(build output, gitignored)</i>"]
    ROOT --> MISC["CNAME · robots.txt"]

    SRC --> PAGES_["index.njk · marginalia.njk · fragments.njk<br/>topics.njk · topic.njk · 404.njk<br/>rss.njk · sitemap.njk · backlinks.njk (redirect)"]
    ROOT --> LIB["lib/topics.js<br/><i>topic index from [[term]]s,<br/>snippets, link rendering</i>"]
    SRC --> LAYOUTS["_includes/layouts/<br/>base · marginalia · fragment"]
    SRC --> DATA["_data/site.json<br/><i>global: title, description, url, image</i>"]
    SRC --> CONTENT["fragments/NNN-*.md + fragments.json<br/>marginalia/*.md + marginalia.json<br/>hidden/*.md + hidden.json<br/><i>folder .json = defaults for every file inside</i>"]
```

---

## 3. Build & deploy pipeline

Publishing is just `git push`. GitHub Actions builds the site from a clean checkout and hands `_site/` to GitHub Pages:

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Raoul
    participant GH as GitHub (main)
    participant B as Actions job "build"
    participant D as Actions job "deploy"
    participant P as GitHub Pages

    Dev->>GH: git push
    GH->>B: trigger deploy.yml (push to main or manual run)
    B-->>B: checkout · pnpm (version from packageManager) · Node 24
    B-->>B: pnpm install --frozen-lockfile
    B-->>B: pnpm run build<br/>prebuild: rm -rf _site/ → eleventy: src/ → _site/<br/>passthrough css/ js/ images/ CNAME robots.txt
    B->>D: upload _site/ as Pages artifact
    D->>P: deploy-pages
    P-->>Dev: live at https://raoulyy.blog (about 1 min after push)
    Note over B,P: If the build fails, nothing is deployed<br/>and the previous version stays live.
```

All actions in the workflow are pinned to commit SHAs. Two deploys never run at the same time (`concurrency: pages`).

Local scripts:

| Script | What it does |
|---|---|
| `pnpm run build` | `prebuild` (wipe `_site/`) → `eleventy`, same as CI |
| `pnpm run serve` | Eleventy dev server with live reload on `localhost:8080` |

---

## 4. Inside the Eleventy build

```mermaid
flowchart TB
    subgraph Config[".eleventy.js"]
        MDLIB["markdown-it (Eleventy's)<br/>+ linkify · typographer"]
        COLL["Collections<br/>marginalia = src/marginalia/*.md<br/>fragments = src/fragments/*.md<br/>(both sorted newest first)"]
        TOP["Collection 'topics'<br/>lib/topics.js over rawInput of all posts<br/>only topics in ≥ 2 posts"]
        FILT["Filters<br/>htmlDate · readableDate · bookLine<br/>wikilinks · topicRedirects · relatedTopics"]
        RSSP["@11ty/eleventy-plugin-rss<br/>dateToRfc822 · getNewestCollectionItemDate<br/>+ HTML base plugin (renderTransforms)"]
        XFORM["Transform 'wikilinks' (*.html)<br/>[[term]] → link to /topics/slug.html<br/>or plain text if the topic has no page"]
        PT["Passthrough copy<br/>css · js · images · CNAME<br/>robots.txt"]
    end

    subgraph Inputs["src/"]
        CM["Content .md<br/>(front matter: title, description,<br/>date, permalink, book)"]
        PG["Pages .njk"]
        SJ["_data/site.json"]
    end

    subgraph Outputs["_site/"]
        O1["index.html · 404.html"]
        O2["marginalia.html + marginalia/*.html"]
        O3["fragments.html + fragments/*.html"]
        O4["hidden/*.html"]
        O5["topics.html + topics/*.html"]
        O6["backlinks.html (redirect)"]
        O7["rss.xml"]
        O8["sitemap.xml"]
    end

    CM --> MDLIB --> LAYOUT["Nunjucks layouts"]
    CM --> COLL
    SJ --> LAYOUT
    PG --> LAYOUT
    COLL --> PG
    CM --> TOP --> PG
    TOP -. "linkable topics" .-> XFORM
    FILT --> LAYOUT
    LAYOUT --> XFORM
    XFORM --> O1 & O2 & O3 & O4 & O5
    PG --> O7 & O8
    RSSP --> O7
    PG --> O6
```

### Template inheritance

```mermaid
flowchart TB
    BASE["<b>layouts/base.njk</b><br/>head: title, meta description, noindex (if set), canonical,<br/>Open Graph (og:type from ogType, default website) + Twitter card, RSS link, style.css, font preloads<br/>header: nav + theme toggle checkbox<br/>+ inline script restoring saved theme<br/><i>block content</i><br/>footer: year, RSS icon<br/>script: /js/main.js"]
    MARG["<b>layouts/marginalia.njk</b><br/>from front matter: book line + h1,<br/>content, date ('thoughts collected by'),<br/>connected.njk, share button<br/>(header/footer only if book is set)"]
    FRAG["<b>layouts/fragment.njk</b><br/>finds own index in collections.fragments<br/>number = total − index<br/>connected.njk (Connected posts box)<br/>prev / next links with tooltip<br/>Share Fragment button"]

    MARG -- extends --> BASE
    FRAG -- extends --> BASE

    MP["src/marginalia/*.md"] -. layout .-> MARG
    HP["src/hidden/*.md"] -. layout .-> MARG
    FP["src/fragments/NNN-*.md"] -. layout .-> FRAG
    PAGES["index · marginalia · fragments<br/>topics · topic · 404 (.njk)"] -. layout .-> BASE
```

`rss.njk`, `sitemap.njk` and `backlinks.njk` render without a layout and are excluded from collections.

### Which page reads which data

| Output | Source | Reads |
|---|---|---|
| `/index.html` | `index.njk` | static text |
| `/marginalia.html` | `marginalia.njk` | `collections.marginalia` → title, `book` (split on ` \| `), date |
| `/fragments.html` | `fragments.njk` | `collections.fragments` → number, title, description, date |
| `/fragments/*.html` | `fragment.njk` layout | `collections.fragments` for numbering + prev/next; `relatedTopics` for the Connected posts box |
| `/marginalia/*.html` | `marginalia.njk` layout | `title`, `book`, `date` for header and footer; post content; `relatedTopics` for the Connected posts box |
| `/hidden/*.html` | `marginalia.njk` layout (via `hidden.json`) | excluded from collections, so not listed, not in RSS, topics, or sitemap; `noindex` meta tag |
| `/rss.xml` | `rss.njk` | fragments + marginalia merged, sorted by date, book line for marginalia, full content through `wikilinks` and then `renderTransforms` with `site.url` (absolute links) |
| `/topics.html` | `topics.njk` | `collections.topics` → term, number of posts |
| `/topics/<slug>.html` | `topic.njk` (pagination, one page per topic) | one topic's mentions: post title, snippet sentence, kind, date |
| `/backlinks.html` | `backlinks.njk` | redirect for old links: `?term=…` → matching topic page, else `/topics.html` |
| `/sitemap.xml` | `sitemap.njk` | `collections.all`, so every page except those with `eleventyExcludeFromCollections` (404, hidden, rss, backlinks redirect); includes all topic pages |

---

## 5. Topics (wikilinks)

Writing `[[willpower]]` in a fragment or marginalia post marks *willpower* as a topic. Everything happens at build time, so no JavaScript is involved:

- **A topic gets a page once it connects at least two posts** (`MIN_POSTS` in `lib/topics.js`). Only then do its `[[…]]` mentions become links. Topics used in a single post render as plain text, but they stay indexed and turn into links automatically when a second post mentions them.
- **Each topic page** (`/topics/<slug>.html`) lists every post that mentions the topic, newest first. Each card shows the sentence the term appears in, with the term highlighted.
- **Each post ends with a "Connected posts" box** (`_includes/connected.njk`, included by both post layouts). For every topic in the post that has a page, it lists up to three *other* posts that mention it, plus "+N more" linking to the topic page. Posts without such topics show no box.
- **Aliases:** `[[topic|text]]` shows *text* in the post (and in its snippet) but counts toward *topic*, e.g. `[[story|stories]]`.
- **Spelling variants share one topic.** Topics are keyed by slug, so `[[Willpower]]` and `[[willpower]]` are the same topic. The lowercase spelling is shown unless every mention is capitalized (e.g. *God*, *Paul Tillich*).

```mermaid
flowchart TB
    subgraph Build["Build time (Eleventy)"]
        POSTS["src/fragments/*.md · src/marginalia/*.md<br/>'…that [[willpower]] is a limited resource…'"]
        IDX["lib/topics.js · buildIndex()<br/>reads each post's rawInput<br/>splits into sentences (Intl.Segmenter)<br/>groups [[term]]s by slug"]
        COLLT["collections.topics<br/>topics in ≥ 2 posts,<br/>most connected first"]
        XF["wikilinks transform (every .html page)<br/>linkable → &lt;a class=topic-link href=/topics/slug.html&gt;<br/>otherwise → plain text"]
        TPL["topic.njk (pagination)<br/>→ /topics/&lt;slug&gt;.html"]
        LIST["topics.njk<br/>→ /topics.html"]
        FEED["rss.njk<br/>content | wikilinks | renderTransforms<br/>→ absolute topic links"]
        REDIR["backlinks.njk<br/>→ /backlinks.html redirect"]
        BOX["connected.njk in post layouts<br/>relatedTopics(page.url)<br/>→ Connected posts box"]
    end

    POSTS --> IDX --> COLLT
    COLLT --> TPL & LIST & REDIR
    IDX -. "which topics are linkable" .-> XF
    IDX -. "other posts per topic" .-> BOX
    POSTS --> XF
    POSTS --> FEED
```

The index is rebuilt on every build inside the `topics` collection. Eleventy builds collections before rendering any page, so the transform and the filters always see the current index.

Old `/backlinks.html?term=…` links still work. They exist in feed readers and anywhere someone copied them. The redirect page maps every spelling of a linkable topic to its page, and sends anything else to `/topics.html`.

---

## 6. Client-side runtime (`js/main.js`)

A single script, loaded at the end of `<body>` on every page. The only exception is restoring the saved theme, which happens in a tiny inline script right after the toggle in `base.njk`, so the page never paints in the wrong theme first:

```mermaid
flowchart TD
    INLINE(["Inline script in header<br/>(runs before first paint)"]) --> T1
    T1{"localStorage<br/>theme-override == 'true'?"} -- yes --> T2["check #theme-toggle-checkbox"]
    T1 -- no --> LOAD
    T2 --> LOAD
    LOAD(["End of body: main.js"]) --> T3["on change → save checked state<br/>to localStorage"]
    T3 --> Y["set #current-year to current year"]
    Y --> S{"#share-btn exists?<br/>(fragment pages)"}
    S -- yes --> S2["on click: navigator.share()<br/>fallback → clipboard.writeText(url)"]
    S -- no --> G
    S2 --> G["inject GoatCounter count.js<br/>(async, gc.zgo.at)"]
    G --> END(["done"])
```

### Theme toggle: CSS only, JS just remembers the choice

The checkbox **inverts** whatever the OS prefers. CSS does the switch with `:root:has(#theme-toggle-checkbox:checked)` inside `prefers-color-scheme` media queries. JS only saves (`main.js`) and restores (inline script in `base.njk`) the checkbox state.

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

Design tokens (`--bg-color`, `--text-main`, `--accent`, `--text-highlight`, …) are set in `:root` at the top of `css/style.css`. Fonts are self-hosted in `css/fonts/`: iA Writer Quattro 400 for body text, and the variable Fraunces (normal + italic, Latin + Latin Extended, split by `unicode-range`) for `h1`–`h3`. Both are preloaded in `base.njk`. The only third-party request a visitor's browser makes is GoatCounter analytics.

---

## 7. URL map

```mermaid
flowchart LR
    HOME["/ (index.html)"] --> MAR["/marginalia.html"]
    HOME --> FRA["/fragments.html"]
    NAV(("nav on<br/>every page")) --> MAR & FRA & TOPS["/topics.html"]
    MAR --> MP["/marginalia/&lt;slug&gt;.html<br/>6 book reflections"]
    FRA --> FP["/fragments/&lt;slug&gt;.html<br/>11 mini-essays, #1…#11"]
    FP -->|prev / next| FP
    TOPS --> TP["/topics/&lt;slug&gt;.html<br/>one per topic in ≥ 2 posts"]
    MP & FP -- "[[term]] links" --> TP
    TP -- "mention cards" --> MP & FP
    OLD["/backlinks.html?term=…<br/>(old links)"] -. "redirect" .-> TP
    FOOT(("footer")) --> RSS["/rss.xml"]
    HID["/hidden/&lt;slug&gt;.html<br/>unlisted, direct link only"]
    SEO["/sitemap.xml · /robots.txt"]
    E404["/404.html (GitHub Pages fallback)"]
```

---

## 8. Content model

| Field | Marginalia | Fragments | Used by |
|---|:-:|:-:|---|
| `layout` | `layouts/marginalia.njk` (set by `marginalia.json`) | `layouts/fragment.njk` (set by `fragments.json`) | Eleventy |
| `title` | ✓ | ✓ | `<title>`, OG/Twitter, listings, RSS, topic pages |
| `description` | ✓ | ✓ | meta description, fragment card subtitle, RSS `<description>` |
| `date` | ✓ | ✓ | sort order, numbering, `<time>`, RSS `pubDate` |
| `permalink` | ✓ | ✓ | output URL (file names like `011-…` don't affect the URL) |
| `book` | `"Title \| Author"` | – | book line on the post, marginalia listing subtitle, RSS (via the `bookLine` filter) |

Fragment numbers (`#11`) aren't stored anywhere. They come from each fragment's position in the date-sorted collection, so adding one with an earlier date renumbers the ones after it.

---

## 9. Observations & quirks

Found while analysing the project. None of them break the site, but they're good to know:

- **Topic snippets come from raw Markdown** with tags and basic Markdown syntax stripped (`lib/topics.js`). Unusual syntax next to a `[[term]]` (e.g. footnotes) could still show up in the snippet text. It's escaped, so it's safe.
