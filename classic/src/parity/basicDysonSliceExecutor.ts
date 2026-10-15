import type { ParityExecutor } from './fixture'
import {
  createBasicDysonSliceEngine,
  type BasicDysonSliceDefinitionOptions,
  type BasicDysonSliceState,
} from '../simulation/basicDysonSliceEngine'

export class BasicDysonSliceParityExecutor
  implements ParityExecutor<BasicDysonSliceState, never>
{
  private readonly options: BasicDysonSliceDefinitionOptions

  constructor(options: BasicDysonSliceDefinitionOptions = {}) {
    this.options = options
  }

  run(
    initialState: BasicDysonSliceState,
    commands: readonly never[],
    elapsedMilliseconds: number,
  ): BasicDysonSliceState {
    if (commands.length !== 0) {
      throw new Error(
        'Basic Dyson slice fixtures do not yet support commands.',
      )
    }
    const engine = createBasicDysonSliceEngine(
      initialState,
      this.options,
    )
    const result = engine.advanceBy(elapsedMilliseconds)
    if (!result.accepted) {
      throw new Error(`${result.code}: ${result.reason}`)
    }
    return structuredClone(
      engine.snapshot().state,
    ) as BasicDysonSliceState
  }
}
