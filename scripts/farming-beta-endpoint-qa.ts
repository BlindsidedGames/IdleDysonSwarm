import {createHash} from 'node:crypto'
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {startDevelopmentServer,openChromiumPage,delay} from './performance/chromiumHarness'
import {importSaveThroughSettings} from './performance/browserFixtureImport'

// Requires an isolated, domain-generated completed Farming save in the output folder.
const output=process.env.FARMING_ENDPOINT_OUTPUT??'output/farming-endpoint',port=5200
mkdirSync(output,{recursive:true})
const server=await startDevelopmentServer(process.cwd(),port)
const page=await openChromiumPage({id:'farming-endpoint',width:1280,height:900,deviceScaleFactor:1,cpuThrottleRate:1},server.url).catch(async error=>{await server.stop();throw error})
const errors:string[]=[],results:unknown[]=[],captures:string[]=[]
page.cdp.on<{exceptionDetails:{text:string}}>('Runtime.exceptionThrown',p=>errors.push(p.exceptionDetails.text))
await page.cdp.send('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]})
page.cdp.on<{requestId:string;request:{url:string}}>('Fetch.requestPaused',p=>{
 const local=p.request.url.startsWith(`http://127.0.0.1:${port}/`)||p.request.url.startsWith('data:')||p.request.url.startsWith('blob:')
 void page.cdp.send(local?'Fetch.continueRequest':'Fetch.failRequest',local?{requestId:p.requestId}:{requestId:p.requestId,errorReason:'BlockedByClient'})
})
async function inspect(id:string){
 const value=await page.evaluate<{overflow:boolean;clipped:string[];phase:string;actions:number;settingsHeight:number;endpoint:string}>(`(()=>{const root=document.querySelector('.farming-surface'),preview=root.querySelector('.civilization-preview'),settings=root.querySelector('.ui-progress-controls-panel__settings'),paragraphs=[...preview.querySelectorAll('p,h3')];return {phase:root.dataset.farmingPhase,overflow:document.documentElement.scrollWidth>innerWidth,clipped:paragraphs.filter(p=>p.scrollWidth>p.clientWidth+1).map(p=>p.textContent),actions:root.querySelectorAll('.civilization-scroll button').length,settingsHeight:settings.getBoundingClientRect().height,endpoint:preview.querySelectorAll('p')[1]?.textContent}})()`)
 results.push({id,...value});if(value.phase!=='complete'||value.overflow||value.clipped.length||value.actions||value.settingsHeight<43.99||!value.endpoint)throw Error(JSON.stringify(value))
 const png=await page.cdp.send<{data:string}>('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(`${output}/${id}.png`,Buffer.from(png.data,'base64'));captures.push(`${id}.png`)
}
try{
 await page.navigate(server.url);await page.waitForSelector('.dyson-shell',30000)
 const saveText=readFileSync(`${output}/synthetic-save.txt`,'utf8')
 await importSaveThroughSettings(page,{saveText,saveSha256:createHash('sha256').update(saveText).digest('hex')})
 for(const locale of (process.env.FARMING_ENDPOINT_LOCALES?.split(',')??['en','fr','de','es-419','pt-BR','ru','ja','zh-CN','en-XA','ar-XB'])){
  await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false})
  await page.evaluate(`document.documentElement.style.fontSize='100%';localStorage.setItem('idle-dyson-swarm.presentation-locale',${JSON.stringify(locale)})`)
  await page.cdp.send('Page.navigate',{url:server.url});await page.waitForSelector('.dyson-shell',30000)
  await page.evaluate(`document.querySelector('[data-navigation-id="simulations"] .dyson-navigation__link')?.click()`);await page.waitForSelector('.farming-surface',30000);await delay(200)
  await inspect(`${locale}-desktop`)
  await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:360,height:800,deviceScaleFactor:1,mobile:true});await page.evaluate(`document.documentElement.style.fontSize='130%'`);await delay(500);await inspect(`${locale}-mobile`)
  if(['de','ar-XB'].includes(locale)){
   await page.cdp.send('Emulation.setDeviceMetricsOverride',{width:320,height:800,deviceScaleFactor:1,mobile:true});await page.evaluate(`document.documentElement.style.fontSize='200%'`);await delay(500);await inspect(`${locale}-narrow`)
   for(const position of ['start','end']){
    await page.evaluate(`document.querySelector('.civilization-preview p:last-of-type').scrollIntoView({block:${JSON.stringify(position)}})`);await delay(200)
    const visible=await page.evaluate<boolean>(`(()=>{const p=document.querySelector('.civilization-preview p:last-of-type'),r=p.getBoundingClientRect(),s=document.querySelector('.civilization-scroll').getBoundingClientRect(),top=Math.max(r.top,s.top),bottom=Math.min(r.bottom,s.bottom);return bottom-top>10&&p.contains(document.elementFromPoint(r.left+r.width/2,(top+bottom)/2))})()`)
    if(!visible)throw Error(`${locale}: endpoint ${position} occluded`)
    await inspect(`${locale}-narrow-endpoint-${position}`)
   }
  }
 }
 if(errors.length)throw Error(errors.join('; '))
}finally{
 writeFileSync(`${output}/results.json`,JSON.stringify({environment:page.environment,results,captures,errors,limits:['Browser emulation only; native hosts and fluent-speaker review unverified.','Reward placement and one-way migration are separate release blockers.']},null,2))
 await page.close();await server.stop()
}
console.log(JSON.stringify({checks:results.length,captures:captures.length,errors}))
