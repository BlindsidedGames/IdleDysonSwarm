import botsSymbolSrc from '../assets/nav-bots.png'
import infinitySymbolSrc from '../assets/nav-infinity.png'
import quantumShardsSymbolSrc from '../assets/quantum-shards.png'
import scienceSymbolSrc from '../assets/symbol-science.png'
import { InlineImageSymbol } from './InlineImageSymbol'

export function BotsSymbol() {
  return <InlineImageSymbol src={botsSymbolSrc} symbol="bots" />
}

export function ScienceSymbol({ tint = false }: { readonly tint?: boolean }) {
  return (
    <InlineImageSymbol
      src={scienceSymbolSrc}
      symbol="science"
      tint={tint}
    />
  )
}

export function InfinityPointSymbol() {
  return (
    <InlineImageSymbol
      src={infinitySymbolSrc}
      symbol="infinity-point"
      tint
    />
  )
}

export function QuantumShardSymbol() {
  return (
    <InlineImageSymbol
      src={quantumShardsSymbolSrc}
      symbol="quantum-shard"
      tint
    />
  )
}
