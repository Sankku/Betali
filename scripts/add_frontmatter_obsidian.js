const fs = require('fs');
const path = require('path');

const vaultPath = '/Users/santiagoalaniz/Dev/Personal/SaasRestaurant/docs/obsidian-vault';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.md')) {
        arrayOfFiles.push(path.join(dirPath, "/", file));
      }
    }
  });

  return arrayOfFiles;
}

const files = getAllFiles(vaultPath);

const frontmatter = `---
tags: [arquitectura, saas, multi-tenant]
project: betali
type: spec
created: 2026-04-09
updated: 2026-04-09
---
`;

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (!content.startsWith('---')) {
    fs.writeFileSync(file, frontmatter + content);
    console.log(`Added frontmatter to ${file}`);
  } else {
    console.log(`Skipped ${file} (already has frontmatter)`);
  }
});
