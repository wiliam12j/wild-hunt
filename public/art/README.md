# Your own art

Drop image files into this folder with the exact names below and the game uses them instead of
its built-in drawings. Anything you don't supply keeps the drawing, so you can replace one
symbol at a time. Reload the page to see changes (no restart or rebuild needed while `npm run
dev` is running; after publishing, push the files like any other change).

## Symbols: `public/art/symbols/`

| File | Symbol |
|---|---|
| `ten.png`, `j.png`, `q.png`, `k.png`, `a.png` | Card symbols 10, J, Q, K, A |
| `rabbit.png`, `pheasant.png`, `fox.png`, `stag.png` | Animal symbols |
| `hunter.png` | Hunter Wild |
| `lodge.png` | Hunting Lodge scatter (free spins) |
| `trophy-rabbit.png` | Rabbit trophy (small cash values) |
| `trophy-pheasant.png` | Pheasant trophy |
| `trophy-fox.png` | Fox trophy |
| `trophy-deer.png` | Deer trophy |
| `trophy-golden-stag.png` | Golden Stag trophy (the rare big one) |
| `trophy-mystery.png` | The "?" trophy seen while reels are still spinning |

- **Size:** 300 × 260 pixels (the tile shape, 15:13). Other sizes work: the image is scaled to
  fit inside the tile without stretching, centred, so a different shape just leaves a gap.
- **Format:** PNG with a transparent background looks best (the dark reel shows through).
- **Trophies:** the game writes the cash value on top, centred a little below the middle
  (about 45%–72% of the height). Keep that band fairly plain so the number stays readable.

## Background: `public/art/background.jpg`

- Fills the whole screen behind the reels. It is cropped to cover, never stretched, so keep
  the important part in the middle; the edges get cut off on phones.
- **Size:** 1920 × 1080 or larger, saved as JPG (keeps the download small). To use a PNG
  instead, change the name in `src/config/art.ts` to `background.png`.

## Changing names or adding more

The list of names lives in `src/config/art.ts`. Edit it there if you'd rather use different
file names or formats (for example `.webp`).

## Only use images you have the right to use

The game must not copy art, symbols or branding from existing slot games. Use your own
drawings, commissioned work, or images whose licence allows this.
