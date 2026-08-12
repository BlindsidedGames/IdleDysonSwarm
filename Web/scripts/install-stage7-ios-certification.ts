import { cpSync, existsSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

if (process.env.IDS_STAGE7_CERTIFICATION !== 'true') {
  throw new Error('Refusing to install dormant certification assets without IDS_STAGE7_CERTIFICATION=true.')
}

const source = resolve('dist-stage7-native-certification/public')
const destination = resolve('hosts/capacitor/ios/App/App/public')
if (!existsSync(resolve(source, 'index.html'))) {
  throw new Error('Build the Stage 7 native certification package before installing it.')
}
rmSync(destination, { recursive: true, force: true })
cpSync(source, destination, { recursive: true, errorOnExist: false })
console.log('Installed internal Stage 7 certification assets into the iOS debug resource root.')
