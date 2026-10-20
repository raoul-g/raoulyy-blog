const { rssPlugin } = require("@11ty/eleventy-plugin-rss");
const topics = require("./lib/topics");

module.exports = function(eleventyConfig) {
  eleventyConfig.amendLibrary("md", (md) => md.set({ linkify: true, typographer: true }));

  // Feed date filters + absolute URLs in feed content (see src/rss.njk)
  eleventyConfig.addPlugin(rssPlugin);

  eleventyConfig.addPassthroughCopy("css");
  eleventyConfig.addPassthroughCopy("js");
  eleventyConfig.addPassthroughCopy("images");
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy("robots.txt");

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

  // Topics from [[term]]s in posts (see lib/topics.js). Rebuilt on every build; the filters and the
  // wikilinks transform below read the latest index, as collections are built before any page renders.
  const slugify = eleventyConfig.getFilter("slugify");
  let topicIndex = topics.buildIndex([], slugify);

  eleventyConfig.addCollection("topics", function(collectionApi) {
    const posts = collectionApi.getFilteredByGlob(["src/fragments/*.md", "src/marginalia/*.md"]);
    topicIndex = topics.buildIndex(posts, slugify);
    return topicIndex.linkable;
  });

  eleventyConfig.addFilter("relatedTopics", (url) => topicIndex.relatedFor(url));

  eleventyConfig.addFilter("topicRedirects", (topicList) => {
    return Object.fromEntries(topicList.flatMap((topic) => topic.aliases.map((alias) => [alias, topic.slug])));
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

  eleventyConfig.addTransform("wikilinks", function(content, outputPath) {
    if (!outputPath || !outputPath.endsWith(".html")) {
      return content;
    }
    return topics.renderWikilinks(content, topicIndex, slugify);
  });

  // Same as the transform, for feed content: Eleventy's own HTML transform (which makes feed links absolute)
  // runs before config transforms, so src/rss.njk applies this filter first.
  eleventyConfig.addFilter("wikilinks", (content) => topics.renderWikilinks(content, topicIndex, slugify));

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
