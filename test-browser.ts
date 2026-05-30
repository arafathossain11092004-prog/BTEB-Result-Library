import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`BROWSER CONSOLE [${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', error => {
    console.log('BROWSER PAGEERROR:', error.message);
  });

  page.on('requestfailed', request => {
    console.log(`BROWSER REQUEST_FAILED: ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });

  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
  console.log("Puppeteer test finished.");
})();
