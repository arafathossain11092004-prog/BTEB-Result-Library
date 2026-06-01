import fs from 'fs';
const content = fs.readFileSync('src/pages/ResultView.tsx', 'utf8');
const results = content.match(/(sm|md|lg):[a-zA-Z0-9-\[\]]+/g);
if (results) {
  const unique = [...new Set(results)].sort();
  console.log(unique.join('\n'));
}
