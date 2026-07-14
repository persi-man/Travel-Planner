const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

process.env.GITHUB_PAGES = 'true';

console.log('Building for GitHub Pages...');
execSync('npx next build', { stdio: 'inherit', env: process.env });

const outDir = path.join(__dirname, '..', 'out');
const indexHtml = path.join(outDir, 'index.html');
const notFoundHtml = path.join(outDir, '404.html');

if (fs.existsSync(indexHtml)) {
  fs.copyFileSync(indexHtml, notFoundHtml);
  console.log('Copied index.html → 404.html for SPA routing on GitHub Pages');
} else {
  console.warn('Warning: out/index.html not found');
}

console.log('GitHub Pages build complete.');
