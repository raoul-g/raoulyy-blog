# CLAUDE.md

Personal Eleventy 3 blog, deployed to GitHub Pages by GitHub Actions on every push to `main`.
Read `README.md` (authoring, scripts, topics syntax) and `ARCHITECTURE.md` (diagrams of build, deploy, topics) first, and keep both up to date when changing how things work.

## Working with Raoul

- **Never push without being asked.** A push to `main` deploys the live site. Commit locally, let Raoul preview with `pnpm run serve`, and push only when told to.
- **One commit per logical change**, with a message that explains why.
- **The writing is Raoul's.** Don't reword posts. For content changes like topic marks, propose exact phrases and apply only what Raoul approves.
- Raoul often has `pnpm run serve` running. Don't kill it; ask Raoul to restart it after changes to `.eleventy.js` or `lib/`.

## Verifying changes

- **Refactors must not change output unintentionally.** Build before and after (`pnpm run build`, copy `_site/` aside) and diff. For intended changes, check that the diff contains only those.
- **Feed links must be absolute:** `grep -c 'href="/' _site/rss.xml` must be 0. Eleventy's own HTML transform (which makes feed links absolute) runs before config transforms, so `src/rss.njk` applies the `wikilinks` filter before `renderTransforms`.
- After pushing, watch the run (`gh run watch`) and smoke-test the live site with `curl`.

## Traps

- **Paginated templates** (like `src/topic.njk`) need `addAllPagesToCollections: true`, or only their first page reaches `collections.all` and the sitemap.
- **Editing post bodies by script:** a post's front matter `description` often repeats its first sentence. Edit only the body, after the closing `---`.
- **`markdown-it` is not a dependency.** Configure Eleventy's instance with `amendLibrary`; don't `require("markdown-it")`.
- **Nunjucks autoescapes output.** Filter results are escaped (e.g. `'` → `&#39;`), which is fine; don't mark user-facing text `safe` to avoid it.

## Conventions

- **Topics:** `[[topic]]` or `[[topic|text shown]]` (topic first, like Obsidian). People use their full name (`[[Friedrich Nietzsche|Nietzsche]]`), with exceptions like `[[Jesus]]`. A topic gets a page once it appears in 2 posts (`MIN_POSTS` in `lib/topics.js`).
- **Privacy:** fonts and all assets are self-hosted; the only third-party request is GoatCounter analytics. Keep it that way: no CDNs, Google Fonts or embeds.
- **Supply chain:** pnpm refuses packages younger than 3 days (`pnpm-workspace.yaml`). GitHub Actions are pinned to commit SHAs with the version in a comment; keep that format when updating them.
