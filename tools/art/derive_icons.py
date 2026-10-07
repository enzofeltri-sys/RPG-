"""Derives item icons that have no image yet from close existing ones, so
they stay in the same style as the rest of the set until the items step
redraws everything.

Usage: python3 tools/art/derive_icons.py   (writes into public/sprites/items/)

Only the metal (low-saturation) pixels are recolored; wood, leather and
outlines keep their colors.
"""

import colorsys
from pathlib import Path

from PIL import Image, ImageOps

ITEMS = Path(__file__).resolve().parents[2] / 'public/sprites/items'


def recolor(im: Image.Image, metal, wood=None) -> Image.Image:
    """metal/wood: functions (h, s, v) -> (h, s, v) for grey and brown pixels."""
    out = im.convert('RGBA').copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if v < 0.12:
                continue  # outline
            if s < 0.22:
                h, s, v = metal(h, s, v)
            elif wood and 0.02 < h < 0.14:
                h, s, v = wood(h, s, v)
            else:
                continue
            nr, ng, nb = colorsys.hsv_to_rgb(h, max(0, min(1, s)), max(0, min(1, v)))
            px[x, y] = (round(nr * 255), round(ng * 255), round(nb * 255), a)
    return out


def main() -> None:
    greatsword = Image.open(ITEMS / 'steel_greatsword.png')
    greataxe = Image.open(ITEMS / 'steel_greataxe.png')

    # Militia: dull, darker iron with a warm cast.
    recolor(greatsword, lambda h, s, v: (0.08, 0.10, v * 0.82)).save(ITEMS / 'militia_greatsword.png')
    # Woodcutter: the greataxe mirrored, raw iron, pale wood.
    recolor(
        ImageOps.mirror(greataxe),
        lambda h, s, v: (0.07, 0.08, v * 0.78),
        lambda h, s, v: (h + 0.01, s * 0.8, min(1, v * 1.25)),
    ).save(ITEMS / 'woodcutter_greataxe.png')
    # Mithril: bright blue-silver blade, as on the mithril sword.
    recolor(greatsword, lambda h, s, v: (0.58, 0.18, min(1, v * 1.12 + 0.06))).save(ITEMS / 'mithril_greatsword.png')
    print('ok')


if __name__ == '__main__':
    main()
