import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { loadSteamClient, until } from '../hosts/electron/steam/client.mjs'
const schema=JSON.parse(await readFile(new URL('../hosts/electron/steam/itemdefs.json',import.meta.url),'utf8'))
const products=['ids.tiptier1','ids.tiptier2','ids.tiptier3','ids.devoptions','ids.doubleip']
const prices=[149,699,3099,1599,499]
if(schema.appid!==4348570||schema.items.length!==5)throw new Error('Unexpected Steam catalog')
schema.items.forEach((item,index)=>{
 if(item.itemdefid!==1001+index||item.ids_product_id!==products[index]||item.price!==`1;AUD${prices[index]}`||item.type!=='item'||item.tradable!==false||item.marketable!==false)throw new Error('Invalid catalog definition')
 if(index<3 ? item.auto_stack!==true||item.purchase_limit!==undefined : item.purchase_limit!==1)throw new Error('Invalid purchase behavior')
})
if(process.argv.includes('--local-only')) { console.log('Validated all five local ItemDefs and AUD prices');process.exit(0) }
const mode=process.argv[2]
if(!['--before-upload','--after-upload'].includes(mode))throw new Error('Use --local-only, --before-upload or --after-upload')
const client=loadSteamClient({distribution:'steam',runtimeDirectory:fileURLToPath(new URL('../hosts/electron/steam/runtime/',import.meta.url))})
if(!client)throw new Error('A signed-in Steam desktop client is required. No catalog changes were made.')
try {
 const native=client.native
 native.loadDefinitions()
 await until(()=>native.definitionsReady(),Boolean,15000)
 const existing=native.definitions()
 if(mode==='--before-upload') {
  if(existing.length)throw new Error(`Existing definitions require reconciliation before uploading: ${existing.join(',')}`)
  console.log('Definition-ready callback received; catalog empty; reserved IDs 1001–1005 are unused.')
 } else {
  for(const item of schema.items) {
   if(!existing.includes(item.itemdefid))throw new Error(`Missing ItemDef ${item.itemdefid}`)
   for(const key of ['name','type','price','ids_product_id','tradable','marketable',...(item.auto_stack?['auto_stack']:['purchase_limit'])]) {
    const actual=native.definitionProperty(item.itemdefid,key)
    const expected=item[key]
    const matches=typeof expected==='boolean' ? ['1','true'].includes(actual.toLowerCase())===expected && ['0','1','true','false'].includes(actual.toLowerCase()) : actual===String(expected)
    if(!matches)throw new Error(`Provider mismatch for ${item.itemdefid}.${key}: ${actual}`)
   }
  }
  console.log('All five provider definitions match. Application mappings may now be enabled.')
 }
} finally { client.close() }
