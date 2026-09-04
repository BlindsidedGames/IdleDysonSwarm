import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, mkdir, copyFile, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
const sdk = process.env.IDS_STEAM_SDK
const headers = process.env.IDS_NODE_HEADERS
if (!sdk || !headers) throw new Error('Set IDS_STEAM_SDK to official SDK 1.65/sdk and IDS_NODE_HEADERS to the Node include/node directory.')
const lock=JSON.parse(await readFile(new URL('../hosts/electron/steam/sdk-lock.json',import.meta.url),'utf8'))
for(const [path,expected] of Object.entries(lock.files)) {
 const bytes=await readFile(join(sdk,path))
 if(createHash('sha256').update(bytes).digest('hex')!==expected)throw new Error(`SDK ${lock.version} integrity mismatch: ${path}`)
}
await access(join(sdk,'public/steam/steam_api.h'))
await access(join(headers,'node_api.h'))
const output = resolve('hosts/electron/steam/runtime')
await mkdir(output,{recursive:true})
const source=resolve('hosts/electron/steam/native/addon.cc')
const target=join(output,'ids_steam.node')
const includes=[`-I${headers}`,`-I${join(sdk,'public')}`]
if(process.platform==='darwin'){
 const lib=join(sdk,'redistributable_bin/osx')
 execFileSync('clang++',['-std=c++17','-shared','-undefined','dynamic_lookup',...includes,source,`-L${lib}`,'-lsteam_api','-Wl,-rpath,@loader_path','-o',target],{stdio:'inherit'})
 await copyFile(join(lib,'libsteam_api.dylib'),join(output,'libsteam_api.dylib'))
}else if(process.platform==='linux'&&process.arch==='x64'){
 const lib=join(sdk,'redistributable_bin/linux64')
 execFileSync('g++',['-std=c++17','-shared','-fPIC',...includes,source,`-L${lib}`,'-lsteam_api','-Wl,-rpath,$ORIGIN','-o',target],{stdio:'inherit'})
 await copyFile(join(lib,'libsteam_api.so'),join(output,'libsteam_api.so'))
}else if(process.platform==='win32'&&process.arch==='x64'){
 const nodeLibrary=process.env.IDS_NODE_LIBRARY
 if(!nodeLibrary)throw new Error('Set IDS_NODE_LIBRARY to matching node.lib for Windows linking')
 const lib=join(sdk,'redistributable_bin/win64')
 execFileSync('cl.exe',['/std:c++17','/EHsc','/LD',`/I${headers}`,`/I${join(sdk,'public')}`,source,'/link',nodeLibrary,join(lib,'steam_api64.lib'),`/OUT:${target}`],{stdio:'inherit'})
 await copyFile(join(lib,'steam_api64.dll'),join(output,'steam_api64.dll'))
}else throw new Error(`Unsupported Steam native build target: ${process.platform}/${process.arch}`)
console.log(`Built Steamworks 1.65 Node-API addon for ${process.platform}/${process.arch}`)
