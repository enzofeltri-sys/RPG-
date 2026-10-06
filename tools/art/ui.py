"""UI kit proposals: panels, buttons, bars and icons in two themes, plus
mockups of three key screens (exploration + dialogue, combat, menu).

Usage: python3 tools/art/ui.py <out_dir>

Everything is composed on a 108x192 "art pixel" canvas — the game's
216x384 internal resolution at the same 2x pixel size as the world art —
so UI and world share one pixel grid. Text is drawn afterwards at full
resolution with the game's own font (VT323), as the game itself does.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import sprites
from blob import ascii_to_grid, grid_to_image
from build import grass_field
from palette import PALETTE

ART_W, ART_H = 108, 192
VIEW = 4  # art px -> view px (2x art scale * 2x preview)
FONT_PATH = Path(__file__).resolve().parents[2] / 'src/assets/fonts/VT323-Regular.woff2'


def c(key: str) -> tuple[int, int, int, int]:
    return PALETTE[key]


# ------------------------------------------------------------------ icons

ICONS = {
    'sword': [
        '......kk',
        '.....kRk',
        '....kRsk',
        '.k.kRsk.',
        '.kokRk..',
        '..kok...',
        '.kbkok..',
        'kbk..k..',
    ],
    'bag': [
        '..kkkk..',
        '..kbbk..',
        '.kknnkk.',
        'knNnnnbk',
        'knnnnnbk',
        'knnoonbk',
        'knnnnbbk',
        '.kkkkkk.',
    ],
    'heart': [
        '.kk..kk.',
        'kyxkkxxk',
        'kyxxxxxk',
        'kxxxxxXk',
        '.kxxxXk.',
        '..kxXk..',
        '...kk...',
        '........',
    ],
    'scroll': [
        '.kkkkkk.',
        'kQVQQQQk',
        '.kQQQQk.',
        '.kQBBQk.',
        '.kQQQQk.',
        '.kQBBQk.',
        'kQQQQVQk',
        '.kkkkkk.',
    ],
    'map': [
        'kkkkkkkk',
        'kQQVQQhk',
        'khQVQhhk',
        'khhVQhQk',
        'kQhVxQQk',
        'kQQVQQQk',
        'kQQVQQQk',
        'kkkkkkkk',
    ],
    'gear': [
        '...kk...',
        '.kkrrkk.',
        '.krRsrk.',
        'krRkkrsk',
        'krskksrk',
        '.krssrk.',
        '.kkrrkk.',
        '...kk...',
    ],
    'door': [
        '.kkkkkk.',
        'kbnnnnbk',
        'kbnBBnbk',
        'kbnBBnbk',
        'kbnnnobk',
        'kbnnnnbk',
        'kbnnnnbk',
        'kkkkkkkk',
    ],
    'potion': [
        '..kkk...',
        '..kNk...',
        '..kRk...',
        '.kxxxk..',
        'kxyxxxk.',
        'kxxxxXk.',
        '.kXXXk..',
        '..kkk...',
    ],
    'run': [
        '....kk..',
        '...kFFk.',
        '...kuk..',
        '.kkuuukk',
        '...kuk..',
        '..kUkUk.',
        '.kBk.kBk',
        '.kk...kk',
    ],
}


def icon(name: str) -> Image.Image:
    return grid_to_image(ascii_to_grid(ICONS[name]))


# ----------------------------------------------------------------- canvas

class Canvas:
    def __init__(self, base: Image.Image | None = None):
        self.img = base.copy() if base else Image.new('RGBA', (ART_W, ART_H), (0, 0, 0, 0))
        self.d = ImageDraw.Draw(self.img)
        self.texts: list[tuple[float, float, str, int, str, str | None, str]] = []

    def px(self, x: int, y: int, key: str) -> None:
        if 0 <= x < ART_W and 0 <= y < ART_H:
            self.img.putpixel((x, y), c(key))

    def rect(self, x: int, y: int, w: int, h: int, key: str) -> None:
        if w > 0 and h > 0:
            self.d.rectangle((x, y, x + w - 1, y + h - 1), fill=c(key))

    def paste(self, im: Image.Image, x: int, y: int) -> None:
        self.img.alpha_composite(im, (x, y))

    def text(self, x: float, y: float, s: str, size: int, color: str, shadow: str | None = None, anchor: str = 'la') -> None:
        """size is the game's internal font size in px (VT323)."""
        self.texts.append((x, y, s, size, color, shadow, anchor))

    def render(self) -> Image.Image:
        out = self.img.resize((ART_W * VIEW, ART_H * VIEW), Image.NEAREST)
        d = ImageDraw.Draw(out)
        for x, y, s, size, color, shadow, anchor in self.texts:
            font = ImageFont.truetype(str(FONT_PATH), size * 2)
            pos = (x * VIEW, y * VIEW)
            if shadow:
                d.text((pos[0] + 2, pos[1] + 2), s, font=font, fill=c(shadow), anchor=anchor)
            d.text(pos, s, font=font, fill=c(color), anchor=anchor)
        return out


# ----------------------------------------------------------------- themes

class Theme:
    name = ''
    text = 'k'
    text_shadow: str | None = None
    button_text = 'W'
    button_shadow: str | None = 'k'

    def panel(self, cv: Canvas, x: int, y: int, w: int, h: int) -> None: ...

    def button(self, cv: Canvas, x: int, y: int, w: int, h: int, selected: bool = False) -> None: ...

    def bar_bg(self) -> str:
        return 'k'


def _rounded_outline(cv: Canvas, x: int, y: int, w: int, h: int, key: str) -> None:
    cv.rect(x + 1, y, w - 2, 1, key)
    cv.rect(x + 1, y + h - 1, w - 2, 1, key)
    cv.rect(x, y + 1, 1, h - 2, key)
    cv.rect(x + w - 1, y + 1, 1, h - 2, key)


class Parchment(Theme):
    """Warm medieval: dark wooden frame, gold rivets, parchment paper."""

    name = 'A — Parchemin & bois'
    text = 'B'
    button_text = 'Q'
    button_shadow = 'B'

    def panel(self, cv: Canvas, x: int, y: int, w: int, h: int) -> None:
        _rounded_outline(cv, x, y, w, h, 'k')
        cv.rect(x + 1, y + 1, w - 2, h - 2, 'b')
        cv.rect(x + 1, y + 1, w - 2, 1, 'n')
        cv.rect(x + 1, y + 1, 1, h - 2, 'n')
        cv.rect(x + 2, y + 2, w - 4, h - 4, 'B')
        cv.rect(x + 3, y + 3, w - 6, h - 6, 'Q')
        cv.rect(x + 3, y + h - 4, w - 6, 1, 'V')
        cv.rect(x + w - 4, y + 3, 1, h - 6, 'V')
        # Paper grain.
        for gy in range(y + 4, y + h - 4):
            for gx in range(x + 4, x + w - 5):
                if ((gx * 73856093) ^ (gy * 19349663)) % 61 == 0:
                    cv.px(gx, gy, 'V')
        for rx, ry in ((x + 1, y + 1), (x + w - 2, y + 1), (x + 1, y + h - 2), (x + w - 2, y + h - 2)):
            cv.px(rx, ry, 'o')

    def button(self, cv: Canvas, x: int, y: int, w: int, h: int, selected: bool = False) -> None:
        _rounded_outline(cv, x, y, w, h, 'k')
        fill = 'b' if selected else 'n'
        cv.rect(x + 1, y + 1, w - 2, h - 2, fill)
        cv.rect(x + 1, y + 1, w - 2, 1, 'N' if not selected else 'n')
        cv.rect(x + 1, y + h - 2, w - 2, 1, 'B')
        if selected:
            cv.rect(x + 1, y + 1, w - 2, 1, 'o')

    def bar_bg(self) -> str:
        return 'B'


class Royal(Theme):
    """Classic JRPG window: light frame on a deep blue gradient."""

    name = 'B — Fenêtre bleue'
    text = 'W'
    text_shadow = 'k'
    button_text = 'W'
    button_shadow = 'k'

    def _fill(self, cv: Canvas, x: int, y: int, w: int, h: int) -> None:
        bands = ['1', '2', '3', '4']
        for i in range(h):
            cv.rect(x, y + i, w, 1, bands[min(3, i * 4 // max(1, h))])

    def panel(self, cv: Canvas, x: int, y: int, w: int, h: int) -> None:
        _rounded_outline(cv, x, y, w, h, 'k')
        cv.rect(x + 1, y + 1, w - 2, h - 2, 'R')
        cv.rect(x + 2, y + 2, w - 4, h - 4, 's')
        self._fill(cv, x + 3, y + 3, w - 6, h - 6)

    def button(self, cv: Canvas, x: int, y: int, w: int, h: int, selected: bool = False) -> None:
        _rounded_outline(cv, x, y, w, h, 'k')
        cv.rect(x + 1, y + 1, w - 2, h - 2, 'o' if selected else 'r')
        self._fill(cv, x + 2, y + 2, w - 4, h - 4)

    def bar_bg(self) -> str:
        return '4'


def bar(cv: Canvas, theme: Theme, x: int, y: int, w: int, ratio: float, fill: str, light: str) -> None:
    cv.rect(x, y, w, 4, 'k')
    cv.rect(x + 1, y + 1, w - 2, 2, theme.bar_bg())
    filled = max(0, round((w - 2) * ratio))
    cv.rect(x + 1, y + 1, filled, 2, fill)
    cv.rect(x + 1, y + 1, filled, 1, light)


def down_arrow(cv: Canvas, x: int, y: int, key: str) -> None:
    for i, wdt in enumerate((5, 3, 1)):
        cv.rect(x - wdt // 2, y + i, wdt, 1, key)


# ---------------------------------------------------------------- scenes

NPC_SWAP = {
    'M': 'K', 'U': 'G', 'u': 'g', 'i': 'h', 'I': 'H',
    'A': 'k', 'a': 'B', 'd': 'b', 'D': 'n', 'E': 'N',
    'Z': 'O', 'X': 'O', 'x': 'o', 'y': 'Y',
}


def swap(grid, mapping):
    return [[mapping.get(k, k) if k else k for k in row] for row in grid]


def world_layer() -> Image.Image:
    base = grass_field(7, 12, seed=3).crop((0, 0, ART_W, ART_H))
    img = base.copy()
    tree = grid_to_image(sprites.tree())
    bush = grid_to_image(sprites.bush())
    rock = grid_to_image(sprites.rock())
    frames = sprites.hero_frames()
    hero = grid_to_image(frames['right'][1])
    npc = grid_to_image(swap(frames['left'][1], NPC_SWAP))
    items = [
        (tree, 14, 26), (tree, 94, 20), (tree, 98, 104), (tree, 8, 118),
        (bush, 42, 40), (bush, 70, 52), (bush, 24, 86), (rock, 84, 70),
        (hero, 46, 92), (npc, 64, 92),
    ]
    shadow_layer = Image.new('RGBA', img.size)
    sd = ImageDraw.Draw(shadow_layer)
    for im, cx, cy in sorted(items, key=lambda t: t[2] + t[0].height // 2):
        bottom = cy + im.height // 2
        sw = im.width * (0.62 if im.width == 32 else 0.6)
        lift = 3 if im.width == 32 else 0
        sd.ellipse((cx - sw / 2, bottom - 3 - lift, cx + sw / 2, bottom - lift), fill=(0, 0, 0, 70))
    img.alpha_composite(shadow_layer)
    for im, cx, cy in sorted(items, key=lambda t: t[2] + t[0].height // 2):
        img.alpha_composite(im, (cx - im.width // 2, cy - im.height // 2))
    return img


def hero_face() -> Image.Image:
    full = grid_to_image(sprites.hero_frames()['down'][1])
    return full.crop((0, 0, 16, 13))


def screen_explore(theme: Theme) -> Canvas:
    cv = Canvas(world_layer())
    # HUD: menu button + compact HP readout.
    theme.button(cv, 3, 3, 13, 13)
    cv.paste(icon('bag'), 5, 5)
    theme.panel(cv, 18, 3, 44, 13)
    cv.paste(icon('heart'), 21, 6)
    bar(cv, theme, 31, 8, 27, 0.8, 'h', 'H')
    # Dialogue.
    theme.panel(cv, 3, 140, 102, 49)
    theme.panel(cv, 7, 133, 34, 12)
    cv.text(24, 135.5, 'Garde', 11, theme.text, theme.text_shadow, anchor='ma')
    lines = ["Je garde ce chemin depuis", "des années. Les gobelins", "n'osent plus s'approcher."]
    for i, line in enumerate(lines):
        cv.text(9, 149 + i * 9, line, 11, theme.text, theme.text_shadow)
    down_arrow(cv, 97, 181, 'o' if isinstance(theme, Royal) else 'B')
    return cv


def battle_backdrop() -> Image.Image:
    img = grass_field(7, 12, seed=11).crop((0, 0, ART_W, ART_H))
    d = ImageDraw.Draw(img)
    tree = grid_to_image(sprites.tree())
    for i, x in enumerate(range(-8, ART_W + 8, 18)):
        img.alpha_composite(tree, (x, -14 + (i % 2) * 6))
    d.ellipse((24, 92, 84, 108), fill=c('q'))
    d.ellipse((28, 94, 80, 106), fill=c('g'))
    d.ellipse((30, 95, 78, 104), fill=c('q'))
    return img


def screen_battle(theme: Theme) -> Canvas:
    cv = Canvas(battle_backdrop())
    slime = grid_to_image(ascii_to_grid(sprites.SLIME_FRAMES[0]))
    big = slime.resize((32, 32), Image.NEAREST)
    cv.paste(big, 54 - 16, 101 - 30)
    theme.panel(cv, 3, 34, 102, 22)
    cv.text(8, 37.5, 'Slime des bois', 11, theme.text, theme.text_shadow)
    cv.text(100, 37.5, 'Niv. 2', 11, theme.text, theme.text_shadow, anchor='ra')
    bar(cv, theme, 8, 48, 92, 0.7, 'x', 'y')

    theme.panel(cv, 3, 114, 102, 30)
    cv.paste(hero_face(), 6, 118)
    cv.text(25, 117, 'PV', 10, theme.text, theme.text_shadow)
    bar(cv, theme, 33, 119, 48, 0.9, 'h', 'H')
    cv.text(100, 117, '50/56', 10, theme.text, theme.text_shadow, anchor='ra')
    cv.text(25, 127, 'PM', 10, theme.text, theme.text_shadow)
    bar(cv, theme, 33, 129, 48, 0.6, 'u', 'i')
    cv.text(100, 127, '13/22', 10, theme.text, theme.text_shadow, anchor='ra')

    theme.panel(cv, 3, 146, 102, 17)
    cv.text(54, 150, 'Un slime des bois surgit !', 10, theme.text, theme.text_shadow, anchor='ma')

    theme.button(cv, 3, 165, 102, 12, selected=True)
    cv.paste(icon('sword'), 36, 167)
    cv.text(48, 166.5, 'Attaquer', 11, theme.button_text, theme.button_shadow)
    theme.button(cv, 3, 179, 50, 12)
    cv.paste(icon('potion'), 7, 181)
    cv.text(17, 180.5, 'Potion x3', 10, theme.button_text, theme.button_shadow)
    theme.button(cv, 55, 179, 50, 12)
    cv.paste(icon('run'), 66, 181)
    cv.text(77, 180.5, 'Fuir', 11, theme.button_text, theme.button_shadow)
    return cv


def screen_menu(theme: Theme) -> Canvas:
    world = world_layer()
    dim = Image.new('RGBA', world.size, (10, 8, 20, 150))
    world.alpha_composite(dim)
    cv = Canvas(world)
    theme.panel(cv, 6, 16, 96, 140)
    theme.panel(cv, 11, 21, 20, 18)
    cv.paste(hero_face(), 13, 23)
    cv.text(35, 22, 'Humain Guerrier', 11, theme.text, theme.text_shadow)
    cv.text(35, 30, 'Niveau 3', 10, theme.text, theme.text_shadow)
    bar(cv, theme, 66, 32, 30, 0.45, 'o', 'Y')
    entries = [
        ('sword', 'Inventaire'), ('bag', 'Sac'), ('heart', 'Stats'), ('scroll', 'Quêtes'),
        ('map', 'Carte'), ('gear', 'Options'), ('door', 'Quitter'),
    ]
    for i, (ic, label) in enumerate(entries):
        col, row = i % 2, i // 2
        bx, by = 11 + col * 45, 45 + row * 25
        theme.button(cv, bx, by, 42, 21, selected=(i == 0))
        cv.paste(icon(ic), bx + 3, by + 7)
        cv.text(bx + 13, by + 7, label, 10, theme.button_text, theme.button_shadow)
    return cv


def sheet(theme: Theme) -> Image.Image:
    shots = [screen_explore(theme).render(), screen_battle(theme).render(), screen_menu(theme).render()]
    gap = 24
    w = sum(s.width for s in shots) + gap * (len(shots) + 1)
    h = shots[0].height + gap * 2 + 40
    out = Image.new('RGBA', (w, h), (30, 32, 40, 255))
    d = ImageDraw.Draw(out)
    font = ImageFont.truetype(str(FONT_PATH), 40)
    d.text((gap, 10), theme.name, font=font, fill=(240, 230, 200, 255))
    x = gap
    for s in shots:
        out.paste(s, (x, 40 + gap))
        x += s.width + gap
    return out


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    for theme, fname in ((Parchment(), 'ui_A_parchemin.png'), (Royal(), 'ui_B_bleu.png')):
        sheet(theme).save(out / fname)
    print('ok')


if __name__ == '__main__':
    main()
