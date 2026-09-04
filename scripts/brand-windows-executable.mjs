import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { NtExecutable, NtExecutableResource, Resource, Data } from 'resedit'

/** Edit the unpacked unsigned Steam executable without requiring Wine. */
export async function brandWindowsExecutable(path, iconPath, version) {
  const executable = NtExecutable.from(await readFile(path), { ignoreCert: true })
  const resources = NtExecutableResource.from(executable)
  const icons = await Promise.all([16, 24, 32, 48, 64, 128, 256].map(async size =>
    Data.RawIconItem.from(await sharp(iconPath).resize(size, size).png().toBuffer(), size, size, 32),
  ))
  const groups = Resource.IconGroupEntry.fromEntries(resources.entries)
  for (const group of groups.length ? groups : [{ id: 1, lang: 1033 }]) {
    Resource.IconGroupEntry.replaceIconsForResource(resources.entries, group.id, group.lang, icons)
  }
  for (const info of Resource.VersionInfo.fromEntries(resources.entries)) {
    const [major, minor, patch] = version.split('.').map(Number)
    info.setFileVersion(major, minor, patch, 0, 1033)
    info.setProductVersion(major, minor, patch, 0, 1033)
    info.setStringValues({ lang: 1033, codepage: 1200 }, {
      CompanyName: 'Blindsided Games', FileDescription: 'Idle Dyson Swarm',
      ProductName: 'Idle Dyson Swarm', InternalName: 'Idle Dyson Swarm',
      OriginalFilename: 'Idle Dyson Swarm.exe',
    })
    info.outputToResourceEntries(resources.entries)
  }
  resources.outputResource(executable)
  await writeFile(path, Buffer.from(executable.generate()))
  const actual = NtExecutableResource.from(NtExecutable.from(await readFile(path)))
  const hash = bytes => createHash('sha256').update(Buffer.from(bytes)).digest('hex')
  const expected = icons.map(icon => hash(icon.bin)).sort()
  for (const group of Resource.IconGroupEntry.fromEntries(actual.entries)) {
    const found = group.getIconItemsFromEntries(actual.entries).map(icon => hash(icon.bin)).sort()
    if (JSON.stringify(found) !== JSON.stringify(expected)) throw new Error('Windows icon resource verification failed')
  }
}
