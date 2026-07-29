/**
 * Renders a dependency-free fallback when composition or localization fails
 * before React can mount its top-level error boundary.
 */
export function renderStaticBootstrapFailure(
  root: HTMLElement,
): void {
  const main = document.createElement('main')
  main.className = 'startup-shell'
  const frame = document.createElement('div')
  frame.className = 'startup-shell__frame'
  const heading = document.createElement('h1')
  heading.textContent = 'Idle Dyson Swarm could not start'
  heading.tabIndex = -1
  const alert = document.createElement('p')
  alert.setAttribute('role', 'alert')
  alert.textContent =
    'Startup stopped without changing your saved progress. Reload this page when you are ready.'
  frame.append(heading, alert)
  main.append(frame)
  root.replaceChildren(main)
  heading.focus()
}
