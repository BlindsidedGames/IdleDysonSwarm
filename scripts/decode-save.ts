import { readFileSync } from 'node:fs'
import { decodeIdb1Save, getSavePath } from '../src/save/decodeIdb1'

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: npm run decode-save -- /path/to/idle_dyson_swarm_save.txt')
  process.exitCode = 1
} else {
  const decoded = decodeIdb1Save(readFileSync(filePath, 'utf8'))
  const root = decoded.root
  const result = {
    compatible: true,
    schema: getSavePath(root, 'saveVersion'),
    dateStarted: getSavePath(root, 'dateStarted'),
    dateQuitString: getSavePath(root, 'dateQuitString'),
    money: getSavePath(
      root,
      'dysonVerseSaveData.dysonVerseInfinityData.money',
    ),
    infinityPoints: getSavePath(
      root,
      'dysonVerseSaveData.dysonVersePrestigeData.infinityPoints',
    ),
    rootType: decoded.rootType,
    compressedBytes: decoded.compressedBytes,
    binaryBytes: decoded.binaryBytes,
    completeStream: decoded.bytesRead === decoded.byteLength,
  }
  console.log(
    JSON.stringify(result, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value,
    ),
  )
}
