import { chromium } from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const cases=[['/', 'screen10'],['/about', 'screen2'],
  ['/about/seasons/1','screen6'],['/about/seasons/2','screen3'],
  ['/about/seasons/3','screen5'],['/about/seasons/4','screen10'],
  ['/contacts', null]];
const results=[];
fs.mkdirSync('/tmp/image-perf-check',{recursive:true});
try {
  for(const dpr of [1,2]) {
    const viewport={width:dpr===1?1440:390,height:900};
    const context=await browser.newContext({viewport,deviceScaleFactor:dpr});
    for(const [route,expected] of cases) {
      const page=await context.newPage();
      const apiErrors=[];
      page.on('pageerror',error=>apiErrors.push(error.message));
      const path='http://127.0.0.1:4173'+route;
      await page.goto(path,{waitUntil:'domcontentloaded',timeout:30000});
      if(expected) {
        await page.waitForFunction((route) => {
          const el=document.querySelector(route==='/'?'.at-gallery-frame img':
            route==='/about'?'.at-legacy-world img':'.at-legacy-detail-cover img');
          return !!el && el.complete && el.naturalWidth>0;
        },route,{timeout:20000});
      }
      const item=await page.evaluate((route)=>{
        const link=document.querySelector('link[rel="preload"][as="image"][imagesrcset]');
        const img=document.querySelector(route==='/'?'.at-gallery-frame img':
          route==='/about'?'.at-legacy-world img':'.at-legacy-detail-cover img');
        const photo=img?.currentSrc ?? null;
        const requests=performance.getEntriesByType('resource');
        return {preload:link?.getAttribute('imagesrcset')??null,
          preloadSize:link?.getAttribute('imagesizes')??null,
          priority:link?.getAttribute('fetchpriority')??null,
          photo,actualImageRequests:photo?requests.filter(x=>x.name===photo).length:0,
          preloadImageRequests:requests.filter(x=>/screen(10|2|3|5|6)-\d+\.avif/.test(x.name)).map(x=>x.name.split('/').pop()),
          background:!!document.querySelector('.at-world'),
          firstPhotoLoading:img?.loading??null,
          firstPhotoPriority:img?.fetchPriority??null};
      },route);
      if(expected) {
        if(!item.preload?.includes(expected+'-')||item.priority!=='high') throw Error('Missing route-specific preload '+route+' '+JSON.stringify(item));
        if(!item.photo?.includes(expected+'-')||!item.photo?.endsWith('.avif'))throw Error('Wrong hero image '+route+' '+JSON.stringify(item));
        if(item.actualImageRequests!==1)throw Error('Duplicate hero fetch '+route+' '+JSON.stringify(item));
        if(item.firstPhotoLoading!=='eager'||item.firstPhotoPriority!=='high')throw Error('Wrong visible image priority '+route+' '+JSON.stringify(item));
      } else if(item.preload) throw Error('Unexpected preload on contacts '+JSON.stringify(item));
      if(route==='/'&&item.background)throw Error('Redundant atmospheric layers remain');
      if(apiErrors.length)throw Error('Page JS errors on '+route+': '+apiErrors.slice(0,2).join(';'));
      if(route==='/'||route==='/about')await page.screenshot({path:'/tmp/image-perf-check/'+(route==='/'?'home':'about')+'-'+viewport.width+'.png'});
      results.push({dpr,route,...item});
      console.log('PASS',viewport.width,route,JSON.stringify(item));
      await page.close();
    }
    await context.close();
  }
} finally {await browser.close();}
fs.writeFileSync('/tmp/image-perf-check/results.json',JSON.stringify(results,null,2));
