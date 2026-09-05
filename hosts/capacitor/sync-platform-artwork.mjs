import { copyFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Apple artwork belongs only in the iOS app bundle.
if (process.env.CAPACITOR_PLATFORM_NAME === 'ios') {
  const destination = new URL('./ios/App/App/public/platform/', import.meta.url)
  await mkdir(destination, { recursive: true })
  await copyFile(
    new URL('./ios/artwork/game-center-white.svg', import.meta.url),
    new URL('game-center-white.svg', destination),
  )
  console.log(`Copied Game Center artwork to ${fileURLToPath(destination)}`)
}
