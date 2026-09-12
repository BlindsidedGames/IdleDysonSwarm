#!/usr/bin/env python3
"""Losslessly package the authored Lexend TTFs as deterministic WOFF2 assets.

Keep source TTFs for the tabular-digit generator. No glyph subsetting, outline
transforms, metrics, hinting or layout changes are permitted by this generator.
Requires FontTools 4.59.1 and Brotli 1.2.0.
"""
from __future__ import annotations

import argparse
import tempfile
from pathlib import Path

import brotli
import fontTools
from fontTools.ttLib import TTFont
from fontTools.ttLib.woff2 import WOFF2FlavorData
from generate_lexend_tabular_digits import ASSET_ROOT, FACES, FONTTOOLS_VERSION, sha256


def verify_tables(source: Path, packaged: Path) -> None:
    with TTFont(source, recalcBBoxes=False, recalcTimestamp=False) as original, \
         TTFont(packaged, recalcBBoxes=False, recalcTimestamp=False) as decoded:
        if set(original.keys()) != set(decoded.keys()):
            raise SystemExit(f"Font tables changed: {source.name}")
        for tag in original.keys():
            if tag == "GlyphOrder":
                continue
            before = bytearray(original.getTableData(tag))
            after = bytearray(decoded.getTableData(tag))
            if tag == "head":
                # Container checksums differ; WOFF2 marks lossless compression
                # using bit 11 of head.flags. All remaining bytes must match.
                before[8:12] = after[8:12] = bytes(4)
                flags = int.from_bytes(before[16:18], "big")
                if int.from_bytes(after[16:18], "big") != flags | (1 << 11):
                    raise SystemExit(f"Unexpected WOFF2 flags: {source.name}")
                after[16:18] = before[16:18]
            if before != after:
                raise SystemExit(f"Font table {tag} changed: {source.name}")


def package(source: Path, output: Path) -> None:
    with TTFont(source, recalcBBoxes=False, recalcTimestamp=False) as font:
        font.flavor = "woff2"
        # Disable optional glyf/loca transforms to preserve exact table bytes.
        font.flavorData = WOFF2FlavorData(transformedTables=set())
        font.save(output, reorderTables=False)
    verify_tables(source, output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if fontTools.__version__ != FONTTOOLS_VERSION or brotli.__version__ != "1.2.0":
        raise SystemExit("Requires FontTools 4.59.1 and Brotli 1.2.0")
    with tempfile.TemporaryDirectory() as temporary:
        for style, source, _, source_hash, _ in FACES:
            if sha256(source) != source_hash:
                raise SystemExit(f"Authored source hash changed: {source.name}")
            destination = ASSET_ROOT / f"Lexend-{style}.woff2"
            generated = Path(temporary) / destination.name
            package(source, generated)
            if args.check:
                if not destination.exists() or generated.read_bytes() != destination.read_bytes():
                    raise SystemExit(f"Stale WOFF2 asset: {destination.name}")
            else:
                destination.write_bytes(generated.read_bytes())
            print(f"{destination.name}: {source.stat().st_size} -> {destination.stat().st_size} bytes; tables unchanged")


if __name__ == "__main__":
    main()
