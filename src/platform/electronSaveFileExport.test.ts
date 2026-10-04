import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test, vi } from 'vitest'
// @ts-expect-error The host runs directly as JavaScript.
import { exportSaveFile } from '../../hosts/electron/saveFileExport.mjs'

test.each(['idle-dyson-swarm-save.idsw', 'idle-dyson-swarm-save-2026-10-04T12-00-00-000Z.idsw'])('desktop export saves the exact payload using %s', async fileName => {
  const directory = await mkdtemp(join(tmpdir(), 'ids-export-test-'))
  try {
    const destination = join(directory, fileName)
    const choose = vi.fn(async (_options: unknown) => ({canceled: false, filePath: destination}))
    const text = 'IDSWEB1:café\nunchanged-payload'
    expect(await exportSaveFile({fileName, text}, choose, writeFile)).toBe('saved')
    expect(choose.mock.calls[0][0]).toEqual({defaultPath: fileName, filters: [{name: 'Idle Dyson Swarm Save', extensions: ['idsw']}]})
    expect(await readFile(destination, 'utf8')).toBe(text)
  } finally { await rm(directory, {recursive: true, force: true}) }
})

test.each(['../idle-dyson-swarm-save.idsw', 'idle-dyson-swarm-save.idsw\n', 'save.exe', 'idle-dyson-swarm-save-random.idsw'])('desktop rejects unsafe filename %j before opening a picker', async fileName => {
  const choose = vi.fn()
  await expect(exportSaveFile({fileName, text: 'valid-payload'}, choose, vi.fn())).rejects.toThrow('Invalid save export request')
  expect(choose).not.toHaveBeenCalled()
})

test('desktop cancellation never writes; completion waits for the destination write', async () => {
  const request = {fileName: 'idle-dyson-swarm-save.idsw', text: 'captured-save'}
  const write = vi.fn()
  expect(await exportSaveFile(request, async () => ({canceled: true}), write)).toBe('cancelled')
  expect(write).not.toHaveBeenCalled()
  let finish!: () => void
  let settled = false
  const pending = exportSaveFile(request, async () => ({canceled: false, filePath: '/chosen/save.idsw'}), () => new Promise<void>(resolve => {finish = resolve})).then((value: string) => {settled = true; return value})
  await Promise.resolve()
  expect(settled).toBe(false)
  finish()
  expect(await pending).toBe('saved')
  await expect(exportSaveFile(request, async () => ({canceled: false, filePath: '/chosen/save.idsw'}), async () => {throw new Error('disk full')})).rejects.toThrow('disk full')
})
