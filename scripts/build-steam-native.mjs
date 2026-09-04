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
const platform = process.env.IDS_STEAM_TARGET_PLATFORM ?? process.platform
const arch = process.env.IDS_STEAM_TARGET_ARCH ?? process.arch
const zig = process.env.IDS_ZIG
const output = resolve(process.env.IDS_STEAM_NATIVE_OUTPUT ?? 'hosts/electron/steam/runtime')
await mkdir(output,{recursive:true})
const source=resolve('hosts/electron/steam/native/addon.cc')
const target=join(output,'ids_steam.node')
const includes=[`-I${headers}`,`-I${join(sdk,'public')}`]
if(platform==='darwin' && process.platform==='darwin' && ['arm64','x64'].includes(arch)){
 const lib=join(sdk,'redistributable_bin/osx')
 execFileSync('clang++',['-arch',arch==='x64'?'x86_64':'arm64','-std=c++17','-shared','-undefined','dynamic_lookup',...includes,source,resolve('hosts/electron/steam/native/metal-presentation.mm'),'-fobjc-arc','-framework','Cocoa','-framework','Metal','-framework','MetalKit',`-L${lib}`,'-lsteam_api','-Wl,-rpath,@loader_path','-o',target],{stdio:'inherit'})
 await copyFile(join(lib,'libsteam_api.dylib'),join(output,'libsteam_api.dylib'))
}else if(platform==='linux'&&arch==='x64'){
 const lib=join(sdk,'redistributable_bin/linux64')
 execFileSync(zig ?? 'g++',[...(zig?['c++','-target','x86_64-linux-gnu.2.31']:[]),'-std=c++17','-shared','-fPIC',...includes,source,`-L${lib}`,'-lsteam_api','-Wl,-rpath,$ORIGIN','-o',target],{stdio:'inherit'})
 await copyFile(join(lib,'libsteam_api.so'),join(output,'libsteam_api.so'))
}else if(platform==='win32'&&arch==='x64'){
 const lib=join(sdk,'redistributable_bin/win64')
 if(zig) execFileSync(zig,['c++','-target','x86_64-windows-gnu','-std=c++17','-shared',...includes,source,join(lib,'steam_api64.lib'),'-o',target],{stdio:'inherit'})
 else execFileSync('cl.exe',['/std:c++17','/EHsc','/LD',`/I${headers}`,`/I${join(sdk,'public')}`,source,'/link',join(lib,'steam_api64.lib'),`/OUT:${target}`],{stdio:'inherit'})
 await copyFile(join(lib,'steam_api64.dll'),join(output,'steam_api64.dll'))
}else throw new Error(`Unsupported Steam native build target: ${platform}/${arch}`)
console.log(`Built Steamworks 1.65 Node-API addon for ${platform}/${arch}`)
