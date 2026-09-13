import { StableSingleLineText } from './StableSingleLineText'

/** All buttons use the widest label so a narrow purchase row has one type size. */
export function PurchaseQuantityLabel({
  label,
  referenceLabels,
}: {
  readonly label: string
  readonly referenceLabels: readonly string[]
}) {
  return (
    <StableSingleLineText
      minimumScale={0}
      measurement={(
        <span className="ui-purchase-quantity-label__measurement">
          {referenceLabels.map((reference) => <span key={reference}>{reference}</span>)}
        </span>
      )}
    >
      {label}
    </StableSingleLineText>
  )
}
