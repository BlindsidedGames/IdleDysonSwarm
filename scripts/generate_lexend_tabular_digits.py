#!/usr/bin/env python3
"""Generate deterministic digit-only tabular faces from bundled Lexend.

Requires FontTools 4.59.1. The source hashes intentionally fail closed so an
asset refresh cannot silently change the derived glyphs or their metrics.
"""

from __future__ import annotations

import argparse
import hashlib
import tempfile
from pathlib import Path

from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont


ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "src" / "ui" / "assets"
DIGIT_CODEPOINTS = tuple(range(ord("0"), ord("9") + 1))
FONTTOOLS_VERSION = "4.59.1"
FACES = (
    (
        "Regular",
        ASSET_ROOT / "Lexend-Regular.ttf",
        ASSET_ROOT / "IDS-LexendTabularDigits-Regular.ttf",
        "542046d84e641bfdcda744bd435010cb3ff9aa8c5428068ce64666de41fe6bf0",
        568,
    ),
    (
        "SemiBold",
        ASSET_ROOT / "Lexend-SemiBold.ttf",
        ASSET_ROOT / "IDS-LexendTabularDigits-SemiBold.ttf",
        "b7bbc0e77d85d03aea413a1b8ea571f9d82ca49994d9c62ba53e64fe7a755e05",
        606,
    ),
    (
        "Bold",
        ASSET_ROOT / "Lexend-Bold.ttf",
        ASSET_ROOT / "IDS-LexendTabularDigits-Bold.ttf",
        "1a688b4e45c9e941be394c9c7e5d2a6cc38b6704eb7cd571b83eaa302616833f",
        626,
    ),
)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def set_name(font: TTFont, name_id: int, value: str) -> None:
    for record in font["name"].names:
        if record.nameID == name_id:
            record.string = value.encode(record.getEncoding())


def derive(
    source: Path,
    destination: Path,
    style: str,
    tabular_advance: int,
) -> None:
    font = TTFont(source, recalcTimestamp=False)
    cmap = font.getBestCmap()
    glyphs = tuple(cmap[codepoint] for codepoint in DIGIT_CODEPOINTS)
    original_outlines = {
        glyph: font["glyf"][glyph].compile(font["glyf"])
        for glyph in glyphs
    }
    metrics = font["hmtx"].metrics
    widest_outline = max(
        font["glyf"][glyph].xMax - font["glyf"][glyph].xMin
        for glyph in glyphs
    )
    if tabular_advance < widest_outline:
        raise SystemExit(
            f"Tabular advance clips a digit outline: {style} "
            f"{tabular_advance} < {widest_outline}",
        )

    for glyph in glyphs:
        advance, left_side_bearing = metrics[glyph]
        # Keep the original outline untouched. Re-centre it in the approved
        # tabular cell so every digit has equal, deliberately compact spacing.
        metrics[glyph] = (
            tabular_advance,
            left_side_bearing + (tabular_advance - advance) // 2,
        )

    options = Options()
    options.hinting = True
    options.layout_features = []
    options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=DIGIT_CODEPOINTS)
    subsetter.subset(font)
    for glyph in glyphs:
        if font["glyf"][glyph].compile(font["glyf"]) != original_outlines[glyph]:
            raise SystemExit(f"Glyph outline changed unexpectedly: {style} {glyph}")
    if set(font.getBestCmap()) != set(DIGIT_CODEPOINTS):
        raise SystemExit(f"Derived face contains non-digit codepoints: {style}")

    family = "IDS Lexend Tabular Digits"
    set_name(font, 1, family)
    set_name(font, 2, style)
    set_name(font, 4, f"{family} {style}")
    set_name(font, 6, f"IDSLexendTabularDigits-{style}")
    set_name(font, 16, family)
    set_name(font, 17, style)
    font.recalcTimestamp = False
    font.save(destination, reorderTables=False)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--check",
        action="store_true",
        help="verify committed outputs byte-for-byte without replacing them",
    )
    args = parser.parse_args()

    import fontTools

    if fontTools.__version__ != FONTTOOLS_VERSION:
        raise SystemExit(
            f"FontTools {FONTTOOLS_VERSION} is required; found {fontTools.__version__}",
        )

    for style, source, destination, expected_source_hash, tabular_advance in FACES:
        actual_source_hash = sha256(source)
        if actual_source_hash != expected_source_hash:
            raise SystemExit(
                f"Unexpected source hash for {source.name}: {actual_source_hash}",
            )
        if args.check:
            with tempfile.TemporaryDirectory() as directory:
                generated = Path(directory) / destination.name
                derive(source, generated, style, tabular_advance)
                if not destination.exists() or generated.read_bytes() != destination.read_bytes():
                    raise SystemExit(f"Regenerate {destination.relative_to(ROOT)}")
        else:
            derive(source, destination, style, tabular_advance)
            print(
                destination.relative_to(ROOT),
                sha256(destination),
            )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
