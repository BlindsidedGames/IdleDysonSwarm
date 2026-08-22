const smokeTestArgument = '--smoke-test'
const suspendResumeSmokeArgument = '--suspend-resume-smoke'

export function selectElectronSmokeMode(argumentsList) {
  const suspendResumeSmoke = argumentsList.includes(
    suspendResumeSmokeArgument,
  )
  return Object.freeze({
    smokeTest: suspendResumeSmoke || argumentsList.includes(smokeTestArgument),
    suspendResumeSmoke,
  })
}
