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

console.log('Preview ready at http://127.0.0.1:3000/Travel-Planner/');

const quotedDir = `"${previewDir}"`;
const child = spawn(`npx serve -l 3000 ${quotedDir}`, {
  stdio: 'inherit',
  shell: true,
});

child.on('exit', (code) => process.exit(code ?? 0));
