const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox']});
 try{
  const base=process.env.TEST_BASE_URL||'http://127.0.0.1:3000',version=JSON.parse(fs.readFileSync('package.json','utf8')).version;
  const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const rare=JSON.parse(fs.readFileSync('public/rare-cars.json','utf8'));rare.sync={origin:'bundled',checkedAt:null,error:'QA offline fixture'};
  await page.route('**/api/rare-cars',r=>r.fulfill({contentType:'application/json',body:JSON.stringify(rare)}));
  await page.goto(base);await page.locator('#featured-recipe').waitFor();
  assert.equal((await (await page.request.get(base+'/api/health')).json()).version,version);
  assert.equal(version,'0.16.0');assert.equal(await page.locator('footer').count(),0);assert.equal(await page.locator('#app-version').textContent(),'Build '+version);
  assert.doesNotMatch(await page.locator('h1').textContent(),/Your dashboard/);
  assert.doesNotMatch(await page.locator('#featured-refresh').textContent(),/Preview is approximate/);
  await page.locator('#library-nav').click();assert.equal(await page.locator('.card-bottom').filter({hasText:'SPREADSHEET'}).count(),0);
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   for(const view of ['garage','library','lab','cars','tuning','telemetry']){
    if(view==='library')await page.locator('#library-nav').click();else await page.locator(`.topbar [data-workspace=${view}]`).click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${view} overflows at ${width}px`);
    if(view==='tuning')for(const mode of ['drag','track','drift']){const button=page.locator(`[data-tune-mode=${mode}]`);if(await button.getAttribute('aria-expanded')!=='true')await button.click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${mode} overflows at ${width}px`);}
   }
   await page.locator('#library-nav').click();await page.locator(await page.locator('#add-color').isVisible()?'#add-color':'#add-bottom').click();assert.equal(await page.locator('#create').evaluate(e=>e.scrollWidth<=e.clientWidth),true,`color modal overflows at ${width}px`);await page.keyboard.press('Escape');
  }
  await page.setViewportSize({width:1440,height:1000});await page.locator('.topbar [data-workspace=garage]').click();await page.screenshot({path:'/tmp/qa-014-dashboard.png'});
  await page.locator('.topbar [data-workspace=cars]').click();await page.locator('.source-classification').first().waitFor();await page.screenshot({path:'/tmp/qa-014-rare-cars.png'});
  const corrupt=await context.newPage();corrupt.on('pageerror',e=>errors.push(e.message));await corrupt.addInitScript(()=>{for(const key of ['fcc-colors','fcc-favorites','fcc-featured-color','fcc-tunes','fcc-drift-setups','fcc-drag-builds','fcc-drag-runs','fcc-drag-strips','ingenium-attempts','ingenium-benchmark-context'])localStorage.setItem(key,'{broken json');});await corrupt.goto(base+'/?tune=drag#tuning');await corrupt.locator('#drag-summary').filter({hasText:'Enter your build'}).waitFor();await corrupt.locator('#library-nav').click();assert.equal(await corrupt.locator('.card').count(),48);
  const restricted=await browser.newPage();restricted.on('pageerror',e=>errors.push(e.message));await restricted.addInitScript(()=>{Storage.prototype.getItem=()=>{throw new Error('Storage unavailable');};Storage.prototype.setItem=()=>{throw new Error('Storage unavailable');};});await restricted.goto(base);await restricted.locator('#featured-recipe').waitFor();await restricted.locator('#library-nav').click();assert.equal(await restricted.locator('.card').count(),48);
  assert.deepEqual(errors,[]);console.log('PASS: build identity, requested cleanup, all workspaces and calculators at 320/390/768/1024/1440px, modal sizing, corrupted data recovery and unavailable browser storage.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
