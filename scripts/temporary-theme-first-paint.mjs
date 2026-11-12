import { chromium } from 'playwright';
import fs from 'node:fs';
const routes=['/','/about','/rules','/contacts','/privacy','/auth/login'];
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
  for(const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    const context=await browser.newContext({viewport});
    for(const route of routes) {
      const page=await context.newPage();
      // Hold back the app bundle and stylesheet. Inspect exactly the paint shown before React starts.
      await page.route('**/assets/**', request=>request.abort());
      await page.goto('http://127.0.0.1:4173'+route,{waitUntil:'domcontentloaded',timeout:30000});
      const result=await page.evaluate(()=>{
        return {
          html:getComputedStyle(document.documentElement).backgroundColor,
          body:getComputedStyle(document.body).backgroundColor,
          theme:document.querySelector('meta[name="theme-color"]')?.getAttribute('content'),
          bodyClass:document.body.className,
          inlineStyle:!!document.querySelector('head style')
        }
      });
      if(result.html!=='rgb(23, 24, 22)'||result.body!=='rgb(23, 24, 22)'||result.theme!=='#171816'||result.bodyClass.includes('bg-slate-950')||!result.inlineStyle)
        throw new Error(route+' incorrect pre-React background '+JSON.stringify(result));
      console.log('PASS initial paint',viewport.width,route,JSON.stringify(result));
      await page.close();
    }
    await context.close();
  }
  const manifest=JSON.parse(fs.readFileSync('dist/manifest.webmanifest','utf8'));
  if(manifest.background_color!=='#171816'||manifest.theme_color!=='#171816')throw Error('PWA manifest uses wrong theme');
  console.log('PASS manifest',manifest.background_color);
} finally {await browser.close();}
