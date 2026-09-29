// Genera Tracktor-One-Pager.pdf (A4) desde one-pager.html.
// La primera vez: npx playwright install chromium
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto('file://' + process.cwd() + '/one-pager.html', {
    waitUntil: 'networkidle'
  });

  await page.pdf({
    path: 'Tracktor-One-Pager.pdf',
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

  console.log('✓ PDF generado: Tracktor-One-Pager.pdf');
})();
