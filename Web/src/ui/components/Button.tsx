import type {
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'
import './components.css'

export type ButtonVisualState =
  | 'idle'
  | 'pending'
  | 'success'
  | 'failure'

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  readonly children: ReactNode
  readonly variant?: 'primary' | 'secondary' | 'danger'
  readonly state?: ButtonVisualState
  readonly fullWidth?: boolean
}

export function Button({
  children,
  variant = 'secondary',
  state = 'idle',
  fullWidth = false,
  className,
  disabled,
  type = 'button',
  ...buttonProps
}: ButtonProps) {
  const classes = [
    'ui-button',
    `ui-button--${variant}`,
    fullWidth ? 'ui-button--full-width' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')
  const pending = state === 'pending'

  return (
    <button
      {...buttonProps}
      type={type}
      className={classes}
      data-state={state}
      aria-busy={pending || undefined}
      disabled={disabled || pending}
    >
      {children}
    </button>
  )
}
