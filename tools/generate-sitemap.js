const fs = require('fs');
const path = require('path');

// --- Configuration ---
const DOMAIN = 'https://raoulyy.blog';
const ROOT_DIR = path.join(__dirname, '..');
const BUILD_DIR = path.join(ROOT_DIR, '_site');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap.xml');

// Directories to skip during scan
const IGNORE_DIRS = ['node_modules', '.git', '.github'];

/**
 * Recursively finds all .html files in a directory
 */
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            if (!IGNORE_DIRS.includes(file)) {
                findHtmlFiles(filePath, fileList);
            }
        } else if (path.extname(file) === '.html' && !file.startsWith('_') && file !== '404.html') {
            // Get path relative to the build directory and convert backslashes to forward slashes
            const relativePath = path.relative(BUILD_DIR, filePath);
            const urlPath = relativePath.split(path.sep).join('/');
            const lastmod = stat.mtime.toISOString().split('T')[0];
            fileList.push({ urlPath, lastmod });
        }
    });

    return fileList;
}

console.log('Scanning for HTML files in _site/...');
const htmlFiles = findHtmlFiles(BUILD_DIR);

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${htmlFiles.map(file => {
    // Handle index.html stripping for cleaner URLs
    let urlPath = file.urlPath === 'index.html' ? '' : file.urlPath;
    urlPath = urlPath.replace(/\/index\.html$/, '/');
    
    const priority = (urlPath === '') ? '1.0' : '0.8';

    return `    <url>
        <loc>${DOMAIN}/${urlPath}</loc>
        <lastmod>${file.lastmod}</lastmod>
        <priority>${priority}</priority>
    </url>`;
}).join('\n')}
</urlset>`;

fs.writeFileSync(OUTPUT_FILE, sitemapContent);
console.log(`✅ Sitemap generated at ${OUTPUT_FILE} with ${htmlFiles.length} URLs.`);