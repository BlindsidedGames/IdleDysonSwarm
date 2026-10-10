import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {startDevelopmentServer,openChromiumPage,delay} from './performance/chromiumHarness'
import {importSaveThroughSettings} from './performance/browserFixtureImport'
const output='output/farming-readiness-ui',port=5202
mkdirSync(output,{recursive:true})
const server=await startDevelopmentServer(process.cwd(),port)
const page=await openChromiumPage({id:'farming-readiness',width:1280,height:900,deviceScaleFactor:1,cpuThrottleRate:1},server.url).catch(async error=>{await server.stop();throw error})
let closing=false
const errors:string[]=[],results:unknown[]=[]
page.cdp.on<{exceptionDetails:{text:string}}>('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.text))
await page.cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]})
page.cdp.on<{requestId:string;request:{url:string}}>('Fetch.requestPaused',p=>{const local=p.request.url.startsWith(`http://127.0.0.1:${port}/`)||p.request.url.startsWith('data:')||p.request.url.startsWith('blob:');void page.cdp.send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId:p.requestId}:{requestId:p.requestId,errorReason:'BlockedByClient'}).catch(error=>{if(!closing)errors.push(String(error))})})
async function screenshot(id:string){const png=await page.cdp.send<{data:string}>('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${output}/${id}.png`,Buffer.from(png.data,'base64'))}
async function reach(selector:string){await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({block:'center'})`);await delay(120);const result=await page.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)}),r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,hit:e.contains(document.elementFromPoint(x,y))}})()`);results.push({selector,...result as object});if(!(result as {hit:boolean}).hit)throw Error('Unreachable '+selector)}
async function inspect(id:string){const result=await page.evaluate(`(()=>{const root=document.querySelector('.farming-surface');return {phase:root.dataset.farmingPhase,viewport:{width:innerWidth,height:innerHeight},scroll:{width:root.querySelector('.civilization-scroll').clientWidth,height:root.querySelector('.civilization-scroll').clientHeight},overflow:document.documentElement.scrollWidth>innerWidth,clipped:[...root.querySelectorAll('button,strong,p,dd,.civilization-start-cost,.civilization-output')].filter(e=>e.checkVisibility()&&e.scrollWidth>e.clientWidth+1).map(e=>e.textContent),bodyFont:getComputedStyle(root.querySelector('p')||root).fontSize,rows:[...root.querySelectorAll('[data-activity-id]')].map(e=>({id:e.dataset.activityId,text:e.textContent})),controls:[...root.querySelectorAll('button,.farming-upgrade-details>summary')].filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent,width:r.width,height:r.height}})}})()`);results.push({id,...result as object});const r=result as {overflow:boolean;clipped:string[];controls:{width:number;height:number}[]};await screenshot(id);if(r.overflow||r.clipped.length||r.controls.some(c=>c.width<43.99||c.height<43.99))throw Error('Farming layout '+JSON.stringify(result))}
try{
 await page.navigate(server.url);await page.waitForSelector('.dyson-shell',30000)
 for(const checkpoint of (process.env.FARMING_READINESS_CHECKPOINTS?.split(',')??['paid-intensiveCultivation','paid-guildWorkshop','paid-townMarket','upgrades-complete','ready-to-finish','complete'])){
  await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await page.evaluate(`document.documentElement.style.fontSize='100%';localStorage.setItem('idle-dyson-swarm.presentation-locale','en');localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','1')`);await page.cdp.send('Page.navigate',{url:server.url});await page.waitForSelector('.dyson-shell',30000)
  const saveText=readFileSync(`output/farming-readiness/${checkpoint}.txt`,'utf8');await importSaveThroughSettings(page,{saveText,saveSha256:createHash('sha256').update(saveText).digest('hex')})
  await page.evaluate(`document.querySelector('[data-navigation-id="simulations"] .dyson-navigation__link').click()`);await page.waitForSelector('.farming-surface',30000);await delay(100)
  const selector=checkpoint.startsWith('paid-')?`[data-activity-id="${checkpoint.slice(5)}"] summary`:checkpoint==='complete'?'.civilization-preview p:last-of-type':'.farming-upgrade-details:last-child summary'
  const finalSelector=checkpoint.startsWith('paid-')?selector:checkpoint==='complete'?selector:'.farming-constructed li:last-child summary'
  await reach(finalSelector);if(checkpoint!=='complete'){await page.evaluate(`document.querySelector(${JSON.stringify(finalSelector)}).click()`);await delay(100)}
  await inspect(`${checkpoint}-en-desktop`)
  if(checkpoint==='ready-to-finish'){
   await reach('.civilization-preview button');const enabled=await page.evaluate(`!document.querySelector('.civilization-preview button').disabled`);if(!enabled)throw Error('Ready village cannot finish');results.push({id:'extended-endpoint-action',enabled})
  }
  for(const locale of (process.env.FARMING_READINESS_LOCALES?.split(',')??['de','ar-XB'])){
   await page.evaluate(`localStorage.setItem('idle-dyson-swarm.presentation-locale',${JSON.stringify(locale)})`);await page.cdp.send('Page.navigate',{url:server.url});await page.waitForSelector('.dyson-shell',30000);await page.evaluate(`document.querySelector('[data-navigation-id="simulations"] .dyson-navigation__link').click()`);await page.waitForSelector('.farming-surface',30000)
   await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await page.evaluate(`document.documentElement.style.fontSize='130%'`);await delay(300)
   await reach(finalSelector);if(checkpoint!=='complete')await page.evaluate(`document.querySelector(${JSON.stringify(finalSelector)}).click()`);await inspect(`${checkpoint}-${locale}-mobile`)
   if(['paid-townMarket','ready-to-finish','complete'].includes(checkpoint)){
    await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true});await page.evaluate(`document.documentElement.style.fontSize='200%'`);await delay(300);await reach(checkpoint==='ready-to-finish'?'.civilization-preview button':finalSelector);await inspect(`${checkpoint}-${locale}-320-text200`)
   }
   await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});await page.evaluate(`document.documentElement.style.fontSize='100%'`)
  }
  console.log('Verified '+checkpoint)
 }
 if(errors.length)throw Error(errors.join('; '))
}finally{closing=true;writeFileSync(`${output}/results.json`,JSON.stringify({results,errors,limits:['Disposable synthetic Chromium only; native, fluent-speaker review and screen-reader delivery unverified.']},null,2));await page.close();await server.stop()}
console.log(JSON.stringify({checks:results.length,errors}))
