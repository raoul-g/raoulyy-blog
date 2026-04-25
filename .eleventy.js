module.exports = function(eleventyConfig) {
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

  return {
    dir: {
      input: "src",
      includes: "_includes",
      data: "_data",
      output: "_site"
    }
  };
};
