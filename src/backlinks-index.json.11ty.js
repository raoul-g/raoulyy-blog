const fs = require('fs');
const path = require('path');

function normalizeTerm(value) {
  return value.trim().toLowerCase();
}

function cleanContent(text) {
  return text
    .replace(/^---[\s\S]*?---\s*/, '')
    .replace(/\r\n?/g, '\n');
}

function extractWikilinksWithSnippets(text) {
  const regex = /\[\[([^\]]+?)\]\]/g;
  const entries = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const label = match[1].trim();
    if (!label) continue;

    const windowSize = 120;
    const start = Math.max(0, match.index - 40);
    const end = Math.min(text.length, match.index + label.length + 60);
    let snippet = text.slice(start, end).replace(/\s+/g, ' ').replace(/\[\[([^\]]+)\]\]/g, '$1').trim();

    if (start > 0) {
      snippet = '…' + snippet;
    }
    if (end < text.length) {
      snippet = snippet + '…';
    }

    entries.push({
      label,
      snippet
    });
  }

  return entries;
}

module.exports = class {
  data() {
    return {
      permalink: '/backlinks-index.json',
      layout: false,
      eleventyExcludeFromCollections: true
    };
  }

  render(data) {
    const sourceRoot = path.dirname(data.page.inputPath);
    const collectionNames = ['fragments', 'marginalia'];
    const pageIndex = new Map();

    for (const name of collectionNames) {
      const pages = data.collections[name] || [];
      for (const item of pages) {
        pageIndex.set(path.resolve(item.inputPath), {
          title: item.data.title || item.fileSlug || '',
          url: item.url,
          collection: name,
          date: item.date ? item.date.toISOString() : null
        });
      }
    }

    const index = {};
    for (const name of collectionNames) {
      const dirPath = path.resolve(sourceRoot, name);
      if (!fs.existsSync(dirPath)) {
        continue;
      }

      for (const fileName of fs.readdirSync(dirPath)) {
        if (!fileName.endsWith('.md')) {
          continue;
        }

        const filePath = path.resolve(dirPath, fileName);
        const pageData = pageIndex.get(filePath);
        if (!pageData) {
          continue;
        }

        const rawContent = fs.readFileSync(filePath, 'utf8');
        const content = cleanContent(rawContent);
        const matches = extractWikilinksWithSnippets(content);

        for (const match of matches) {
          const key = normalizeTerm(match.label);
          if (!index[key]) {
            index[key] = {
              term: match.label,
              mentions: []
            };
          }

          if (!index[key].mentions.some((mention) => mention.url === pageData.url)) {
            index[key].mentions.push({
              ...pageData,
              snippet: match.snippet
            });
          }
        }
      }
    }

    const terms = Object.keys(index)
      .sort((a, b) => index[b].mentions.length - index[a].mentions.length)
      .map((key) => ({
        term: index[key].term,
        count: index[key].mentions.length
      }));

    index._terms = terms;
    return JSON.stringify(index, null, 2);
  }
};
