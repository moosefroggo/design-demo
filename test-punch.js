const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(`
    <style>
      html, body { margin: 0; height: 100%; background: transparent; }
      .cards { width: 100%; height: 100%; background: green; }
    </style>
    <iframe srcdoc="<body style='background:blue;margin:0;'><h1 style='color:white'>Iframe</h1></body>" style="position:fixed;inset:0;width:100%;height:100%;border:none;z-index:-1;"></iframe>
    <div class="cards">
      <h1>Cards on green background</h1>
    </div>
    <canvas id="c" style="position:fixed;inset:0;width:100%;height:100%;mix-blend-mode:destination-out;pointer-events:none;"></canvas>
    <script>
      const c = document.getElementById('c');
      c.width = window.innerWidth;
      c.height = window.innerHeight;
      const ctx = c.getContext('2d');
      ctx.fillStyle = 'rgba(255, 255, 255, 1)'; // This should erase the green background and cards
      ctx.fillRect(100, 100, 200, 200);
    </script>
  `);
  await page.screenshot({path: 'test-punch.png'});
  await browser.close();
})();
