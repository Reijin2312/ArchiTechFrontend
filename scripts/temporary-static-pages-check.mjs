import { chromium } from 'playwright';
import fs from 'node:fs';
const browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
const pages=['rules','wiki','contacts','terms','privacy'];
fs.mkdirSync('/tmp/static-page-screenshots',{recursive:true});
let failed=false;
for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}});
  page.on('pageerror',err=>console.log('PAGE ERROR '+width+': '+err.message));
  page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER CONSOLE '+width+': '+msg.text())});
  for(const path of pages){
    await page.goto('http://127.0.0.1:5173/'+path,{waitUntil:'domcontentloaded'});
    await page.waitForTimeout(1700);
    const body=(await page.locator('body').innerText()).slice(0,250);
    const exists=await page.locator('.at-static-castle').count();
    const source=await page.locator('.at-static-castle').evaluate(el=>getComputedStyle(el,'::before').backgroundImage).catch(()=>null);
    const blank=body.length<30;
    console.log(width,path,{body:body.slice(0,100),castleRoot:exists,background:source?.includes('screen10-')??false});
    await page.screenshot({path:'/tmp/static-page-screenshots/'+path+'-'+width+'.png',fullPage:false});
    if(!exists||!source?.includes('screen10-')||blank)failed=true;
    if(path==='contacts'){
      const admin=await page.locator('text=Администрация и команда').count();
      const blue=await page.locator('.border-sky-500').count();
      console.log('CONTACTS team=',admin,'legacy sky=',blue);
      if(!admin||blue)failed=true;
    }
  }
  await page.close();
}
await browser.close();
if(failed)process.exit(1);
