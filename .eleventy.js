const markdownIt = require("markdown-it");

function wikilinkPlugin(md) {
  function replaceWikilinks(state) {
    const regex = /\[\[([^\]]+?)\]\]/g;

    state.tokens.forEach((token) => {
      if (token.type !== "inline" || !token.children) return;

      const newChildren = [];
      token.children.forEach((child) => {
        if (child.type !== "text") {
          newChildren.push(child);
          return;
        }

        let text = child.content;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            const textToken = new state.Token("text", "", 0);
            textToken.content = text.slice(lastIndex, match.index);
            newChildren.push(textToken);
          }

          const term = match[1].trim();
          const openToken = new state.Token("link_open", "a", 1);
          openToken.attrs = [
            ["href", "/backlinks.html?term=" + encodeURIComponent(term)],
            ["class", "backlink-inline"]
          ];
          const textToken = new state.Token("text", "", 0);
          textToken.content = term;
          const closeToken = new state.Token("link_close", "a", -1);

          newChildren.push(openToken, textToken, closeToken);
          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
          const textToken = new state.Token("text", "", 0);
          textToken.content = text.slice(lastIndex);
          newChildren.push(textToken);
        }
      });

      if (newChildren.length) {
        token.children = newChildren;
      }
    });
  }

  md.core.ruler.after("inline", "wikilinks", replaceWikilinks);
}

module.exports = function(eleventyConfig) {
  const markdownLib = markdownIt({ html: true, linkify: true, typographer: true });
  markdownLib.use(wikilinkPlugin);
  eleventyConfig.setLibrary("md", markdownLib);

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("assets");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("robots.txt");
  eleventyConfig.addPassthroughCopy("sitemap.xml");
  eleventyConfig.addPassthroughCopy("404.html");

  eleventyConfig.addCollection("marginalia", function(collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/marginalia/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("fragments", function(collectionApi) {
    return collectionApi
      .getFilteredByGlob("src/fragments/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addFilter("htmlDate", (dateObj) => {
    return new Date(dateObj).toISOString().split("T")[0];
  });

  eleventyConfig.addFilter("readableDate", (dateObj) => {
    return new Date(dateObj).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  });

  eleventyConfig.addFilter("rfc822Date", (dateObj) => {
    const date = dateObj === "now" ? new Date() : new Date(dateObj);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, "0");
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    
    return `${dayName}, ${day} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
  });

  eleventyConfig.addTransform("wikilinks", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith('.html')) {
      return content;
    }

    let transformed = content.replace(/\[\[([^\]]+?)\]\]/g, (match, term) => {
      const label = term.trim();
      const href = "/backlinks.html?term=" + encodeURIComponent(label);
      return `<a href="${href}" class="backlink-inline">${label}</a>`;
    });

    transformed = transformed.replace(/<a([^>]*href="\/backlinks\.html\?term=[^"]*"[^>]*)>([^<]+)<\/a>/g, (match, attrs, label) => {
      if (/class="[^"]*backlink-inline[^"]*"/.test(attrs)) {
        return match;
      }

      if (/class="[^"]*"/.test(attrs)) {
        return match.replace(/class="([^"]*)"/, (full, classes) => `class="${classes} backlink-inline"`);
      }

      return `<a${attrs} class="backlink-inline">${label}</a>`;
    });

    return transformed;
  });

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
