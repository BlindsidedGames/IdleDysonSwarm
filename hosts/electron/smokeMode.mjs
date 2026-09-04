const smokeTestArgument = '--smoke-test'
const suspendResumeSmokeArgument = '--suspend-resume-smoke'

export function selectElectronSmokeMode(argumentsList) {
  const suspendResumeSmoke = argumentsList.includes(
    suspendResumeSmokeArgument,
  )
  const closeSmoke = argumentsList.includes('--close-smoke')
  const overlaySmoke = argumentsList.includes('--overlay-smoke')
  return Object.freeze({
    smokeTest: overlaySmoke || closeSmoke || suspendResumeSmoke || argumentsList.includes(smokeTestArgument),
    suspendResumeSmoke,
    closeSmoke,
  })
}
