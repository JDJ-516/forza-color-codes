const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const snapshot=JSON.parse(fs.readFileSync('public/rare-cars.json','utf8'));let calls=0;const firstSeen=new Date().toISOString();
 await page.route('**/api/rare-cars',route=>{calls++;const data=structuredClone(snapshot);if(calls>=2)data.cars.push({...data.cars[0],id:'test-new-car',model:'Fresh spreadsheet addition',addedAt:firstSeen});data.sync={origin:calls>=3?'cached':'live',checkedAt:new Date().toISOString(),nextCheckAt:new Date(Date.now()+600000).toISOString(),error:calls>=3?'Google Sheets returned HTTP 403':null};return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});});
 await page.clock.install();await page.goto((process.env.TEST_BASE_URL||'http://127.0.0.1:3000')+'/#cars');
 await page.waitForFunction(()=>document.querySelector('#rare-cars-sync').textContent.startsWith('Last updated:')&&document.querySelector('#rare-cars-sync').dataset.state==='live');
 assert.match(await page.locator('#rare-cars-count').textContent(),/284 total.*10 categories/);assert.equal(await page.locator('#rare-cars-results .rare-car').count(),30);
 await page.locator('#rare-cars-category').selectOption('Special Aftermarket Car Spawns');assert.equal(await page.locator('#rare-cars-results .rare-car').count(),4);assert.match(await page.locator('#rare-cars-results').textContent(),/Shimanoyama/);assert.match(await page.locator('#rare-cars-category-notes').textContent(),/Permanent Spawns/);
 await page.locator('#rare-cars-search').fill('BRZ');assert.equal(await page.locator('#rare-cars-results .rare-car').count(),1);await page.locator('[data-rare-car]').click();assert.equal(await page.locator('#drag-form [name=car]').inputValue(),'2022 Subaru BRZ Forza Edition');
 await page.locator('[data-workspace=cars]').first().click();await page.locator('#rare-cars-search').fill('');await page.locator('#rare-cars-category').selectOption('');
 await page.locator('#rare-cars-refresh').click();await page.waitForFunction(()=>document.querySelector('#rare-cars-count').textContent.includes('285 total'));assert.equal(await page.locator('.rare-category-group').count(),10);assert.doesNotMatch(await page.locator('#rare-cars-results').textContent(),/Source row/);await page.locator('[data-car-tab=new]').click();assert.equal(await page.locator('.new-badge').count(),1);assert.equal(await page.locator('#rare-cars-results .rare-car').count(),1);await page.locator('[data-car-tab=all]').click();await page.locator('#rare-cars-search').fill('Fresh spreadsheet addition');assert.equal(await page.locator('#rare-cars-results .rare-car').count(),1);
 await page.locator('#rare-cars-refresh').click();await page.waitForFunction(()=>document.querySelector('#rare-cars-sync').dataset.state==='cached');assert.equal(await page.locator('#rare-cars-results .rare-car').count(),1);
 const autoRefresh=page.waitForRequest('**/api/rare-cars');await page.clock.fastForward(600001);await autoRefresh;
 await page.locator('#rare-cars-search').fill('');await page.screenshot({path:'/tmp/rare-cars-desktop.png',fullPage:true});await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:'/tmp/rare-cars-mobile.png',fullPage:true});
 await page.clock.fastForward(16*86400000);await page.clock.fastForward(15*86400000);await page.locator('[data-car-tab=new]').click();assert.equal(await page.locator('.new-badge').count(),0);assert.match(await page.locator('#rare-cars-results').textContent(),/No new entries/);
 assert.deepEqual(errors,[]);console.log('PASS: all categories, search, source legends, calculator name handoff, live additions, cached error display, and mobile layout. Remote refresh responses use fixtures.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
