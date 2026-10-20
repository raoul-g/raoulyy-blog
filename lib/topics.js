// Topics: every [[term]] written in a post becomes a topic.
// [[topic|text]] shows "text" but counts toward "topic", e.g. [[story|stories]] or [[Buddhism|the Buddha]].
// A topic only gets a page (and its [[term]]s become links) once it connects at least MIN_POSTS posts,
// so readers never click through to a page that only lists the post they came from.

const MIN_POSTS = 2;
const WIKILINK = /\[\[([^\]]+?)\]\]/g;
const SNIPPET_SIDE = 110; // max characters kept on each side of the term in a snippet

const sentences = new Intl.Segmenter("en", { granularity: "sentence" });

// Curly quotes and apostrophes, like markdown-it's typographer produces on the rendered page.
function smartQuotes(text) {
  return text
    .replace(/(^|[\s(\[—–-])"/g, "$1“")
    .replace(/"/g, "”")
    .replace(/(^|[\s(\[—–-])'/g, "$1‘")
    .replace(/'/g, "’");
}

// Turn raw Markdown/HTML into plain text paragraphs, keeping [[term]] markers in place.
function toParagraphs(rawInput) {
  return rawInput
    .replace(/<br\s*\/?>|<\/br>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/(?<!\[)\[([^\[\]]+)\]\([^)]*\)/g, "$1") // [text](url) → text
    .replace(/^#+\s*/gm, "")
    .replace(/\*\*|__|\*|`/g, "")
    .replace(/(?<!\w)_|_(?!\w)/g, "") // _emphasis_, but keep underscores inside words
    .split(/\n\s*\n/)
    .map((paragraph) => smartQuotes(paragraph.replace(/\s+/g, " ").trim()))
    .filter(Boolean);
}

// The inside of [[…]]: "topic" or "topic|text shown in the post".
function parseWikilink(inner) {
  const [topic, text] = inner.split("|").map((part) => part.trim());
  return { topic, text: text || topic };
}

function stripMarkers(text) {
  return text.replace(WIKILINK, (match, inner) => parseWikilink(inner).text);
}

function trimStart(text) {
  if (text.length <= SNIPPET_SIDE) return text;
  const cut = text.slice(-SNIPPET_SIDE);
  return "…" + cut.slice(cut.indexOf(" ") + 1);
}

function trimEnd(text) {
  if (text.length <= SNIPPET_SIDE) return text;
  const cut = text.slice(0, SNIPPET_SIDE);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

// Every [[term]] in a post, with the sentence it appears in split into before / match / after.
function extractMentions(rawInput) {
  const mentions = [];
  for (const paragraph of toParagraphs(rawInput)) {
    for (const { segment } of sentences.segment(paragraph)) {
      const sentence = segment.trim();
      for (const match of sentence.matchAll(WIKILINK)) {
        const { topic, text } = parseWikilink(match[1]);
        if (!topic) continue;
        mentions.push({
          label: topic,
          snippet: {
            before: trimStart(stripMarkers(sentence.slice(0, match.index))),
            match: text,
            after: trimEnd(stripMarkers(sentence.slice(match.index + match[0].length)))
          }
        });
      }
    }
  }
  return mentions;
}

// Prefer a lowercase spelling ("willpower" over "Willpower" at the start of a sentence);
// proper nouns like "God" or "Paul Tillich" keep their capitals.
function preferredTerm(labels) {
  return labels.find((label) => label[0] === label[0].toLowerCase()) || labels[0];
}

function buildIndex(items, slugify) {
  const bySlug = new Map();
  const slugsByUrl = new Map();

  for (const item of [...items].sort((a, b) => a.date - b.date)) {
    const slugsInPost = [];
    for (const { label, snippet } of extractMentions(item.rawInput)) {
      const slug = slugify(label);
      if (!slug) continue;
      if (!bySlug.has(slug)) bySlug.set(slug, { slug, labels: [], mentions: [] });
      const topic = bySlug.get(slug);
      if (!topic.labels.includes(label)) topic.labels.push(label);
      if (slugsInPost.includes(slug)) continue; // count each post once, with its first mention
      slugsInPost.push(slug);
      topic.mentions.push({
        url: item.url,
        title: item.data.title,
        kind: item.inputPath.includes("/marginalia/") ? "marginalia" : "fragment",
        date: item.date,
        snippet
      });
    }
    slugsByUrl.set(item.url, slugsInPost);
  }

  const linkable = [...bySlug.values()]
    .filter((topic) => topic.mentions.length >= MIN_POSTS)
    .map((topic) => ({
      slug: topic.slug,
      term: preferredTerm(topic.labels),
      // Lowercased spellings, used to redirect old /backlinks.html?term=… links
      aliases: [...new Set(topic.labels.map((label) => label.toLowerCase()))],
      mentions: [...topic.mentions].sort((a, b) => b.date - a.date)
    }))
    .sort((a, b) => b.mentions.length - a.mentions.length || a.term.localeCompare(b.term));
  const linkableBySlug = new Map(linkable.map((topic) => [topic.slug, topic]));

  return {
    linkable,

    isLinkable(slug) {
      return linkableBySlug.has(slug);
    },

    // Topics of the post at `url` that connect it to other posts, in the order they appear in the post.
    relatedFor(url) {
      return (slugsByUrl.get(url) || [])
        .filter((slug) => linkableBySlug.has(slug))
        .map((slug) => {
          const topic = linkableBySlug.get(slug);
          return { ...topic, others: topic.mentions.filter((mention) => mention.url !== url) };
        });
    }
  };
}

// Replace [[term]] in rendered HTML: a link to the topic page if the topic is linkable, plain text otherwise.
// An apostrophe right after "]]" (as in [[Nietzsche]]'s) is left straight by the typographer, so it's curled here.
function renderWikilinks(html, index, slugify) {
  return html.replace(/\[\[([^\]]+?)\]\]('(?=\w))?/g, (match, inner, apostrophe) => {
    const { topic, text } = parseWikilink(inner);
    const slug = slugify(topic);
    const link = index.isLinkable(slug) ? `<a href="/topics/${slug}.html" class="topic-link">${text}</a>` : text;
    return apostrophe ? link + "’" : link;
  });
}

module.exports = { buildIndex, renderWikilinks };
