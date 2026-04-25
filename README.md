# raoulyy-blog

Eleventy-powered personal blog.

## Setup

Install dependencies:

```bash
npm install
```

Build the site:

```bash
npm run build
```

Build the site, regenerate the sitemap, and update `docs/` for GitHub Pages:

```bash
npm run deploy
```

Run a local server with live reload:

```bash
npm run serve
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
- CSS changes do not require rebuilding Eleventy; simply refresh the browser while running `npm run serve` or rebuild if you want a fresh generated site.

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
npm run build
```

6. Preview locally:

```bash
npm run serve
```

## Notes

- The old static HTML files have been moved out of the root so the site works as a clean Eleventy project.
- Output is generated into `_site/`, which is ignored by Git.
- The deployed GitHub Pages site is served from `docs/`, which contains the static build output copied from `_site/`.
- `docs/.nojekyll` is present so GitHub Pages will serve the files directly and will not try to build with Jekyll.

## GitHub Pages deploy workflow

1. Build the site, regenerate the sitemap, and update `docs/` in one command:

```bash
npm run deploy
```

2. Commit and push the generated `docs/` output:

```bash
git add docs/.nojekyll docs
git commit -m "Update deployed site"
git push
```

3. Confirm your repository Pages settings are configured to publish from the `docs/` folder.

4. Every time you update content or templates, repeat the build/copy/commit/push workflow.

## Sitemap

To re-generate the sitemap if needed:

```bash
node ./tools/generate-sitemap.js
```

The deploy command also regenerates the sitemap and copies it into `docs/`.

### Eleventy

Install dependencies:

```
npm install
```

Build the site:

```
npm run build
```

Run a local server with live reload:

```
npm run serve
```
