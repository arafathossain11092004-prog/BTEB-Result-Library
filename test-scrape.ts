import { load } from 'cheerio';
async function run() {
  const code = '56055';
  const response = await fetch(`http://localhost:3000/institute-results/${code}`, {
    headers: {
      'Accept': 'text/html',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  console.log(response.status);
  const html = await response.text();
  console.log("Response starts with:", html.substring(0, 100));
  if (html.includes('header, footer, nav[aria-label="breadcrumb"]')) {
      console.log("CSS successfully injected!");
  } else {
      console.log("CSS injection failed.");
  }
}
run();
