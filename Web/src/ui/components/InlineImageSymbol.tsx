export interface InlineImageSymbolProps {
  readonly src: string
  readonly label?: string
  readonly className?: string
  readonly symbol?: string
}

/**
 * Renders an image asset with text-like sizing and baseline alignment.
 *
 * Symbols are decorative by default because their surrounding text carries
 * the meaning. Pass a localized label only when the image conveys information
 * that is not otherwise present.
 */
export function InlineImageSymbol({
  src,
  label,
  className,
  symbol,
}: InlineImageSymbolProps) {
  return (
    <img
      className={['ui-inline-image-symbol', className ?? '']
        .filter(Boolean)
        .join(' ')}
      src={src}
      alt={label ?? ''}
      aria-hidden={label === undefined ? 'true' : undefined}
      data-symbol={symbol}
      draggable="false"
    />
  )
}
