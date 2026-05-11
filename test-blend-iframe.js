const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <div style="background: red; width: 100vw; height: 100vh;">
      <div style="isolation: isolate; width: 100%; height: 100%;">
        <iframe srcdoc="<body style='background:blue;margin:0;'><h1 style='color:white'>Hello</h1></body>" style="position:absolute;inset:0;width:100%;height:100%;border:none;"></iframe>
        <canvas id="c" style="position:absolute;inset:0;width:100%;height:100%;mix-blend-mode:destination-in;"></canvas>
      </div>
    </div>
    <script>
      const c = document.getElementById('c');
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 1)';
      ctx.fillRect(100, 100, 200, 200);
    </script>
  `);
  await page.screenshot({path: 'test-blend-iframe.png'});
  await browser.close();
})();
