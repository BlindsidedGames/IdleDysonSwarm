export interface InlineImageSymbolProps {
  readonly src: string
  readonly label?: string
  readonly className?: string
  readonly symbol?: string
  readonly tint?: boolean
  readonly maskMode?: 'alpha' | 'luminance'
}

/**
 * Renders an image asset with text-like sizing and baseline alignment.
 *
 * Symbols are decorative by default because their surrounding text carries
 * the meaning. Pass a localized label only when the image conveys information
 * that is not otherwise present. Tintable monochrome symbols use their image
 * as a mask so they inherit the surrounding text color.
 */
export function InlineImageSymbol({
  src,
  label,
  className,
  symbol,
  tint = false,
  maskMode,
}: InlineImageSymbolProps) {
  const classes = [
    'ui-inline-image-symbol',
    tint ? 'ui-inline-image-symbol--tinted' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  if (tint) {
    return (
      <span
        className={classes}
        role={label === undefined ? undefined : 'img'}
        aria-label={label}
        aria-hidden={label === undefined ? 'true' : undefined}
        data-symbol={symbol}
        style={{
          maskImage: `url("${src}")`,
          maskMode,
          WebkitMaskImage: `url("${src}")`,
        }}
      />
    )
  }

  return (
    <img
      className={classes}
      src={src}
      alt={label ?? ''}
      aria-hidden={label === undefined ? 'true' : undefined}
      data-symbol={symbol}
      draggable="false"
    />
  )
}
