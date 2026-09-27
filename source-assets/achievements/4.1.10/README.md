# 4.1.10 achievement artwork

Editable masters are 512×512 SVGs. Export with:

```sh
node source-assets/achievements/4.1.10/export.mjs
```

Mobile receives 512×512 PNGs; Steam receives 256×256 earned and unearned PNGs.
The existing achievement palette is retained: lavender `#C9A5F5`, gray `#777777`,
and dark `#10101A`. Exports render at high density before downsampling.

Transcendent reuses the navigation Transcendence master. Enlightened reuses the
Enlightenment master. Challenge Accepted uses the established target/arrow
vocabulary; Breaking the Rules uses a cracked core. Galaxy Brain embeds the
original 2084px Galactic Paradigm Shift master as a mask (Git object
`cc21ca0ee`, `Assets/Sprites/SkillIcons/icons_Galactic Paradigm Shift.png`),
not a runtime thumbnail. No changes to the existing 27 achievement images.
