const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <style>
      body { margin: 0; background: green; } /* The old page */
    </style>
    <div style="position:fixed;inset:0;isolation:isolate;">
      <iframe srcdoc="<body style='background:blue;margin:0;'><h1 style='color:white'>Hello</h1></body>" style="position:absolute;inset:0;width:100%;height:100%;border:none;"></iframe>
      <canvas id="c" style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:destination-in;"></canvas>
    </div>
    <script>
      const c = document.getElementById('c');
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // opaque center
      ctx.fillRect(100, 100, 200, 200);
      // outside is transparent
    </script>
  `);
  await page.screenshot({path: 'test-blend-screenshot.png'});
  await browser.close();
  console.log('done');
})();
