import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
  
  await page.goto('http://localhost:5125'); // Wait, the local vite server is running on 5173 or docker compose is running on 5125?
  // Let's try 5125 (docker compose) and 5173 (vite)
  try {
    await page.waitForTimeout(2000);
  } catch(e) {}
  
  await browser.close();
})();
