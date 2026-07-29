import './dysonSwarmVisual.css'

/**
 * Decorative counterpart to the Unity sun and orbiting panel field.
 * It consumes no time and owns no gameplay state.
 */
export function DysonSwarmVisual() {
  return (
    <div className="dyson-swarm-visual" aria-hidden="true">
      <div className="dyson-swarm-visual__orbit dyson-swarm-visual__orbit--outer">
        <i />
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="dyson-swarm-visual__orbit dyson-swarm-visual__orbit--inner">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="dyson-swarm-visual__sun" />
    </div>
  )
}
