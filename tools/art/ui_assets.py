"""Exports the style A UI images the game loads (graphics pass, UI step):
action icons, state chips and the combat backdrop. Panels, buttons and
bars are drawn by the game itself (src/ui/kit.ts) from the same palette, so
they stay crisp at any size.

Usage: python3 tools/art/ui_assets.py   (writes into public/sprites/ui/)

Art pixels are exported at 2x, the game's pixel size.
"""

from pathlib import Path

from PIL import Image

from blob import ascii_to_grid, grid_to_image
from ui import ICONS, battle_backdrop_v2
from ui_v3 import CHIPS, MORE_ICONS

OUT = Path(__file__).resolve().parents[2] / 'public/sprites/ui'

# Extra state chips the combat needs beyond the mockup set.
EXTRA_CHIPS = {
    'guard': ['kkkkkkk', 'kQQQQQk', 'kQnnnQk', 'kQnNnQk', '.kQnQk.', '..kQk..', '...k...'],
    'regen': ['..kkk..', '..khk..', 'kkkhkkk', 'khhhhhk', 'kkkhkkk', '..khk..', '..kkk..'],
    'crit': ['...k...', '..kYk..', 'kkkYkkk', 'kYYWYYk', '.kYYYk.', 'kYk.kYk', 'kk...kk'],
    'dodge': ['.....kk', '...kkWk', '..kWWk.', '.kWWk..', 'kWWk...', 'kWk....', 'kk.....'],
    'blade': ['.....kk', '....kRk', '...kRk.', 'k.kRk..', 'kpkk...', '.kpk...', 'kpkk...'],
    'shell': ['.kkkkk.', 'kOoooOk', 'koOoOok', 'kooOook', 'koOoOok', 'kOoooOk', '.kkkkk.'],
}


def x2(im: Image.Image, factor: int = 2) -> Image.Image:
    return im.resize((im.width * factor, im.height * factor), Image.NEAREST)


def export_grid(rows: list[str], path: Path, factor: int = 2) -> None:
    x2(grid_to_image(ascii_to_grid(rows)), factor).save(path)


def main() -> None:
    (OUT / 'icons').mkdir(parents=True, exist_ok=True)
    (OUT / 'states').mkdir(parents=True, exist_ok=True)
    for name, rows in {**ICONS, **MORE_ICONS}.items():
        export_grid(rows, OUT / 'icons' / f'{name}.png')
    for name, rows in {**CHIPS, **EXTRA_CHIPS}.items():
        export_grid(rows, OUT / 'states' / f'{name}.png')
    x2(battle_backdrop_v2()).save(OUT / 'battle_grass.png')
    # The heroes themselves come from heroes.py (build_heroes.py).
    print('ok', OUT)


if __name__ == '__main__':
    main()
