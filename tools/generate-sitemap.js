const fs = require('fs');
const path = require('path');

// --- Configuration ---
// TODO: Change this to your actual domain
const DOMAIN = 'https://raoulyy.blog'; 
const ROOT_DIR = path.join(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'sitemap.xml');

// Directories to skip during scan
const IGNORE_DIRS = ['node_modules', '.git', '.github', 'css', 'js', 'img', 'assets', 'scripts', 'tools'];

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
        } else if (path.extname(file) === '.html' && !file.startsWith('_')) {
            // Get path relative to root and convert backslashes to forward slashes
            const relativePath = path.relative(ROOT_DIR, filePath);
            const urlPath = relativePath.split(path.sep).join('/');
            fileList.push(urlPath);
        }
    });

    return fileList;
}

console.log('Scanning for HTML files...');
const htmlFiles = findHtmlFiles(ROOT_DIR);
const currentDate = new Date().toISOString().split('T')[0];

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${htmlFiles.map(file => {
    // Handle index.html stripping for cleaner URLs
    let urlPath = file === 'index.html' ? '' : file;
    urlPath = urlPath.replace(/\/index\.html$/, '/');
    
    const priority = (urlPath === '') ? '1.0' : '0.8';

    return `    <url>
        <loc>${DOMAIN}/${urlPath}</loc>
        <lastmod>${currentDate}</lastmod>
        <priority>${priority}</priority>
    </url>`;
}).join('\n')}
</urlset>`;

fs.writeFileSync(OUTPUT_FILE, sitemapContent);
console.log(`✅ Sitemap generated at ${OUTPUT_FILE} with ${htmlFiles.length} URLs.`);