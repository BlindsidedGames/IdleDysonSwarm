const smokeTestArgument = '--smoke-test'
const suspendResumeSmokeArgument = '--suspend-resume-smoke'

export function selectElectronSmokeMode(argumentsList) {
  const suspendResumeSmoke = argumentsList.includes(
    suspendResumeSmokeArgument,
  )
  const closeSmoke = argumentsList.includes('--close-smoke')
  return Object.freeze({
    smokeTest: closeSmoke || suspendResumeSmoke || argumentsList.includes(smokeTestArgument),
    suspendResumeSmoke,
    closeSmoke,
  })
}
