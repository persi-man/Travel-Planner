const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const previewDir = path.join(__dirname, '..', '.preview');
const targetDir = path.join(previewDir, 'Travel-Planner');
const outDir = path.join(__dirname, '..', 'out');

if (!fs.existsSync(outDir)) {
  console.error('Run npm run build:pages first.');
  process.exit(1);
}

fs.rmSync(previewDir, { recursive: true, force: true });
fs.mkdirSync(targetDir, { recursive: true });

for (const entry of fs.readdirSync(outDir)) {
  const src = path.join(outDir, entry);
  const dest = path.join(targetDir, entry);
  fs.cpSync(src, dest, { recursive: true });
}

// Redirect root → /Travel-Planner/ (same layout as github.io)
const redirectHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=/Travel-Planner/" />
  <title>Travel Planner</title>
  <script>location.replace('/Travel-Planner/')</script>
</head>
<body>
  <p>Redirection vers <a href="/Travel-Planner/">Travel Planner</a>…</p>
</body>
</html>
`;
fs.writeFileSync(path.join(previewDir, 'index.html'), redirectHtml);

const appUrl = 'http://127.0.0.1:3000/Travel-Planner/';
console.log('');
console.log('  Preview GitHub Pages (build statique)');
console.log(`  → ${appUrl}`);
console.log('');
console.log('  Pour le dev quotidien (hot reload, sans sous-chemin) : npm run dev');
console.log('');

const quotedDir = `"${previewDir}"`;
const child = spawn(`npx serve -l 3000 ${quotedDir}`, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
