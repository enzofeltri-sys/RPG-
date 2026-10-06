"""Render the in-house art set to PNG.

Usage: python3 tools/art/build.py <out_dir>

Writes <out_dir>/1x/*.png (native pixels), <out_dir>/2x/*.png (the size the
game displays them at), plus preview.png (every sprite enlarged) and
mockup.png (a fake in-game screen at the game's 216x384 resolution).
"""

import random
import sys
from pathlib import Path

from PIL import Image

import sprites
from blob import ascii_to_grid, grid_to_image

GAME_SCALE = 2


def up(img: Image.Image, k: int) -> Image.Image:
    return img.resize((img.width * k, img.height * k), Image.NEAREST)


def grass_field(tiles_w: int, tiles_h: int, seed: int = 7) -> Image.Image:
    variants = [
        (grid_to_image(ascii_to_grid(sprites.GRASS_PLAIN)), 70),
        (grid_to_image(ascii_to_grid(sprites.GRASS_TUFTS)), 22),
        (grid_to_image(ascii_to_grid(sprites.GRASS_FLOWERS)), 8),
    ]
    rng = random.Random(seed)
    img = Image.new('RGBA', (tiles_w * 16, tiles_h * 16))
    pool = [v for v, weight in variants for _ in range(weight)]
    for ty in range(tiles_h):
        for tx in range(tiles_w):
            tile = rng.choice(pool)
            if rng.random() < 0.5:
                tile = tile.transpose(Image.FLIP_LEFT_RIGHT)
            img.paste(tile, (tx * 16, ty * 16))
    return img


def build_all() -> dict[str, Image.Image]:
    out: dict[str, Image.Image] = {}
    out['ground_grass'] = grass_field(8, 8)
    out['tree'] = grid_to_image(sprites.tree())
    out['bush'] = grid_to_image(sprites.bush())
    out['rock'] = grid_to_image(sprites.rock())
    for direction, frames in sprites.hero_frames().items():
        for i, f in enumerate(frames):
            out[f'hero_{direction}_{i}'] = grid_to_image(f)
    for i, f in enumerate(sprites.SLIME_FRAMES):
        out[f'slime_{i}'] = grid_to_image(ascii_to_grid(f))
    out['potion'] = grid_to_image(ascii_to_grid(sprites.POTION))
    out['chest'] = grid_to_image(ascii_to_grid(sprites.CHEST))
    return out


def preview(images: dict[str, Image.Image], k: int = 6) -> Image.Image:
    items = [(n, im) for n, im in images.items() if n != 'ground_grass']
    cell = 32 * k + 8
    cols = 6
    rows = (len(items) + cols - 1) // cols
    sheet = Image.new('RGBA', (cols * cell, rows * cell), (40, 44, 52, 255))
    bg = up(grass_field(2, 2), k)
    for i, (_, im) in enumerate(items):
        x, y = (i % cols) * cell + 4, (i // cols) * cell + 4
        sheet.paste(bg, (x, y))
        big = up(im, k)
        sheet.alpha_composite(big, (x + (32 * k - big.width) // 2, y + (32 * k - big.height) // 2))
    return sheet


def mockup(images: dict[str, Image.Image]) -> Image.Image:
    w, h = 216, 384
    s = GAME_SCALE
    screen = Image.new('RGBA', (w, h))
    field = up(images['ground_grass'], s)
    for y in range(0, h, field.height):
        for x in range(0, w, field.width):
            screen.paste(field, (x, y))

    placed: list[tuple[str, int, int]] = [
        ('tree', 30, 40), ('tree', 170, 30), ('tree', 110, 95), ('tree', 20, 230),
        ('tree', 185, 250), ('tree', 80, 330), ('tree', 160, 360),
        ('bush', 70, 60), ('bush', 140, 150), ('bush', 40, 175), ('bush', 175, 190),
        ('bush', 120, 300),
        ('rock', 190, 120), ('rock', 60, 270), ('rock', 135, 240),
        ('chest', 160, 300),
        ('potion', 95, 205),
        ('slime_0', 150, 210),
        ('hero_down_1', 100, 175),
    ]
    # Y-sort by the sprite's bottom edge, like the game's depth sort.
    def bottom(item: tuple[str, int, int]) -> int:
        name, _, y = item
        return y + images[name].height * s // 2

    from PIL import ImageDraw

    for name, cx, cy in sorted(placed, key=bottom):
        im = up(images[name], s)
        is_tree = name.startswith('tree')
        shadow = Image.new('RGBA', (im.width, (8 if is_tree else 6) * s // 2), (0, 0, 0, 0))
        d = ImageDraw.Draw(shadow)
        inset = 0.18 if is_tree else 0.2
        d.ellipse((im.width * inset, 0, im.width * (1 - inset), shadow.height - 1), fill=(0, 0, 0, 70))
        lift = 3 * s if is_tree else -2
        screen.alpha_composite(shadow, (cx - im.width // 2, cy + im.height // 2 - shadow.height - lift))
        screen.alpha_composite(im, (cx - im.width // 2, cy - im.height // 2))
    return up(screen, 2)


def main() -> None:
    out_dir = Path(sys.argv[1])
    (out_dir / '1x').mkdir(parents=True, exist_ok=True)
    (out_dir / '2x').mkdir(parents=True, exist_ok=True)
    images = build_all()
    for name, im in images.items():
        im.save(out_dir / '1x' / f'{name}.png')
        up(im, GAME_SCALE).save(out_dir / '2x' / f'{name}.png')
    preview(images).save(out_dir / 'preview.png')
    mockup(images).save(out_dir / 'mockup.png')
    print(f'{len(images)} sprites written to {out_dir}')


if __name__ == '__main__':
    main()
