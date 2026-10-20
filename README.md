# raoulyy-blog

Eleventy-powered personal blog.

For diagrams of how the build, deploy, backlinks, and client-side scripts fit together, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Setup

This project uses pnpm (version pinned in `package.json`). Enable it once via corepack:

```bash
corepack enable pnpm
```

Install dependencies:

```bash
pnpm install
```

Build the site:

```bash
pnpm run build
```

Run a local server with live reload:

```bash
pnpm run serve
```

## Project structure

- `src/index.njk` — homepage source
- `src/marginalia.njk` — marginalia listing page
- `src/marginalia/*.md` — markdown posts for each marginalia entry
- `src/fragments.njk` — fragments listing page
- `src/fragments/*.md` — markdown mini-essays between 200 and 250 words
- `src/404.njk` — Eleventy 404 page
- `css/`, `js/`, `images/`, `assets/` — static assets copied through unchanged

## Styling

The site styles are defined in `css/style.css`.

- Global design tokens are set in `:root` at the top of the file.
- Change colors by editing variables such as `--bg-color`, `--text-main`, `--text-muted`, `--accent`, `--border`, and `--text-highlight`.
- Change the typography by updating the `@import` fonts and the `--font-sans` / `--font-title` variables.
- Page layout, spacing, and content width are managed in the body and section rules, so adjust `body { max-width; padding; }` and the nav/content selectors to tweak the page layout.
- Dark mode is handled by the theme toggle and media queries in `css/style.css`; editing the dark-mode variable values will change the alternate theme palette.
- CSS changes do not require rebuilding Eleventy; simply refresh the browser while running `pnpm run serve` or rebuild if you want a fresh generated site.

## Adding a new marginalia post

1. Create a new file in `src/marginalia/` with a `.md` extension.
2. Add front matter at the top, for example:

```yaml
---
layout: layouts/base.njk
title: Your Post Title
description: A short page description for SEO and social sharing.
book: "Book Title | Author Name"
date: 2026-04-10
excerpt: A short summary shown on the marginalia listing page.
permalink: "/marginalia/your-post-slug.html"
---
```

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
layout: layouts/fragment.njk
title: Your Fragment Title
description: A short page description for SEO and social sharing.
date: 2026-04-10
permalink: "/fragments/your-fragment-slug.html"
---
```

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

## Notes

- The old static HTML files have been moved out of the root so the site works as a clean Eleventy project.
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

`sitemap.xml` in the repo root is copied into the build unchanged. To re-generate it after adding or removing pages, build first and then commit the result:

```bash
pnpm run build && node ./tools/generate-sitemap.js
```

### Eleventy

Install dependencies:

```
pnpm install
```

Build the site:

```
pnpm run build
```

Run a local server with live reload:

```
pnpm run serve
```
