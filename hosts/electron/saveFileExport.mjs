const exportFileName = /^idle-dyson-swarm-save(?:-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)?\.idsw$/u

export async function exportSaveFile(request, chooseDestination, writeText) {
  if (typeof request?.fileName !== 'string' ||
      exportFileName.exec(request.fileName)?.[0] !== request.fileName ||
      typeof request.text !== 'string' || request.text.length === 0 ||
      Buffer.byteLength(request.text, 'utf8') > 32 * 1024 * 1024) {
    throw new Error('Invalid save export request.')
  }
  const result = await chooseDestination({
    defaultPath: request.fileName,
    filters: [{ name: 'Idle Dyson Swarm Save', extensions: ['idsw'] }],
  })
  if (result.canceled || !result.filePath) return 'cancelled'
  await writeText(result.filePath, request.text)
  return 'saved'
}
