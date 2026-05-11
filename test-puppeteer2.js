const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('http://localhost:3000/nextwork-directory.html', {waitUntil: 'networkidle0'});
  console.log('Page loaded! Taking screenshot...');
  await page.screenshot({path: 'test-screenshot-directory.png'});
  console.log('Done!');
  await browser.close();
})();
