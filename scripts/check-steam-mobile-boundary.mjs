import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
const roots=process.argv.slice(2)
if(roots.length===0)throw new Error('Pass mobile asset directories or unpacked mobile artifacts')
const mappings=JSON.parse(await readFile(new URL('../hosts/electron/steam/achievement-map.json',import.meta.url),'utf8'))
const prohibited=['4348570','ids_steam.node','libsteam_api','steam_api64.dll','HIGHEST_BOT_EXPONENT','SECRETE_OF_THE_UNIVERSE',...Object.values(mappings).filter(id=>id!=='DEV_OPTIONS')]
// Android's existing billing class uses DEV_OPTIONS for its canonical product.
// It is not evidence of the Steam achievement mapping; all other provider IDs
// plus the SDK and App ID remain prohibited.
let count=0
async function scan(directory){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const path=join(directory,entry.name)
  if(entry.isDirectory()){await scan(path);continue}
  if(!entry.isFile())throw new Error(`Unexpected non-file artifact entry: ${path}`)
  const bytes=await readFile(path);count++
  for(const needle of prohibited)if(path.includes(needle)||bytes.includes(Buffer.from(needle)))throw new Error(`Steam provider data leaked into ${path}: ${needle}`)
 }
}
for(const root of roots)await scan(root)
console.log(`Steam mobile boundary verified across ${count} files in ${roots.length} roots`)
