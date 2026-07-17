import { chromium } from 'playwright';

async function captureScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Capture Dashboard
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'dashboard.png', fullPage: true });
  console.log('Dashboard screenshot captured');
  
  // Capture Dictionaries list
  await page.goto('http://localhost:5173/dictionaries', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'dictionaries.png', fullPage: true });
  console.log('Dictionaries screenshot captured');
  
  // Capture New Dictionary page
  await page.goto('http://localhost:5173/dictionaries/new', { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'new-dictionary.png', fullPage: true });
  console.log('New Dictionary screenshot captured');
  
  await browser.close();
  console.log('All screenshots saved!');
}

captureScreenshots().catch(console.error);