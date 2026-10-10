import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {startDevelopmentServer,openChromiumPage,delay} from './performance/chromiumHarness'
import {importSaveThroughSettings} from './performance/browserFixtureImport'
const output=process.env.NARROW_QA_OUTPUT??'output/narrow-before',port=5201
mkdirSync(output,{recursive:true})
const server=await startDevelopmentServer(process.cwd(),port)
const page=await openChromiumPage({id:'narrow-accessibility',width:1280,height:900,deviceScaleFactor:1,cpuThrottleRate:1},server.url).catch(async error=>{await server.stop();throw error})
let closing=false
const errors:string[]=[],results:unknown[]=[]
page.cdp.on<{exceptionDetails:{text:string}}>('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.text))
await page.cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]})
page.cdp.on<{requestId:string;request:{url:string}}>('Fetch.requestPaused',p=>{const local=p.request.url.startsWith(`http://127.0.0.1:${port}/`)||p.request.url.startsWith('data:')||p.request.url.startsWith('blob:');void page.cdp.send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId:p.requestId}:{requestId:p.requestId,errorReason:'BlockedByClient'}).catch(error=>{if(!closing)errors.push(String(error))})})
async function captureDrawer(locale:string){const result=await page.evaluate(`(()=>{const root=document.querySelector('.dyson-shell__side-panel');return {labels:[...root.querySelectorAll('.dyson-navigation__label')].map(e=>({text:e.textContent,width:e.getBoundingClientRect().width,scroll:e.scrollWidth,client:e.clientWidth})),overflow:root.scrollWidth>root.clientWidth}})()`);results.push({id:locale+'-drawer-labels',...result as object});if((result as {overflow:boolean}).overflow)throw Error(locale+': drawer has horizontal overflow');const png=await page.cdp.send<{data:string}>('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${output}/${locale}-drawer-settings.png`,Buffer.from(png.data,'base64'))}
async function inspect(id:string){
 const value=await page.evaluate(`(()=>{const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom}},nav=document.querySelector('.dyson-shell__bottom-navigation'),title=document.querySelector('.challenges-surface > section h2 .ui-collapsible-section__title'),body=document.querySelector('.challenges-surface p');const controls=[...nav.querySelectorAll('button')].filter(e=>e.checkVisibility()).map(e=>{const r=e.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;return {text:e.getAttribute('aria-label')||e.textContent,rect:rect(e),visible:r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth,hit:e.contains(document.elementFromPoint(x,y))}});return {viewport:{width:innerWidth,height:innerHeight},rootFont:getComputedStyle(document.documentElement).fontSize,textScale:getComputedStyle(document.documentElement).getPropertyValue('--game-text-scale'),bodyFont:getComputedStyle(body).fontSize,title:title&&{text:[...title.children].filter(e=>e.checkVisibility()).map(e=>e.textContent).join(''),accessibleName:document.querySelector('.challenges-surface>section>h2>button').getAttribute('aria-label'),font:getComputedStyle(title).fontSize,rect:rect(title)},nav:rect(nav),challengeTargets:[...document.querySelectorAll('.challenges-surface button')].filter(e=>e.checkVisibility()).map(e=>rect(e)),controls,footerInsideNavigation:document.querySelector('.dyson-shell__release-footer--compact').closest('.dyson-shell__bottom-navigation')===nav,footer:rect(document.querySelector('.dyson-shell__release-footer--compact')),overflow:document.documentElement.scrollWidth>innerWidth}})()`)
 results.push({id,...value as object})
 if(process.env.NARROW_QA_ASSERT==='1'){const v=value as {title:{text:string;accessibleName:string};footerInsideNavigation:boolean;footer:{y:number};challengeTargets:{width:number;height:number}[];controls:{visible:boolean;hit:boolean;rect:{width:number;height:number;bottom:number}}[];overflow:boolean};if(v.overflow||!v.title.accessibleName.includes(v.title.text)||!v.footerInsideNavigation||v.challengeTargets.some(c=>c.width<43.99||c.height<43.99)||v.controls.some(c=>!c.visible||!c.hit||c.rect.width<43.99||c.rect.height<43.99||c.rect.bottom>v.footer.y+1))throw Error('Navigation target reach failed: '+JSON.stringify(value))}
 const png=await page.cdp.send<{data:string}>('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${output}/${id}.png`,Buffer.from(png.data,'base64'))
}
try{
 await page.navigate(server.url);await page.waitForSelector('.dyson-shell',30000)
 const saveText=readFileSync('../ids-main-integration/output/challenge-localization-final/synthetic-save.txt','utf8');await importSaveThroughSettings(page,{saveText,saveSha256:createHash('sha256').update(saveText).digest('hex')})
 for(const locale of ['de','ru','ar-XB']){
  await page.evaluate(`document.documentElement.style.fontSize='100%';localStorage.setItem('idle-dyson-swarm.presentation-locale',${JSON.stringify(locale)})`)
  await page.cdp.send('Page.navigate',{url:server.url});await page.waitForSelector('.dyson-shell',30000)
  await page.evaluate(`document.querySelector('[data-navigation-id="challenges"] .dyson-navigation__link').click()`);await page.waitForSelector('.challenges-surface',30000)
  await page.evaluate(`document.querySelector('.challenges-surface > section > h2 > button[aria-expanded="false"]')?.click()`)
  await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true});await page.evaluate(`document.documentElement.style.fontSize='200%'`);await delay(500)
  await inspect(`${locale}-320-text200-top`)
  await page.evaluate(`document.querySelector('.challenges-surface article:last-child button').scrollIntoView({block:'end'})`);await delay(200);await inspect(`${locale}-320-text200-last`)
  results.push({id:`${locale}-last-hit`,value:await page.evaluate(`(()=>{const e=document.querySelector('.challenges-surface article:last-child button'),r=e.getBoundingClientRect();return {bottom:r.bottom,top:r.top,height:r.height,hit:e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}})()`)})
  if(process.env.NARROW_QA_ASSERT==='1'){
   const target=await page.evaluate<{x:number;y:number}>(`(()=>{const r=document.querySelector('.dyson-shell__bottom-menu').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}})()`);await page.cdp.send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...target});await page.cdp.send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...target});await delay(200)
   await page.evaluate(`document.querySelector('.dyson-shell__side-panel [data-navigation-id="settings"] button').scrollIntoView({block:'center'})`);await delay(100)
   await captureDrawer(locale)
   const reachable=await page.evaluate<boolean>(`(()=>{const e=document.querySelector('.dyson-shell__side-panel [data-navigation-id="settings"] button'),r=e.getBoundingClientRect();e.focus();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()`);if(!reachable)throw Error(locale+': drawer Settings unreachable');results.push({id:locale+'-drawer-settings-touch-keyboard',reachable})
   await page.cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await page.cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});await page.waitForSelector('.settings-surface',30000);if(await page.evaluate(`document.querySelector('.dyson-shell').dataset.menuOpen==='true'`))throw Error('Drawer did not close after keyboard navigation')
  }
  await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
  if(locale==='de'&&process.env.NARROW_QA_MATRIX==='1'){
   await page.evaluate(`document.documentElement.style.fontSize='100%';document.querySelector('[data-navigation-id="challenges"] .dyson-navigation__link').click()`);await page.waitForSelector('.challenges-surface',30000)
   for(const scale of [0.8,1,1.3,1.5]){await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','${scale}');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`);await delay(300);await inspect('de-interface-'+scale)}
   await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','1');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`)
   for(const [id,width,height,root,text] of [['mobile130',360,800,1.3,1],['compact200',320,568,2,1],['landscape130',800,360,1.3,1],['text-multiplier200',320,800,1,2]] as const){
    await page.cdp.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});await page.evaluate(`document.documentElement.style.fontSize='${root*100}%';document.documentElement.style.setProperty('--game-text-scale','${text}')`);await delay(300);await page.evaluate(`document.querySelector('.challenges-surface article:last-child button').scrollIntoView({block:'end'})`);await delay(100);await inspect('de-'+id)
   }
   await page.evaluate(`document.documentElement.style.setProperty('--game-text-scale','1');document.documentElement.style.fontSize='100%'`);await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
  }
 }
}finally{closing=true;writeFileSync(`${output}/results.json`,JSON.stringify({results,errors},null,2));await page.close();await server.stop()}
console.log(JSON.stringify({checks:results.length,errors}))
