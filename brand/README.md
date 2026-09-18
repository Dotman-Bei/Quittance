# Brand assets

| File | Use |
|---|---|
| `quittance-mark.svg` | Export master, scalable. Inter Black with a system fallback. |
| `quittance-mark-256.png` | Small avatars, README badges |
| `quittance-mark-512.png` | DoraHacks project logo, GitHub org avatar |
| `quittance-mark-1024.png` | Anything needing headroom |

**Volt Lime `#C4FF0D` on black.** Corner radius is 24/64 of the width — scale it with the mark, do
not use a fixed pixel radius.

Two other copies of this mark exist and are not generated from these files:

- [`apps/web/app/icon.svg`](../apps/web/app/icon.svg) — the favicon. Uses the system font stack
  rather than Inter, because an SVG favicon does not inherit the page's webfonts.
- [`apps/web/components/layout/Navbar.tsx`](../apps/web/components/layout/Navbar.tsx) — a styled
  `<span>`, not an image.

So the colour lives in three places. Changing it means changing all three.

## Regenerating

```bash
for sz in 256 512 1024; do
  rsvg-convert -w $sz -h $sz brand/quittance-mark.svg -o brand/quittance-mark-$sz.png
done
```

Needs Inter Black installed locally, otherwise the fallback font is used and the Q will not match
the navbar. The baseline is pinned at `y=46.3` rather than centred with `dominant-baseline`, which
rsvg and several other rasterisers ignore — measured, not guessed.
