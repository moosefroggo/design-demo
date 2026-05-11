const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  await page.goto('file://' + process.cwd() + '/public/nextwork-directory.html');
  await new Promise(r => setTimeout(r, 1000));
  
  // trigger click
  const card = await page.$('.series-card');
  if(card) {
    await card.click();
    await new Promise(r => setTimeout(r, 50));
    
    // get svg border display
    const svgVisible = await page.evaluate(() => {
      const svg = document.getElementById('hole-border-svg');
      if (!svg) return 'no svg';
      const poly = document.getElementById('hole-border-poly');
      return {
        svgOpacity: getComputedStyle(svg).opacity,
        polyStroke: poly.getAttribute('stroke'),
        polyStrokeWidth: poly.getAttribute('stroke-width'),
        polyPointsLength: poly.getAttribute('points').length
      };
    });
    console.log("SVG visibility:", svgVisible);

    await new Promise(r => setTimeout(r, 500));
    await page.screenshot({path: 'test-clip-anim4.png'});
  } else {
    console.log("Card not found");
  }
  
  await browser.close();
})();
