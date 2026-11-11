import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
const page = await browser.newPage({ viewport:{width:1440,height:900}, reducedMotion:'no-preference' });
try {
  await page.route('**/api/**', async route => {
    if (route.request().url().includes('/sessions/leaderboard')) {
      return route.fulfill({status:200, contentType:'application/json', body:JSON.stringify({
        range:'all',
        players:Array.from({length:7},(_,i)=>({
          rank:i+1,username:'TestPlayer'+i,totalMinutes:(700-i*70)*60,
          totalHours:700-i*70,activeDays:120-i*6,sessions:300-i*10
        }))
      })});
    }
    return route.fulfill({status:404, contentType:'application/json',body:'{}'});
  });
  await page.goto('http://127.0.0.1:5173/',{waitUntil:'domcontentloaded',timeout:30000});
  const row=page.locator('.at-ranking a.at-rank-row').first();
  try {
    await row.waitFor({timeout:15000});
  } catch (err) {
    console.log('DEBUG page URL',page.url(),'title',await page.title());
    console.log('DEBUG ranking count',await page.locator('.at-ranking').count(),
      'links',await page.locator('.at-ranking a').count(),
      'FAQ',await page.locator('.at-faq-trigger').count());
    console.log('DEBUG app content', (await page.locator('body').innerText()).slice(0,1800));
    throw err;
  }
  const readX = locator => locator.evaluate(el=>{
    const transform = getComputedStyle(el).transform;
    return transform==='none'?0:new DOMMatrixReadOnly(transform).m41;
  });
  await row.hover();
  await page.waitForTimeout(370);
  const rankX=await readX(row);
  if(rankX<5.5 || rankX>6.5) throw new Error('Leaderboard hover shift failed: '+rankX);
  const faq=page.locator('.at-faq-trigger').first();
  await faq.hover();
  await page.waitForTimeout(370);
  const before=await readX(faq.locator('.at-faq-question'));
  if(before<3.5)throw new Error('FAQ collapsed shift failed: '+before);
  await faq.click();
  await page.waitForTimeout(450);
  const expanded=await faq.getAttribute('aria-expanded');
  const after=await readX(faq.locator('.at-faq-question'));
  if(expanded!=='true' || after<3.5)throw new Error('FAQ jumped back on expand: expanded='+expanded+' shift='+after);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(90);
  await row.hover();
  await page.waitForTimeout(90);
  const reducedX=await readX(row);
  if(Math.abs(reducedX)>0.2)throw new Error('Reduced motion not respected: '+reducedX);
  console.log('PASS leaderboard shift=',rankX,'FAQ before/after=',before,after,'reduced=',reducedX);
} finally {await browser.close();}
