const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('file://' + process.cwd() + '/tracktor-one-pager.html', {
    waitUntil: 'networkidle'
  });

  await page.pdf({
    path: 'TrackTor-One-Pager.pdf',
    format: 'A4',
    printBackground: true,
    margin: {
      top: '0',
      right: '0',
      bottom: '0',
      left: '0'
    }
  });

  await browser.close();

  console.log('✓ PDF generado: TrackTor-One-Pager.pdf');
})();
