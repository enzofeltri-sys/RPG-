"""UI step proposals (graphics pass, step 1): style A "Parchemin & bois"
applied to the game as it is after the gameplay pass — combat with skills,
resources and states, the shared kit, and the main menu screens.

Usage: python3 tools/art/ui_v3.py <out_dir>

Same 108x192 art-pixel canvas as ui.py (the game's 216x384 at 2x).
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

import sprites
from blob import ascii_to_grid, grid_to_image
from ui import (
    ART_H,
    ART_W,
    FONT_PATH,
    ICONS,
    Canvas,
    Parchment,
    _flash,
    _x2,
    bar,
    battle_backdrop_v2,
    c,
    hero_face,
    world_layer,
)

ROOT = Path(__file__).resolve().parents[2]
T = Parchment()

# ------------------------------------------------------------------ icons
# 8x8 action/menu icons and 7x7 state chips, same palette as the world art.

MORE_ICONS = {
    'skills': [
        '...kk...',
        '..kYYk..',
        'kkkoYkkk',
        'koYYYYok',
        '.koYYok.',
        '.kYokYk.',
        'kok..kok',
        'kk....kk',
    ],
    'star': [
        '...k....',
        '..kok...',
        'kkkoYkkk',
        'kYYYYYok',
        '.koYYok.',
        '.kok.kok',
        'kok...kk',
        'kk......',
    ],
    'book': [
        'kkkkkkk.',
        'kUuuuubk',
        'kUuYuubk',
        'kUuuuubk',
        'kUuYYubk',
        'kUuuuubk',
        'kQQQQQQk',
        'kkkkkkkk',
    ],
    'people': [
        '..kk..kk',
        '.kFFkkFF',
        '.kFFkkFF',
        'kuuukkxx',
        'kuuukkxx',
        'kuuukkxx',
        '.kkk..kk',
        '........',
    ],
    'lock': [
        '..kkkk..',
        '.k....k.',
        '.k....k.',
        'kkkkkkkk',
        'koooOook',
        'kooOkook',
        'kooOOook',
        'kkkkkkkk',
    ],
}

CHIPS = {
    # monster / player states
    'burn': ['...k...', '..kok..', '.koYok.', '.kYYok.', 'koYYYok', 'koxYxok', '.kkkkk.'],
    'poison': ['...k...', '..kpk..', '.kpppk.', 'kpPppPk', 'kppppPk', '.kpPPk.', '..kkk..'],
    'bleed': ['...k...', '..kyk..', '.kyxxk.', 'kyxxxXk', 'kxxxxXk', '.kxXXk.', '..kkk..'],
    'frozen': ['k..k..k', '.kvkvk.', '.kvWvk.', 'kkWWWkk', '.kvWvk.', '.kvkvk.', 'k..k..k'],
    'stun': ['.k...k.', 'kYk.kYk', '.k.k.k.', '..kYk..', '.k.k.k.', 'kYk.kYk', '.k...k.'],
    'weak': ['.kkkkk.', '.kxxxk.', '.kxxxk.', 'kkxxxkk', '.kxxxk.', '..kxk..', '...k...'],
    'vulnerable': ['kkkkkkk', 'kRRkRRk', 'kRk.kRk', 'kRRkRRk', '.kRkRk.', '..kRk..', '...k...'],
    'silence': ['.kkkkk.', 'kQQQQQk', 'kQkQkQk', 'kQQkQQk', 'kQkQkQk', 'kQQQQQk', '.kkkkk.'],
    'blind': ['.......', '.kkkkk.', 'kQkkkQk', 'kQkWkQk', 'kQkkkQk', '.kkkkk.', '.......'],
    'shield': ['kkkkkkk', 'kiiiiik', 'kiWiiik', 'kiWiiUk', '.kiiUk.', '..kUk..', '...k...'],
    'buff': ['...k...', '..khk..', '.khhhk.', 'kkhhhkk', '.khhhk.', '.khhhk.', '.kkkkk.'],
    'rage': ['kk...kk', 'kxk.kxk', '.kxkxk.', '..kxk..', '.kxkxk.', 'kxk.kxk', 'kk...kk'],
}


def icon(name: str) -> Image.Image:
    rows = MORE_ICONS.get(name) or ICONS[name]
    return grid_to_image(ascii_to_grid(rows))


def chip(name: str) -> Image.Image:
    return grid_to_image(ascii_to_grid(CHIPS[name]))


def chips_row(cv: Canvas, x: int, y: int, items: list[tuple[str, str]], dark_bg: bool = True) -> None:
    """State chips: a 9x9 framed icon with its turn count beside it."""
    for name, count in items:
        cv.rect(x, y, 9, 9, 'k')
        cv.rect(x + 1, y + 1, 7, 7, 'B' if dark_bg else 'V')
        cv.paste(chip(name), x + 1, y + 1)
        if count:
            cv.text(x + 10, y + 0.5, count, 8, 'W', 'k')
            x += 16
        else:
            x += 11


# ------------------------------------------------------------------ parts

def button(cv: Canvas, x: int, y: int, w: int, h: int, label: str, ic: str | None = None,
           state: str = 'normal', size: int = 10, cost: str | None = None) -> None:
    """state: normal | pressed | disabled."""
    if state == 'disabled':
        disabled_button(cv, x, y, w, h)
    else:
        T.button(cv, x, y, w, h, selected=(state == 'pressed'))
    text_color = 'r' if state == 'disabled' else T.button_text
    tx = x + 4
    if ic:
        cv.paste(icon(ic), x + 3, y + (h - 8) // 2)
        tx = x + 13
    cv.text(tx, y + h / 2 - 3.5, label, size, text_color, T.button_shadow)
    if cost:
        cv.text(x + w - 3, y + h / 2 - 3, cost, 8, 'Y' if state != 'disabled' else 'r', 'B', anchor='ra')


def disabled_button(cv: Canvas, x: int, y: int, w: int, h: int) -> None:
    # Unavailable: cold grey stone instead of warm wood, readable at a glance.
    cv.rect(x + 1, y, w - 2, 1, 'k')
    cv.rect(x + 1, y + h - 1, w - 2, 1, 'k')
    cv.rect(x, y + 1, 1, h - 2, 'k')
    cv.rect(x + w - 1, y + 1, 1, h - 2, 'k')
    cv.rect(x + 1, y + 1, w - 2, h - 2, 'S')
    cv.rect(x + 1, y + 1, w - 2, 1, 's')
    cv.rect(x + 1, y + h - 2, w - 2, 1, 'T')


def monster_sprite(name: str, size: int = 34) -> Image.Image:
    im = Image.open(ROOT / f'public/sprites/monsters/{name}.png').convert('RGBA')
    return im.resize((size, size), Image.NEAREST)


def hero_back() -> Image.Image:
    return _x2(grid_to_image(sprites.hero_frames()['up'][1]))


def battle_field(monster: str, telegraph: bool = False, hit: bool = False) -> Canvas:
    cv = Canvas(battle_backdrop_v2())
    m = monster_sprite(monster)
    mx, my = 76 - 17, 72 - 32
    hx, hy = 30 - 16, 132 - 47
    shadow = Image.new('RGBA', cv.img.size)
    sd = ImageDraw.Draw(shadow)
    sd.ellipse((hx + 6, hy + 43, hx + 26, hy + 48), fill=(0, 0, 0, 70))
    sd.ellipse((mx + 5, my + 28, mx + 29, my + 33), fill=(0, 0, 0, 70))
    cv.img.alpha_composite(shadow)
    cv.paste(_flash(m, (255, 60, 40), 0.35) if telegraph else m, mx, my)
    cv.paste(_flash(hero_back(), (255, 70, 60), 0.45) if hit else hero_back(), hx, hy)
    return cv


def monster_panel(cv: Canvas, name: str, level: str, kind: str, hp: float, hp_text: str, weak: str,
                  boss: bool = False) -> None:
    T.panel(cv, 3, 4, 68, 33)
    cv.text(7, 7.5, name, 10, 'X' if boss else T.text)
    cv.text(7, 15.5, f'{level} · {kind}', 8, T.text)
    cv.text(67, 15.5, hp_text, 8, T.text, anchor='ra')
    bar(cv, T, 7, 23, 60, hp, 'x', 'y')
    cv.text(7, 28.5, weak, 7, 'b')


def hero_panel(cv: Canvas, cls: str, level: str, hp: float, hp_text: str, res_label: str, res: float,
               res_text: str, res_fill: tuple[str, str], effects: list[tuple[str, str]]) -> None:
    T.panel(cv, 50, 90, 55, 43)
    cv.text(54, 93.5, cls, 10, T.text)
    cv.text(101, 93.5, level, 8, T.text, anchor='ra')
    cv.text(54, 102, 'PV', 8, T.text)
    bar(cv, T, 64, 103.5, 37, hp, 'h', 'H')
    cv.text(101, 107.5, hp_text, 7, T.text, anchor='ra')
    cv.text(54, 112, res_label, 8, T.text)
    bar(cv, T, 64, 113.5, 37, res, *res_fill)
    cv.text(101, 117.5, res_text, 7, T.text, anchor='ra')
    chips_row(cv, 54, 121, effects, dark_bg=False)


def log_panel(cv: Canvas, lines: list[str], y: int = 136, h: int = 22) -> None:
    T.panel(cv, 3, y, 102, h)
    for i, line in enumerate(lines):
        cv.text(54, y + 4 + i * 8, line, 9, T.text, anchor='ma')


# ------------------------------------------------------------- combat v3

def combat_main() -> Canvas:
    cv = battle_field('corrupted_wolf')
    monster_panel(cv, 'Loup corrompu', 'Niv. 3', 'Bête', 0.55, '44/80', 'Faible : Feu · Résiste : Glace')
    chips_row(cv, 4, 39, [('burn', '2'), ('weak', '1')])
    hero_panel(cv, 'Guerrier', 'Niv. 3', 0.72, '48/66', 'Rage', 0.5, '50/100', ('O', 'o'), [('bleed', '2'), ('shield', '')])
    log_panel(cv, ['Frappe lourde : 22 dégâts !', 'Le loup est affaibli.'])
    button(cv, 3, 160, 51, 14, 'Attaquer', 'sword', state='pressed')
    button(cv, 54, 160, 51, 14, 'Compétences', 'star', size=9)
    button(cv, 3, 176, 51, 14, 'Objets', 'potion')
    button(cv, 54, 176, 51, 14, 'Fuir', 'run')
    return cv


def combat_skills() -> Canvas:
    cv = battle_field('corrupted_wolf')
    monster_panel(cv, 'Loup corrompu', 'Niv. 3', 'Bête', 0.55, '44/80', 'Faible : Feu · Résiste : Glace')
    chips_row(cv, 4, 39, [('burn', '2')])
    hero_panel(cv, 'Guerrier', 'Niv. 3', 0.72, '48/66', 'Rage', 0.5, '50/100', ('O', 'o'), [('bleed', '2')])
    # Toast for an unusable skill, over the battlefield.
    T.panel(cv, 8, 74, 40, 13)
    cv.text(28, 77.5, 'Pas assez de rage', 7, 'X', anchor='ma')
    T.panel(cv, 3, 136, 102, 56)
    cv.text(54, 139, 'Compétences', 9, T.text, anchor='ma')
    button(cv, 6, 148, 47, 13, 'Frappe lourde', size=8, cost='30')
    button(cv, 55, 148, 47, 13, 'Brise-armure', size=8, cost='40', state='disabled')
    button(cv, 6, 162, 47, 13, 'C. de bouclier', size=8, cost='40', state='disabled')
    button(cv, 55, 162, 47, 13, 'Exécution', size=8, cost='60', state='disabled')
    button(cv, 30, 177, 48, 12, 'Retour', size=9)
    return cv


def combat_boss() -> Canvas:
    cv = battle_field('bandit_leader', telegraph=True)
    monster_panel(cv, 'Chef des bandits', 'Niv. 4', 'Humanoïde · Boss', 0.4, '93/223', 'Faible : Poison', boss=True)
    chips_row(cv, 4, 39, [('rage', ''), ('vulnerable', '2')])
    # Telegraph banner.
    cv.rect(44, 78, 62, 11, 'k')
    cv.rect(45, 79, 60, 9, 'X')
    cv.rect(45, 79, 60, 1, 'x')
    cv.text(75, 80.5, 'PREND SON ÉLAN !', 8, 'Y', 'k', anchor='ma')
    hero_panel(cv, 'Guerrier', 'Niv. 4', 0.38, '29/76', 'Rage', 0.8, '80/100', ('O', 'o'), [('silence', '1'), ('shield', '2')])
    log_panel(cv, ['Le chef prend son élan…', 'Coup dévastateur au prochain tour !'])
    button(cv, 3, 160, 51, 14, 'Attaquer', 'sword')
    button(cv, 54, 160, 51, 14, 'Compétences', 'star', size=9, state='disabled')
    button(cv, 3, 176, 51, 14, 'Objets', 'potion', state='pressed')
    button(cv, 54, 176, 51, 14, 'Fuir', 'run', state='disabled')
    return cv


# ---------------------------------------------------------------- kit

def kit_sheet() -> Canvas:
    cv = Canvas(Image.new('RGBA', (ART_W, ART_H), c('t')))
    T.panel(cv, 3, 3, 102, 30)
    cv.text(7, 6, 'Panneau', 10, T.text)
    cv.text(7, 15, 'Texte courant, ombre', 9, T.text)
    cv.text(7, 23, 'Texte secondaire', 8, 'b')
    button(cv, 3, 37, 33, 14, 'Normal', size=9)
    button(cv, 38, 37, 33, 14, 'Appuyé', size=9, state='pressed')
    button(cv, 73, 37, 32, 14, 'Grisé', size=9, state='disabled')
    button(cv, 3, 54, 102, 14, 'Bouton avec icône', 'sword')
    # tabs
    for i, (label, sel) in enumerate((('Armes', True), ('Rempart', False), ('Furie', False))):
        x = 3 + i * 34
        T.button(cv, x, 72, 33, 11, selected=sel)
        cv.text(x + 16.5, 74, label, 8, T.button_text, T.button_shadow, anchor='ma')
    # bars
    labels = [('PV', 'h', 'H'), ('Ennemi', 'x', 'y'), ('Rage', 'O', 'o'), ('Mana', 'u', 'i'), ('End.', 'c', 'v'), ('XP', 'p', 'P')]
    for i, (lab, f, l) in enumerate(labels):
        y = 88 + i * 8
        cv.text(4, y - 1.5, lab, 8, 'Q')
        bar(cv, T, 30, y, 74, 0.35 + 0.1 * i, f, l)
    # icons
    names = ['sword', 'star', 'potion', 'run', 'bag', 'heart', 'book', 'scroll', 'map', 'gear', 'door', 'lock']
    for i, n in enumerate(names):
        x = 4 + (i % 12) * 8.5
        cv.paste(icon(n), int(x), 138)
    # chips
    for i, n in enumerate(CHIPS):
        x = 4 + (i % 12) * 8.5
        cv.rect(int(x), 150, 9, 9, 'k')
        cv.rect(int(x) + 1, 151, 7, 7, 'B')
        cv.paste(chip(n), int(x) + 1, 151)
    cv.text(4, 161, 'Brûlure Poison Saign. Gel Étourdi Affaibli', 7, 'Q')
    cv.text(4, 168, 'Vulnér. Silence Aveuglé Bouclier Bonus Rage', 7, 'Q')
    # badge
    T.button(cv, 3, 177, 30, 13)
    cv.text(18, 179.5, 'Menu', 9, T.button_text, T.button_shadow, anchor='ma')
    cv.rect(28, 175, 7, 7, 'k')
    cv.rect(29, 176, 5, 5, 'x')
    cv.text(31.5, 175.3, '!', 7, 'W', anchor='ma')
    return cv


# ---------------------------------------------------------------- screens

def screen_menu() -> Canvas:
    world = world_layer()
    world.alpha_composite(Image.new('RGBA', world.size, (10, 8, 20, 150)))
    cv = Canvas(world)
    T.panel(cv, 5, 12, 98, 156)
    T.panel(cv, 10, 17, 20, 18)
    cv.paste(hero_face(), 12, 19)
    cv.text(34, 18, 'Humain Guerrier', 10, T.text)
    cv.text(34, 26, 'Niveau 7 · Normal', 8, T.text)
    bar(cv, T, 34, 32, 64, 0.45, 'p', 'P')
    entries = [
        ('sword', 'Équipement', ''), ('bag', 'Sac', ''), ('heart', 'Stats', '3'), ('star', 'Talents', '1'),
        ('scroll', 'Quêtes', ''), ('map', 'Carte', ''), ('gear', 'Options', ''), ('door', 'Quitter', ''),
    ]
    for i, (ic, label, badge) in enumerate(entries):
        col, row = i % 2, i // 2
        bx, by = 10 + col * 45, 41 + row * 24
        button(cv, bx, by, 43, 20, label, ic, size=9, state='pressed' if i == 0 else 'normal')
        if badge:
            cv.rect(bx + 35, by - 2, 9, 9, 'k')
            cv.rect(bx + 36, by - 1, 7, 7, 'x')
            cv.text(bx + 39.5, by - 1.7, badge, 7, 'W', anchor='ma')
    cv.text(54, 141, 'Or : 245', 9, T.text, anchor='ma')
    cv.text(54, 151, 'Valombre', 8, 'b', anchor='ma')
    return cv


def screen_talents() -> Canvas:
    cv = Canvas(Image.new('RGBA', (ART_W, ART_H), c('t')))
    T.panel(cv, 3, 3, 102, 186)
    cv.text(54, 6, 'Talents', 11, T.text, anchor='ma')
    cv.text(54, 15, 'Guerrier · Rage · 2 points', 8, 'b', anchor='ma')
    button(cv, 7, 24, 94, 12, 'Frappe lourde', 'star', size=9, cost='Départ')
    for i, (label, sel) in enumerate((('Armes', True), ('Rempart', False), ('Furie', False))):
        x = 7 + i * 32
        T.button(cv, x, 40, 30, 11, selected=sel)
        cv.text(x + 15, 42, label, 8, T.button_text, T.button_shadow, anchor='ma')
    rows = [('Niv 1', 'Maîtrise des armes', '2/3', 'normal'), ('Niv 5', 'Brise-armure', '✓', 'normal'),
            ('Niv 10', 'Enchaînement', '0/1', 'normal'), ('Niv 15', 'Exécution', '', 'disabled')]
    for i, (lvl, name, rank, state) in enumerate(rows):
        y = 55 + i * 15
        if state == 'disabled':
            disabled_button(cv, 7, y, 94, 13)
            cv.paste(icon('lock'), 90, y + 2)
        else:
            T.button(cv, 7, y, 94, 13, selected=(i == 0))
        cv.text(10, y + 3, lvl, 7, 'r' if state == 'disabled' else 'Y', 'B')
        cv.text(29, y + 2.5, name, 9, 'r' if state == 'disabled' else T.button_text, T.button_shadow)
        if rank:
            cv.text(97, y + 3, rank, 8, 'Y', 'B', anchor='ra')
    T.panel(cv, 7, 117, 94, 50)
    cv.text(11, 120, 'Maîtrise des armes', 10, T.text)
    cv.text(11, 129, 'Passif · rang 2/3', 8, 'b')
    cv.text(11, 137, '+14 % de dégâts physiques.', 8, T.text)
    cv.text(11, 145, 'Rang suivant : +21 %.', 8, T.text)
    cv.text(11, 155, 'En combat : 2/4', 7, 'b')
    button(cv, 7, 171, 45, 14, 'Rang +1', size=9)
    button(cv, 56, 171, 45, 14, 'Retour', size=9)
    return cv


def screen_equipment() -> Canvas:
    cv = Canvas(Image.new('RGBA', (ART_W, ART_H), c('t')))
    T.panel(cv, 3, 3, 102, 186)
    cv.text(54, 6, 'Équipement', 11, T.text, anchor='ma')
    hero = _x2(grid_to_image(sprites.hero_frames()['down'][1]))
    cv.paste(hero, 38, 40)
    slots = [('Casque', 8, 20), ('Amulette', 76, 20), ('Main dr.', 8, 43), ('Main g.', 76, 43),
             ('Torse', 8, 66), ('Gants', 76, 66), ('Jambes', 8, 89), ('Anneau', 76, 89), ('Bottes', 8, 112), ('Anneau', 76, 112)]
    for label, x, y in slots:
        T.button(cv, x, y, 24, 16, selected=(label == 'Main dr.'))
        cv.text(x + 12, y + 16.5, label, 6, 'b', anchor='ma')
    cv.paste(icon('sword'), 16, 47)
    cv.paste(icon('bag'), 84, 47)
    T.panel(cv, 7, 133, 94, 36)
    cv.text(11, 136, 'Épée courte (Rare)', 9, 'u')
    cv.text(11, 145, 'Épée · une main · dégâts 3-6', 8, T.text)
    cv.text(11, 153, 'Force +4   Feu +2', 8, T.text)
    cv.text(11, 161, '+ Meilleure que l\'actuelle', 8, 'g')
    button(cv, 7, 171, 45, 14, 'Équiper', size=9)
    button(cv, 56, 171, 45, 14, 'Retour', size=9)
    return cv


# ---------------------------------------------------------------- sheets

def sheet(title: str, canvases: list[Canvas], captions: list[str]) -> Image.Image:
    shots = [cvs.render() for cvs in canvases]
    gap = 24
    w = sum(s.width for s in shots) + gap * (len(shots) + 1)
    h = shots[0].height + gap * 2 + 70
    out = Image.new('RGBA', (w, h), (30, 32, 40, 255))
    d = ImageDraw.Draw(out)
    big = ImageFont.truetype(str(FONT_PATH), 40)
    small = ImageFont.truetype(str(FONT_PATH), 28)
    d.text((gap, 8), title, font=big, fill=(240, 230, 200, 255))
    x = gap
    for s, cap in zip(shots, captions):
        d.text((x, 46), cap, font=small, fill=(200, 196, 180, 255))
        out.paste(s, (x, 80))
        x += s.width + gap
    return out


def main() -> None:
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    sheet('Combat v3 — style A', [combat_main(), combat_skills(), combat_boss()],
          ['1. Action', '2. Compétences', '3. Boss : coup annoncé']).save(out / 'ui3_combat.png')
    sheet('Kit et écrans — style A', [kit_sheet(), screen_menu(), screen_talents(), screen_equipment()],
          ['Kit commun', 'Menu', 'Talents', 'Équipement']).save(out / 'ui3_ecrans.png')
    print('ok')


if __name__ == '__main__':
    main()
