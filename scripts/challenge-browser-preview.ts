import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { startDevelopmentServer, openChromiumPage, delay } from './performance/chromiumHarness'
import { importSaveThroughSettings } from './performance/browserFixtureImport'
const server=await startDevelopmentServer(process.cwd(),5198)
const page=await openChromiumPage({id:'challenge-pilot',width:1280,height:900,deviceScaleFactor:1,cpuThrottleRate:1},server.url).catch(async error=>{await server.stop();throw error})
const errors:string[]=[]
page.cdp.on<{exceptionDetails:{text:string}}>('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.text))
await page.cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]})
page.cdp.on<{requestId:string;request:{url:string}}>('Fetch.requestPaused',p=>{
 const local=p.request.url.startsWith('http://127.0.0.1:5198/')||p.request.url.startsWith('data:')||p.request.url.startsWith('blob:')
 void page.cdp.send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId:p.requestId}:{requestId:p.requestId,errorReason:'BlockedByClient'})
})
try{
 await page.navigate(server.url)
 await page.waitForSelector('.dyson-shell',30000)
 const saveText=readFileSync('output/challenges/preview-save.txt','utf8')
 await importSaveThroughSettings(page,{saveText,saveSha256:createHash('sha256').update(saveText).digest('hex')})
 await page.evaluate(`document.querySelector('[data-navigation-id="challenges"] .dyson-navigation__link')?.click()`)
 await page.waitForSelector('.challenges-surface',30000)
 await page.evaluate(`(()=>{const b=document.querySelector('.challenges-surface > .ui-collapsible-section > h2 > button[aria-expanded="false"]');b?.click()})()`)
 await delay(500)
 async function capture(name:string){
  const image=await page.cdp.send<{data:string}>('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
  writeFileSync('output/challenges/'+name+'.png',Buffer.from(image.data,'base64'))
 }
 await capture('desktop')
 const cards=await page.evaluate<string[]>(`[...document.querySelectorAll('.challenges-surface article')].map(x=>x.textContent??'')`)
 if(cards.length!==9)throw Error('Expected nine challenge cards, got '+cards.length)
 await page.cdp.send('Page.bringToFront')
 await page.cdp.send('Emulation.setFocusEmulationEnabled',{enabled:true})
 await page.evaluate(`document.querySelector('.challenges-surface article button')?.focus()`)
 await page.cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await page.cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13})
 await delay(200)
 const keyboardActivated=await page.evaluate<boolean>(`!!document.querySelector('.infinity-challenge-card__confirmation')`)
 if(!keyboardActivated)await page.evaluate(`document.querySelector('.challenges-surface article button')?.click()`)
 await delay(100);await capture('confirmation')
 await page.cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await page.cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9})
 const focus=await page.evaluate<string>(`document.activeElement?.outerHTML??''`)
 await page.evaluate(`(()=>{const b=[...document.querySelectorAll('.challenges-surface article button')].find(b=>b.textContent==='Confirm restart');b?.click()})()`)
 await delay(700)
 const active=await page.evaluate<string>(`document.querySelector('.challenges-surface')?.textContent??''`)
 if(!active.includes('Active ·')){await capture('entry-failure');writeFileSync('output/challenges/entry-failure.txt',active);throw Error('Challenge entry did not render active: '+active.slice(0,1000))}
 await page.cdp.send('Page.navigate',{url:server.url});await page.waitForSelector('.challenges-surface',30000)
 await page.evaluate(`document.querySelector('[data-navigation-id="challenges"] .dyson-navigation__link')?.click()`);await page.waitForSelector('.challenges-surface',30000)
 await page.evaluate(`document.querySelector('.challenges-surface > .ui-collapsible-section > h2 > button[aria-expanded="false"]')?.click()`);await delay(300)
 const restored=await page.evaluate<string>(`document.querySelector('.challenges-surface')?.textContent??''`)
 if(!restored.includes('Active ·'))throw Error('Active attempt lost after reload')
 await capture('active-reloaded')
 const scales=[]
 for(const scale of [0.8,1,1.3,1.5]){
  await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','${scale}');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`)
  await delay(100);await capture('desktop-scale-'+Math.round(scale*100))
  scales.push(await page.evaluate(`({scale:${scale},overflow:document.documentElement.scrollWidth>innerWidth,minimumHeight:Math.min(...[...document.querySelectorAll('.challenges-surface button')].map(b=>b.getBoundingClientRect().height)),minimumWidth:Math.min(...[...document.querySelectorAll('.challenges-surface button')].map(b=>b.getBoundingClientRect().width))})`))
 }
 await page.evaluate(`localStorage.setItem('idle-dyson-swarm:desktop-interface-scale','1');window.dispatchEvent(new Event('idle-dyson-swarm:desktop-interface-scale:changed'))`)
 await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true})
 await page.evaluate(`document.documentElement.style.setProperty('font-size','130%')`);await delay(300);await capture('mobile-text-130')
 const bounds=await page.evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,buttons:[...document.querySelectorAll('.challenges-surface button')].map(b=>({text:b.textContent,width:b.getBoundingClientRect().width,height:b.getBoundingClientRect().height}))})`)
 await page.evaluate(`document.querySelector('.challenges-surface article:last-child')?.scrollIntoView({block:'end'})`);await delay(100);await capture('mobile-last-card')
 writeFileSync('output/challenges/browser-results.json',JSON.stringify({environment:page.environment,cards,focus,keyboardActivated,entry:true,reload:true,scales,bounds,errors},null,2))
 console.log(JSON.stringify({entry:true,reload:true,scales,bounds,errors}))
}finally{await page.close();await server.stop()}
