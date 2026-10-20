# raoulyy-blog

Eleventy-powered personal blog.

For diagrams of how the build, deploy, topics, and client-side scripts fit together, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Setup

This project uses pnpm (version pinned in `package.json`). Enable it once via corepack:

```bash
corepack enable pnpm
```

Install dependencies:

```bash
pnpm install
```

## Scripts

| Command | What it does | When to use it |
|---|---|---|
| `pnpm run serve` | Local preview at `http://localhost:8080` with live reload | While writing posts or changing templates/CSS |
| `pnpm run build` | Builds the whole site once into `_site/` (same as the deploy) | To check the build before pushing or inspect the output (e.g. `_site/rss.xml`) |
| `prebuild` | Deletes `_site/`; runs automatically before `build` | Never directly. If `serve` shows a page you've deleted, run `build` once and restart `serve`. |

Deploying doesn't need a script: pushing to `main` builds and publishes the site (see [Deploying](#deploying)).

## Project structure

- `src/index.njk` — homepage source
- `src/marginalia.njk` — marginalia listing page
- `src/marginalia/*.md` — markdown posts for each marginalia entry
- `src/fragments.njk` — fragments listing page
- `src/fragments/*.md` — markdown mini-essays between 200 and 250 words
- `src/404.njk` — Eleventy 404 page
- `src/topics.njk`, `src/topic.njk`, `lib/topics.js` — topic list, one page per topic, and the logic behind them (see [Topics](#topics))
- `src/backlinks.njk` — redirects old `/backlinks.html?term=…` links to topic pages
- `src/rss.njk`, `src/sitemap.njk` — RSS feed and sitemap
- `src/hidden/*.md` — unlisted pages, reachable only via direct link
- `src/_data/site.json` — global site title, description, URL and preview image
- `css/`, `js/`, `images/` — static assets copied through unchanged

## Styling

The site styles are defined in `css/style.css`.

- Global design tokens are set in `:root` at the top of the file.
- Change colors by editing variables such as `--bg-color`, `--text-main`, `--text-muted`, `--accent`, `--border`, and `--text-highlight`.
- Fonts are self-hosted in `css/fonts/` (iA Writer Quattro for body text, Fraunces for headings) and declared with `@font-face` at the top of `css/style.css`. To change typography, add the new `.woff2` files (plus their license) to `css/fonts/`, declare them there, and update the `--font-sans` / `--font-title` variables. If you add a font that's on every page, update the matching `<link rel="preload">` in `src/_includes/layouts/base.njk` too.
- Page layout, spacing, and content width are managed in the body and section rules, so adjust `body { max-width; padding; }` and the nav/content selectors to tweak the page layout.
- Dark mode is handled by the theme toggle and media queries in `css/style.css`; editing the dark-mode variable values will change the alternate theme palette.
- CSS changes do not require rebuilding Eleventy; simply refresh the browser while running `pnpm run serve` or rebuild if you want a fresh generated site.

## Adding a new marginalia post

1. Create a new file in `src/marginalia/` with a `.md` extension.
2. Add front matter at the top, for example:

```yaml
---
title: Your Post Title
description: A short page description for SEO and social sharing.
book: "Book Title | Author Name"
date: 2026-04-10
permalink: "/marginalia/your-post-slug.html"
---
```

   No `layout` needed: every file in `src/marginalia/` gets `layouts/marginalia.njk` from `src/marginalia/marginalia.json`.

3. Add your post content after the front matter.
4. The listing page will be regenerated automatically when you build.

Example content:

```markdown
<p class="book-title">'Book Title' | Author Name</p>
<h1 class="review-title">Your Post Title</h1>

Your post text here...
```

5. Build the site again:

```bash
pnpm run build
```

6. Preview locally:

```bash
pnpm run serve
```

## Adding a new fragment

1. Create a new file in `src/fragments/` with a `.md` extension.
2. Add front matter at the top, for example:

```yaml
---
title: Your Fragment Title
description: A short page description for SEO and social sharing.
date: 2026-04-10
permalink: "/fragments/your-fragment-slug.html"
---
```

   No `layout` needed: every file in `src/fragments/` gets `layouts/fragment.njk` from `src/fragments/fragments.json`.

3. Write your fragment body below the front matter. Fragment pages are rendered as mini-essays in the `src/fragments/` collection.
4. The fragment listing page uses `description` to render the card subtitle, so keep it concise.

5. Build the site again:

```bash
pnpm run build
```

6. Preview locally:

```bash
pnpm run serve
```

## Topics

Wrap a word or name in double brackets in any fragment or marginalia post to mark it as a topic:

```markdown
Studies have shown that [[willpower]] is a limited resource.
```

- Once a topic appears in **at least two posts**, every `[[…]]` mention of it becomes a link to its page at `/topics/<topic>.html`, and it's listed on `/topics.html`.
- Until then it renders as plain text. You can mark topics freely: they turn into links on their own once another post picks them up.
- Capitalization doesn't matter: `[[Willpower]]` and `[[willpower]]` are the same topic.

## Notes

- Output is generated into `_site/`, which is ignored by Git.

## Deploying

The site is deployed to GitHub Pages by GitHub Actions (`.github/workflows/deploy.yml`). Every push to `main` installs dependencies, runs `pnpm run build`, and publishes `_site/`. There is nothing to build or commit by hand:

```bash
git add src/fragments/012-my-new-fragment.md
git commit -m "publish new fragment (12)"
git push
```

Progress and errors show up in the repository's **Actions** tab. A failed build leaves the live site on the last successful version. A deploy can also be started manually there via **Run workflow**.

The repository's Pages settings must have **Source: GitHub Actions** (Settings → Pages).

## Sitemap

`sitemap.xml` is generated on every build from `src/sitemap.njk` and lists every page in `collections.all`. To keep a page out of the sitemap (as is done for `404.njk`), add this to its front matter:

```yaml
eleventyExcludeFromCollections: true
```

## Hidden pages

Pages in `src/hidden/` are only reachable via a direct link. `src/hidden/hidden.json` gives every file in that folder the marginalia layout, keeps it out of listings, RSS, topics and the sitemap, and adds `<meta name="robots" content="noindex">` so search engines don't index it. Front matter only needs `title`, `description` and `permalink`.
