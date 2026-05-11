const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/nextwork-directory.html', {waitUntil: 'networkidle0'});
  await page.click('.series-card');
  await new Promise(r => setTimeout(r, 5000));
  
  const frames = await page.frames();
  console.log('Frames:', frames.length);
  
  const iframeContent = await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    if (!iframe) return 'No iframe found';
    return iframe.contentWindow.document.body.innerHTML.substring(0, 200);
  });
  console.log('Iframe content:', iframeContent);

  const wrapperVisible = await page.evaluate(() => {
    const wrapper = document.getElementById('hole-wrapper');
    if (!wrapper) return 'No wrapper';
    return wrapper.style.cssText;
  });
  console.log('Wrapper css:', wrapperVisible);

  await browser.close();
})();
