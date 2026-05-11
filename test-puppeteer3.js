const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/nextwork-directory.html', {waitUntil: 'networkidle0'});
  console.log('Page loaded! Clicking first card...');
  await page.click('.series-card');
  console.log('Waiting 5 seconds for animation...');
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({path: 'test-screenshot-after-click.png'});
  console.log('Done!');
  await browser.close();
})();
