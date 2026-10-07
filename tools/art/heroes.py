"""Paper-doll generator for the playable heroes (5 races x 5 classes).

A hero is drawn from a Look: the race gives the body (skin, height, build,
face, hair, ears, beard, tusks), and each layer (head, chest, legs, boots,
gloves, cape, main hand, off hand) is a piece of gear with a shape and a
material. Every class has a default look (its starting outfit); equipped
items can replace any layer, which is what lets a helmet or boots show on
the hero once the game maps items to looks.

Everything is drawn by code at native resolution (1 art pixel = 1 game
pixel in the world, like the 16px ground tiles). Parts are layered, each
part gets a darker edge where it covers the one beneath, and the whole
silhouette gets a 1px dark outline.

Views: 'down' (front), 'up' (back), 'left', 'right' (mirror of left).
Frames per view: stepA, idle, stepB (walk: stepA, idle, stepB, idle) and
breathe (idle with the upper body one pixel lower, for standing still).
"""

from __future__ import annotations

from dataclasses import dataclass, field, replace

from PIL import Image

W, H = 24, 32
FEET_Y = 30  # last row of the feet
OUTLINE = (34, 28, 41)

RGB = tuple[int, int, int]
Tones = tuple[RGB, RGB, RGB]  # light, mid, dark

# ------------------------------------------------------------------ colors

SKIN: dict[str, Tones] = {
    'human': ((248, 196, 152), (232, 164, 120), (190, 118, 86)),
    'elf': ((252, 222, 194), (238, 196, 162), (198, 148, 118)),
    'dwarf': ((242, 178, 136), (222, 142, 104), (172, 98, 74)),
    'orc': ((178, 192, 112), (134, 150, 78), (88, 102, 54)),  # olive, apart from cloth and grass greens
    'halfling': ((250, 202, 152), (236, 170, 122), (194, 124, 88)),
}
HAIR: dict[str, Tones] = {
    'human': ((206, 134, 74), (158, 90, 50), (104, 54, 36)),
    'elf': ((252, 242, 188), (232, 204, 126), (176, 144, 86)),
    'dwarf': ((242, 130, 66), (198, 82, 42), (134, 48, 30)),
    'orc': ((98, 88, 108), (62, 54, 72), (38, 32, 46)),
    'halfling': ((188, 118, 66), (142, 82, 44), (96, 54, 32)),
}
IRON: Tones = ((214, 218, 226), (156, 160, 174), (102, 106, 122))
STEEL: Tones = ((236, 240, 246), (182, 188, 202), (118, 124, 142))
MITHRIL: Tones = ((222, 242, 252), (150, 198, 228), (84, 124, 170))
GOLD: Tones = ((252, 236, 140), (238, 188, 60), (172, 112, 30))
LEATHER: Tones = ((176, 120, 72), (124, 80, 48), (80, 50, 34))
DARK_LEATHER: Tones = ((124, 92, 72), (86, 62, 50), (56, 40, 36))
WOOD: Tones = ((194, 136, 80), (142, 94, 56), (94, 60, 38))
RED: Tones = ((244, 118, 104), (198, 52, 58), (122, 28, 44))
BLUE: Tones = ((110, 162, 230), (58, 102, 184), (34, 58, 116))
GREEN: Tones = ((104, 184, 136), (58, 134, 100), (34, 86, 70))  # hunter's teal green, apart from the grass
FOREST: Tones = ((74, 132, 104), (44, 96, 78), (28, 62, 56))
CHARCOAL: Tones = ((110, 106, 130), (74, 70, 94), (46, 44, 60))
WHITE: Tones = ((252, 252, 244), (226, 222, 210), (170, 166, 166))
PURPLE: Tones = ((200, 146, 236), (152, 94, 188), (92, 52, 128))
CLOTH_BROWN: Tones = ((172, 132, 92), (128, 94, 64), (86, 62, 46))
EYE: RGB = (34, 28, 41)
TUSK: RGB = (252, 248, 228)
BLUSH: RGB = (240, 140, 122)
GLOW: RGB = (244, 228, 255)


# ------------------------------------------------------------------- races

@dataclass(frozen=True)
class Build:
    head_w: int
    head_h: int
    torso_w: int
    torso_h: int
    legs_h: int
    leg_w: int
    head_shape: tuple[int, ...]  # inset per row, top to chin


BUILDS: dict[str, Build] = {
    'human': Build(10, 9, 10, 8, 8, 4, (2, 1, 0, 0, 0, 0, 0, 1, 2)),
    'elf': Build(9, 9, 8, 8, 9, 3, (2, 1, 0, 0, 0, 0, 1, 1, 2)),
    'orc': Build(11, 9, 12, 9, 8, 5, (3, 1, 0, 0, 0, 0, 0, 0, 1)),
    'dwarf': Build(10, 9, 12, 7, 5, 5, (2, 1, 0, 0, 0, 0, 0, 1, 2)),
    'halfling': Build(10, 9, 8, 6, 5, 3, (3, 1, 0, 0, 0, 0, 0, 1, 3)),
}

RACES = ['human', 'elf', 'dwarf', 'orc', 'halfling']
CLASSES = ['warrior', 'mage', 'archer', 'rogue', 'cleric']


# -------------------------------------------------------------------- looks

@dataclass(frozen=True)
class Gear:
    shape: str
    mat: Tones
    trim: Tones | None = None  # accent (rarity, class colors)


@dataclass(frozen=True)
class Look:
    race: str
    head: Gear | None
    chest: Gear
    legs: Gear
    boots: Gear | None  # None = bare feet
    gloves: Gear | None = None
    cape: Gear | None = None
    main: Gear | None = None
    off: Gear | None = None
    mask: Gear | None = None
    quiver: bool = False


def class_look(race: str, cls: str) -> Look:
    """The starting outfit of each class."""
    bare = race == 'halfling'
    boots = None if bare else Gear('boots', LEATHER)
    if cls == 'warrior':
        return Look(
            race,
            head=Gear('helm', IRON, RED),
            chest=Gear('plate', IRON, RED),
            legs=Gear('pants', CHARCOAL),
            boots=None if bare else Gear('sabatons', IRON),
            gloves=Gear('gauntlets', IRON),
            main=Gear('sword', STEEL, GOLD),
            off=Gear('shield', RED, GOLD),
        )
    if cls == 'mage':
        return Look(
            race,
            head=Gear('hat', BLUE, GOLD),
            chest=Gear('robe', BLUE, GOLD),
            legs=Gear('pants', BLUE),
            boots=boots,
            main=Gear('staff', WOOD, PURPLE),
        )
    if cls == 'archer':
        return Look(
            race,
            head=Gear('hood', GREEN),
            chest=Gear('tunic', GREEN, LEATHER),
            legs=Gear('pants', CLOTH_BROWN),
            boots=boots,
            gloves=Gear('bracers', LEATHER),
            cape=Gear('cape', FOREST),
            main=Gear('bow', WOOD),
            quiver=True,
        )
    if cls == 'rogue':
        return Look(
            race,
            head=Gear('hood', CHARCOAL),
            chest=Gear('jerkin', DARK_LEATHER, GOLD),
            legs=Gear('pants', CHARCOAL),
            boots=boots,
            gloves=Gear('gloves', DARK_LEATHER),
            cape=Gear('cape', CHARCOAL),
            main=Gear('dagger', STEEL),
            off=Gear('dagger', STEEL),
            mask=Gear('mask', RED),
        )
    return Look(  # cleric
        race,
        head=Gear('circlet', GOLD, BLUE),
        chest=Gear('robe', WHITE, GOLD),
        legs=Gear('pants', WHITE),
        boots=boots,
        main=Gear('staff', WOOD, WHITE),  # the cleric starts with a staff
    )


# ------------------------------------------------------------------ canvas

@dataclass
class Part:
    pixels: dict[tuple[int, int], RGB] = field(default_factory=dict)
    edge: RGB | None = None  # darker edge where it covers a lower part


class Doll:
    def __init__(self) -> None:
        self.parts: list[Part] = []

    def part(self, edge: RGB | None = None) -> Part:
        p = Part(edge=edge)
        self.parts.append(p)
        return p

    def render(self) -> Image.Image:
        owner: dict[tuple[int, int], int] = {}
        color: dict[tuple[int, int], RGB] = {}
        for i, p in enumerate(self.parts):
            for xy, c in p.pixels.items():
                if 0 <= xy[0] < W and 0 <= xy[1] < H:
                    owner[xy] = i
                    color[xy] = c
        final = dict(color)
        for (x, y), i in owner.items():
            edge = self.parts[i].edge
            if edge is None:
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                j = owner.get((nx, ny))
                if j is not None and j < i and self.parts[j].edge != edge:
                    final[(x, y)] = edge
                    break
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        px = im.load()
        for (x, y), c in final.items():
            px[x, y] = (*c, 255)
        for y in range(H):
            for x in range(W):
                if px[x, y][3]:
                    continue
                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if 0 <= nx < W and 0 <= ny < H and px[nx, ny][3] and px[nx, ny][:3] != OUTLINE:
                        px[x, y] = (*OUTLINE, 255)
                        break
        return im


def span(p: Part, y: int, x0: int, x1: int, tones: Tones, shade: str = 'lr') -> None:
    """Fills x0..x1 on row y. 'lr': light left edge, dark right edge."""
    for x in range(x0, x1 + 1):
        c = tones[1]
        if shade == 'lr':
            if x == x0 and x1 > x0:
                c = tones[0]
            elif x == x1 and x1 > x0:
                c = tones[2]
        elif shade == 'light':
            c = tones[0]
        elif shade == 'dark':
            c = tones[2]
        p.pixels[(x, y)] = c


def put(p: Part, x: int, y: int, c: RGB) -> None:
    p.pixels[(x, y)] = c


def line(p: Part, x0: int, y0: int, x1: int, y1: int, c: RGB) -> None:
    steps = max(abs(x1 - x0), abs(y1 - y0))
    for i in range(steps + 1):
        t = i / steps if steps else 0
        put(p, round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)


# ------------------------------------------------------------- the figure

class Hero:
    def __init__(self, race: str, cls: str, look: Look | None = None) -> None:
        self.race = race
        self.cls = cls
        self.look = look or class_look(race, cls)
        self.b = BUILDS[race]
        self.skin = SKIN[race]
        self.hair = HAIR[race]

    def rows(self, bob: int = 0) -> dict[str, int]:
        b = self.b
        legs_top = FEET_Y - b.legs_h + 1
        torso_top = legs_top - b.torso_h + bob
        head_top = torso_top - b.head_h + 1
        return {'legs_top': legs_top, 'torso_top': torso_top, 'head_top': head_top}

    def robe(self) -> bool:
        return self.look.chest.shape == 'robe'

    def frame(self, view: str, step: int, breathe: bool = False) -> Image.Image:
        if view == 'down':
            return self.front(step, back=False, breathe=breathe)
        if view == 'up':
            return self.front(step, back=True, breathe=breathe)
        if view == 'left':
            return self.side(step, breathe=breathe)
        if view == 'right':
            return self.side(step, breathe=breathe).transpose(Image.FLIP_LEFT_RIGHT)
        raise ValueError(view)

    # ================================================================ front

    def front(self, step: int, back: bool, breathe: bool = False) -> Image.Image:
        d = Doll()
        L = self.look
        b = self.b
        cx = 12
        bob = 1 if (step != 0 or breathe) else 0
        r = self.rows(bob)
        tw = b.torso_w
        tl = cx - tw // 2  # torso left column
        tr = tl + tw - 1  # torso right column

        if not back:
            self.cape_front_peek(d, r, tl, tr)
        else:
            self.off_on_back(d, r, tl, tr)

        self.legs_front(d, r, step)
        self.torso_front(d, r, tl, tr, back)
        hands = self.arms_front(d, r, tl, tr, step, back)
        self.head_front(d, r, back)
        if back:
            self.cape_back(d, r, tl, tr)
            if L.quiver:
                self.quiver_back(d, r)
            self.held_back(d, r, hands)
        else:
            self.held_front(d, r, hands)
        return d.render()

    # ------------------------------------------------------------- legs

    def feet(self, d: Doll, x0: int, w: int, bottom: int, side: int) -> None:
        L = self.look
        p = d.part()
        if L.boots is None:
            # Bare feet with toes.
            span(p, bottom, x0, x0 + w - 1, self.skin)
            put(p, x0 + (w - 1 if side > 0 else 0), bottom, self.skin[0])
            return
        rows = 3 if L.boots.shape == 'sabatons' else 2
        for i in range(rows):
            span(p, bottom - i, x0, x0 + w - 1, L.boots.mat)
        if L.boots.shape == 'sabatons':
            span(p, bottom - rows + 1, x0, x0 + w - 1, L.boots.mat, 'light')
        if L.boots.trim:
            span(p, bottom - rows + 1, x0, x0 + w - 1, L.boots.trim, 'flat')

    def legs_front(self, d: Doll, r: dict[str, int], step: int) -> None:
        L = self.look
        b = self.b
        cx = 12
        lw = b.leg_w
        boot_rows = 0 if L.boots is None else 3 if L.boots.shape == 'sabatons' else 2
        for side, x0 in ((-1, cx - 1 - lw), (1, cx + 1)):
            lift = 1 if (step != 0 and side == step) else 0
            bottom = FEET_Y - lift
            p = d.part()
            for y in range(r['legs_top'], bottom + 1 - max(1, boot_rows)):
                span(p, y, x0, x0 + lw - 1, L.legs.mat)
                if L.legs.shape == 'greaves' and y >= r['legs_top'] + 2:
                    put(p, x0 + 1, y, L.legs.mat[0])
            self.feet(d, x0, lw, bottom, side)
        if self.robe():
            self.skirt_front(d, r, step)

    def skirt_front(self, d: Doll, r: dict[str, int], step: int) -> None:
        L = self.look
        b = self.b
        cx = 12
        p = d.part(edge=L.chest.mat[2])
        hem = FEET_Y - 2
        sway = step  # the hem swings with the stride
        for y in range(r['legs_top'] - 1, hem + 1):
            spread = (y - r['legs_top'] + 1) // 3
            x0 = cx - b.torso_w // 2 - spread + (sway if y >= hem - 1 else 0)
            x1 = cx + b.torso_w // 2 - 1 + spread + (sway if y >= hem - 1 else 0)
            span(p, y, x0, x1, L.chest.mat)
            if y == hem and L.chest.trim:
                span(p, y, x0, x1, L.chest.trim, 'flat')
        if L.chest.trim:
            # Front panel trim down the middle.
            for y in range(r['legs_top'] - 1, hem):
                put(p, cx - 1, y, L.chest.trim[1])

    # ------------------------------------------------------------ torso

    def torso_front(self, d: Doll, r: dict[str, int], tl: int, tr: int, back: bool) -> None:
        L = self.look
        cx = 12
        top, bottom = r['torso_top'], r['legs_top'] - 1
        c = L.chest
        p = d.part(edge=c.mat[2])
        for i, y in enumerate(range(top, bottom + 1)):
            inset = 1 if i == 0 else 0
            span(p, y, tl + inset, tr - inset, c.mat)
        det = d.part()
        belt = bottom - 1
        shape = c.shape
        if shape == 'plate':
            if not back:
                for y in range(top + 1, belt):
                    put(det, cx - 2, y, c.mat[0])  # breastplate highlight
                if c.trim:
                    # Tabard down the front.
                    for y in range(top + 2, bottom + 1):
                        span(det, y, cx - 2, cx + 1, c.trim)
                    put(det, cx - 1, top + 4, GOLD[0])
                    put(det, cx, top + 4, GOLD[1])
            elif c.trim:
                for y in range(top + 2, bottom + 1):
                    span(det, y, cx - 2, cx + 1, c.trim)
            span(det, belt, tl + 1, tr - 1, LEATHER, 'flat')
            if not back:
                span(det, belt, cx - 1, cx, GOLD, 'flat')
            # Pauldrons wider than the chest.
            pa = d.part(edge=c.mat[2])
            for x0 in (tl - 1, tr - 1):
                span(pa, top, x0 + 1, x0 + 1, c.mat, 'light')
                span(pa, top + 1, x0, x0 + 2, c.mat)
                span(pa, top + 2, x0, x0 + 2, c.mat, 'dark')
        elif shape == 'chain':
            for y in range(top + 1, belt):
                for x in range(tl + 1, tr):
                    if (x + y) % 2 == 0:
                        put(det, x, y, c.mat[2])
            span(det, belt, tl + 1, tr - 1, LEATHER, 'flat')
        elif shape in ('leather', 'jerkin'):
            if not back:
                # Lighter front panel with lacing.
                for y in range(top + 1, belt):
                    span(det, y, cx - 2, cx + 1, c.mat, 'light')
                    if y % 2 == 0:
                        put(det, cx - 1, y, c.mat[2])
                        put(det, cx, y, c.mat[2])
            span(det, belt, tl + 1, tr - 1, LEATHER if shape == 'leather' else DARK_LEATHER, 'flat')
            if c.trim and not back:
                put(det, cx, belt, c.trim[1])
                put(det, tr - 2, belt + 1, LEATHER[0])  # pouch
        elif shape == 'tunic':
            if not back:
                span(det, top, cx - 2, cx + 1, c.mat, 'light')  # collar
                put(det, cx - 1, top + 1, c.mat[2])
            span(det, belt, tl + 1, tr - 1, c.trim or LEATHER, 'flat')
            if not back:
                put(det, cx, belt, GOLD[1])
        elif shape == 'robe':
            if not back and c.trim:
                for y in range(top + 1, bottom + 1):
                    put(det, cx - 1, y, c.trim[1])
                # Collar.
                put(det, cx - 2, top, c.trim[0])
                put(det, cx + 1, top, c.trim[0])
            span(det, belt, tl + 1, tr - 1, c.trim or c.mat, 'flat')
        if self.look.quiver and not back:
            # Quiver strap across the chest.
            for i in range(r['legs_top'] - top - 1):
                put(det, tl + 1 + i, top + i, LEATHER[2])

    # ------------------------------------------------------------- arms

    def arms_front(self, d: Doll, r: dict[str, int], tl: int, tr: int, step: int, back: bool) -> dict[str, tuple[int, int]]:
        L = self.look
        hands: dict[str, tuple[int, int]] = {}
        sleeve = L.chest.mat
        wide = self.robe()
        for side in (-1, 1):
            swing = -step * side if step else 0
            x0 = tl - 2 if side < 0 else tr + 1
            top = r['torso_top'] + 1
            bottom = r['legs_top'] + swing
            p = d.part(edge=sleeve[2])
            for y in range(top, bottom):
                span(p, y, x0, x0 + 1, sleeve)
            if wide:
                # Wide sleeve cuff.
                cuff_x = x0 - 1 if side < 0 else x0 + 2
                put(p, cuff_x, bottom - 1, sleeve[2] if side > 0 else sleeve[1])
                if L.chest.trim:
                    span(p, bottom - 1, x0, x0 + 1, L.chest.trim, 'flat')
            hp = d.part()
            g = L.gloves
            if g is None:
                span(hp, bottom, x0, x0 + 1, self.skin)
            elif g.shape == 'bracers':
                span(hp, bottom, x0, x0 + 1, self.skin)
                span(hp, bottom - 1, x0, x0 + 1, g.mat, 'flat')
                span(hp, bottom - 2, x0, x0 + 1, g.mat)
            else:
                span(hp, bottom, x0, x0 + 1, g.mat)
                span(hp, bottom - 1, x0, x0 + 1, g.mat, 'light' if g.shape == 'gauntlets' else 'flat')
            # Viewer's left is the hero's right hand from the front.
            right_hand = (side < 0) != back
            hands['main' if right_hand else 'off'] = (x0, bottom)
        return hands

    # ------------------------------------------------------------- head

    def head_box(self, r: dict[str, int]) -> tuple[int, int, int, int]:
        b = self.b
        cx = 12
        top = r['head_top']
        x0 = cx - b.head_w // 2
        return x0, x0 + b.head_w - 1, top, top + b.head_h - 1

    def head_front(self, d: Doll, r: dict[str, int], back: bool) -> None:
        L = self.look
        b = self.b
        cx = 12
        x0, x1, top, bot = self.head_box(r)
        head = d.part(edge=self.skin[2])
        for i, inset in enumerate(b.head_shape):
            span(head, top + i, x0 + inset, x1 - inset, self.skin)
        eye_y = top + 5
        hood = L.head is not None and L.head.shape == 'hood'

        # Ears (behind the hair).
        ear = d.part()
        if self.race not in ('elf',):
            put(ear, x0 - 1, eye_y, self.skin[1])
            put(ear, x1 + 1, eye_y, self.skin[2])

        self.hair_front(d, x0, x1, top, bot, back, hidden=hood)

        if not back:
            face = d.part()
            for ex in (cx - 2, cx + 1):
                put(face, ex, eye_y, EYE)
                put(face, ex, eye_y - 1, EYE)
            if self.race == 'orc':
                for ex in (cx - 3, cx - 2, cx + 1, cx + 2):
                    put(face, ex, eye_y - 2, self.skin[2])  # heavy brow
            if self.race == 'dwarf':
                for ex in (cx - 3, cx - 2, cx + 1, cx + 2):
                    put(face, ex, eye_y - 2, self.hair[1])  # bushy brows
            if self.race == 'halfling':
                put(face, cx - 3, eye_y + 1, BLUSH)
                put(face, cx + 2, eye_y + 1, BLUSH)
            if self.race not in ('dwarf',) and L.mask is None:
                put(face, cx - 1, eye_y + 2, self.skin[2])  # mouth
                put(face, cx, eye_y + 2, self.skin[2])
            if self.race == 'dwarf':
                self.beard_front(d, x0, x1, eye_y)
            if L.mask is not None:
                m = d.part(edge=L.mask.mat[2])
                for y in range(eye_y + 2, bot + 1):
                    inset = b.head_shape[y - top]
                    span(m, y, x0 + inset + 1, x1 - inset - 1, L.mask.mat)
                put(m, x1, bot + 1, L.mask.mat[2])  # scarf tail

        self.headgear_front(d, r, back)

        # Race marks stay visible over hoods, helms and masks.
        marks = d.part()
        if self.race == 'elf':
            for side, ex in ((-1, x0 - 1), (1, x1 + 1)):
                put(marks, ex, eye_y, self.skin[1])
                put(marks, ex + side, eye_y - 1, self.skin[0] if side < 0 else self.skin[1])
                put(marks, ex + 2 * side, eye_y - 2, self.skin[0] if side < 0 else self.skin[2])
        if self.race == 'halfling' and not hood:
            put(marks, x0 - 1, eye_y - 1, self.skin[0])
            put(marks, x1 + 1, eye_y - 1, self.skin[2])
        if self.race == 'orc' and not back:
            for tx in (cx - 2, cx + 1):
                put(marks, tx, eye_y + 2, TUSK)
                put(marks, tx, eye_y + 1, TUSK)

    def hair_front(self, d: Doll, x0: int, x1: int, top: int, bot: int, back: bool, hidden: bool) -> None:
        hp = d.part(edge=self.hair[2])
        h = self.hair
        race = self.race
        cx = 12
        if hidden:
            return
        if race == 'orc':
            # Shaved sides, black topknot.
            for y in range(top - 3, top + 1):
                span(hp, y, cx - 2, cx + 1, h)
            put(hp, cx - 1, top - 4, h[1])
            put(hp, cx, top - 4, h[2])
            if back:
                for y in range(top + 1, top + 5):
                    span(hp, y, cx - 1, cx, h)  # braid down the back
            return
        if back:
            shape = self.b.head_shape
            for i in range(self.b.head_h - 1):
                y = top + i
                span(hp, y, x0 + shape[i], x1 - shape[i], h)
            if race == 'elf':
                for y in range(bot, bot + 5):
                    span(hp, y, x0 + 1, x1 - 1, h)
            if race == 'halfling':
                for x in range(x0 + 1, x1, 2):
                    put(hp, x, top - 1, h[1])
            return
        # Front: crown, then a fringe per race.
        span(hp, top, x0 + 2, x1 - 2, h)
        span(hp, top + 1, x0 + 1, x1 - 1, h)
        span(hp, top + 2, x0, x1, h)
        if race == 'human':
            # Side part, fringe swept to one side.
            span(hp, top + 3, x0, cx - 1, h)
            put(hp, x1, top + 3, h[2])
            for y in range(top + 4, top + 6):
                put(hp, x0, y, h[1])
                put(hp, x1, y, h[2])
        elif race == 'elf':
            # Center part, long hair framing the face down to the shoulders.
            put(hp, cx - 1, top + 1, h[0])
            put(hp, cx - 1, top + 2, h[0])
            put(hp, x0 + 1, top + 3, h[1])
            put(hp, x1 - 1, top + 3, h[1])
            for y in range(top + 3, bot + 4):
                put(hp, x0, y, h[1])
                put(hp, x1, y, h[2])
                if y > bot - 2:
                    put(hp, x0 - 1, y, h[1])
                    put(hp, x1 + 1, y, h[2])
        elif race == 'dwarf':
            # Bushy mane.
            span(hp, top + 1, x0, x1, h)
            span(hp, top + 2, x0 - 1, x1 + 1, h)
            for y in range(top + 3, top + 6):
                put(hp, x0 - 1, y, h[1])
                put(hp, x0, y, h[1])
                put(hp, x1, y, h[2])
                put(hp, x1 + 1, y, h[2])
        elif race == 'halfling':
            # Curls: a bumpy crown and curly sides.
            for x in range(x0 + 1, x1, 2):
                put(hp, x, top - 1, h[1])
            span(hp, top + 3, x0, x1, h)
            put(hp, cx - 1, top + 3, self.skin[1])
            put(hp, cx + 1, top + 3, self.skin[1])
            for y in range(top + 3, top + 7):
                put(hp, x0 - (y % 2), y, h[1])
                put(hp, x1 + (y % 2), y, h[2])

    def beard_front(self, d: Doll, x0: int, x1: int, eye_y: int) -> None:
        h = self.hair
        cx = 12
        p = d.part(edge=h[2])
        span(p, eye_y + 1, x0 + 1, x1 - 1, h)  # moustache
        widths = [10, 10, 10, 8, 6, 4, 2]
        for i, w in enumerate(widths):
            y = eye_y + 2 + i
            span(p, y, cx - w // 2, cx - w // 2 + w - 1, h)
        put(p, cx - 1, eye_y + 2, self.skin[2])  # mouth in the beard
        put(p, cx, eye_y + 2, self.skin[2])
        put(p, cx - 1, eye_y + 2 + len(widths) - 2, GOLD[1])  # braid bead

    def headgear_front(self, d: Doll, r: dict[str, int], back: bool) -> None:
        g = self.look.head
        if g is None:
            return
        b = self.b
        cx = 12
        x0, x1, top, bot = self.head_box(r)
        p = d.part(edge=g.mat[2])
        m = g.mat
        if g.shape in ('helm', 'plumed'):
            span(p, top - 1, x0 + 2, x1 - 2, m, 'light')
            span(p, top, x0 + 1, x1 - 1, m)
            span(p, top + 1, x0, x1, m)
            span(p, top + 2, x0, x1, m, 'dark')  # rim
            if back:
                for y in range(top + 3, bot - 1):
                    span(p, y, x0, x1, m)
            else:
                put(p, cx - 1, top + 3, m[1])  # nose guard
                put(p, cx, top + 3, m[2])
                for y in range(top + 3, top + 6):
                    put(p, x0, y, m[1])  # cheek guards
                    put(p, x1, y, m[2])
            if g.shape == 'plumed' or g.trim:
                pl = d.part()
                t = g.trim or RED
                for i, y in enumerate(range(top - 4, top)):
                    put(pl, cx - 1 + (1 if i < 2 else 0), y, t[1] if i % 2 else t[0])
                    put(pl, cx + (1 if i < 2 else 0), y, t[2])
        elif g.shape == 'cap':
            span(p, top - 1, x0 + 2, x1 - 2, m, 'light')
            span(p, top, x0 + 1, x1 - 1, m)
            span(p, top + 1, x0, x1, m)
            span(p, top + 2, x0, x1, g.trim or m, 'dark')
        elif g.shape == 'hat':
            for i, y in enumerate(range(top - 7, top + 1)):
                w = min(1 + i, b.head_w - 2)
                lean = max(0, 3 - i)
                span(p, y, cx - w // 2 + lean, cx - w // 2 + lean + w - 1, m)
            span(p, top + 1, x0 - 1, x1 + 1, m)
            span(p, top + 2, x0 - 2, x1 + 2, m, 'dark')  # wide brim
            if g.trim:
                span(p, top, x0 + 1, x1 - 1, g.trim, 'flat')
                if not back:
                    put(p, cx, top - 3, g.trim[0])  # star
        elif g.shape == 'hood':
            span(p, top - 1, x0 + 2, x1 - 2, m, 'light')
            span(p, top, x0 + 1, x1 - 1, m)
            span(p, top + 1, x0, x1, m)
            span(p, top + 2, x0, x1, m)
            for y in range(top + 3, bot + 1):
                span(p, y, x0 - 1, x0, m, 'light')
                span(p, y, x1, x1 + 1, m, 'dark')
            if back:
                for y in range(top + 3, bot + 1):
                    span(p, y, x0 - 1, x1 + 1, m)
            # Cowl over the shoulders.
            span(p, bot + 1, x0 - 1, x1 + 1, m)
            put(p, cx - 1 if not back else cx, bot + 2, m[2])
        elif g.shape == 'circlet':
            band = top + 2 if not back else top + 2
            span(p, band, x0 + 1, x1 - 1, m, 'flat')
            if not back and g.trim:
                put(p, cx - 1, band, g.trim[0])
                put(p, cx, band, g.trim[1])

    # ------------------------------------------------------------ capes

    def cape_front_peek(self, d: Doll, r: dict[str, int], tl: int, tr: int) -> None:
        c = self.look.cape
        if c is None:
            return
        p = d.part(edge=c.mat[2])
        for y in range(r['torso_top'] + 1, r['legs_top'] + 3):
            put(p, tl - 1, y, c.mat[2])
            put(p, tr + 1, y, c.mat[2])

    def cape_back(self, d: Doll, r: dict[str, int], tl: int, tr: int) -> None:
        c = self.look.cape
        if c is None:
            return
        p = d.part(edge=c.mat[2])
        for i, y in enumerate(range(r['torso_top'], r['legs_top'] + 4)):
            spread = i // 4
            span(p, y, tl - spread, tr + spread, c.mat)
        span(p, r['legs_top'] + 4, tl, tr, c.mat, 'dark')

    def quiver_back(self, d: Doll, r: dict[str, int]) -> None:
        p = d.part(edge=LEATHER[2])
        x = 13
        for y in range(r['torso_top'] - 1, r['legs_top']):
            span(p, y, x, x + 2, LEATHER)
        put(p, x, r['torso_top'] - 2, RED[1])
        put(p, x + 1, r['torso_top'] - 3, WHITE[0])
        put(p, x + 2, r['torso_top'] - 2, RED[0])

    def off_on_back(self, d: Doll, r: dict[str, int], tl: int, tr: int) -> None:
        return

    # ---------------------------------------------------------- weapons

    def weapon(self, d: Doll, g: Gear, hx: int, hy: int, outward: int, r: dict[str, int]) -> None:
        """A held item at hand (hx, hy); outward = -1 left / +1 right of the hand."""
        p = d.part()
        m = g.mat
        bx = hx if outward < 0 else hx + 1
        shape = g.shape
        if shape in ('sword', 'greatsword'):
            length = 9 if shape == 'sword' else 12
            span(p, hy - 1, bx - 1, bx + 1, g.trim or GOLD, 'flat')  # guard
            put(p, bx, hy + 1, LEATHER[1])  # pommel
            for y in range(hy - 1 - length, hy - 1):
                put(p, bx, y, m[0])
                if shape == 'greatsword':
                    put(p, bx + outward, y, m[2])
            put(p, bx, hy - 2 - length, m[1])
        elif shape in ('axe', 'greataxe'):
            length = 8 if shape == 'axe' else 12
            for y in range(hy - length, hy + 2):
                put(p, bx, y, WOOD[1])
            head = d.part(edge=m[2])
            hh = 4 if shape == 'axe' else 5
            for i in range(hh):
                y = hy - length + i
                reach = 3 if 0 < i < hh - 1 else 2  # the blade's curve
                xa, xb = (bx + 1, bx + reach) if outward > 0 else (bx - reach, bx - 1)
                span(head, y, xa, xb, m)
                if shape == 'greataxe':
                    put(head, bx - outward, y, m[1])  # second, smaller blade
        elif shape == 'dagger':
            put(p, bx, hy + 1, LEATHER[1])
            for i in range(1, 4):
                put(p, bx + outward * (i // 2), hy + 1 + i, m[0])
        elif shape == 'mace':
            # Raised outward, clear of the body so it reads on any outfit.
            for i in range(1, 5):
                put(p, bx + outward * (i // 2), hy - i, WOOD[1])
            hx_, hy_ = bx + outward * 3, hy - 6
            head = d.part(edge=m[2])
            span(head, hy_, hx_ - 1, hx_ + 1, m)
            span(head, hy_ + 1, hx_ - 1, hx_ + 1, m)
            put(head, hx_, hy_ - 1, (g.trim or m)[0])
            put(head, hx_ + outward * 2, hy_, m[1])
        elif shape == 'staff':
            orb = g.trim or PURPLE
            ty = r['head_top'] - 4
            for y in range(ty + 2, FEET_Y + 1):
                put(p, bx, y, m[1])
            head = d.part()
            span(head, ty, bx, bx, orb, 'light')
            span(head, ty + 1, bx - 1, bx + 1, orb)
            put(head, bx, ty + 1, GLOW)
            put(head, bx - 1, ty + 2, m[2])
            put(head, bx + 1, ty + 2, m[2])
        elif shape == 'bow':
            bxx = hx + (2 if outward > 0 else -1)
            for y in range(hy - 8, hy + 3):
                put(p, bxx - outward, y, (232, 228, 214))  # string
            for i, y in enumerate(range(hy - 9, hy + 4)):
                off = 1 if 2 < i < 10 else 0
                put(p, bxx + outward * off, y, m[1] if off else m[2])
        elif shape == 'tome':
            book = d.part(edge=m[2])
            x0 = hx - 1 if outward < 0 else hx
            for y in range(hy - 3, hy + 2):
                span(book, y, x0, x0 + 2, m)
            put(book, x0, hy - 3, (g.trim or GOLD)[1])
            put(book, x0 + 2, hy + 1, (g.trim or GOLD)[1])
            for y in range(hy - 2, hy + 1):
                put(book, x0 + (3 if outward > 0 else -1), y, WHITE[1])  # pages
        elif shape in ('shield', 'tower'):
            sh = d.part(edge=m[2])
            tall = 7 if shape == 'shield' else 10
            sx = hx - 1 if outward > 0 else hx - 3
            sy = r['torso_top'] + 1
            for i in range(tall):
                inset = 1 if (shape == 'shield' and i in (0, tall - 1)) else 0
                span(sh, sy + i, sx + inset, sx + 5 - inset, m)
            t = g.trim or GOLD
            for i in range(1, tall - 1):
                put(sh, sx + 2, sy + i, t[1])
            span(sh, sy + tall // 2, sx + 1, sx + 4, t, 'flat')

    def held_front(self, d: Doll, r: dict[str, int], hands: dict[str, tuple[int, int]]) -> None:
        L = self.look
        if L.main is not None:
            mx, my = hands['main']
            if L.main.shape == 'bow':
                fx, fy = hands['off']
                self.weapon(d, L.main, fx, fy, 1, r)
            else:
                self.weapon(d, L.main, mx, my, -1, r)
        if L.off is not None:
            fx, fy = hands['off']
            self.weapon(d, L.off, fx, fy, 1, r)

    def held_back(self, d: Doll, r: dict[str, int], hands: dict[str, tuple[int, int]]) -> None:
        L = self.look
        if L.main is not None:
            mx, my = hands['main']
            if L.main.shape == 'bow':
                fx, fy = hands['off']
                self.weapon(d, L.main, fx, fy, -1, r)
            else:
                self.weapon(d, L.main, mx, my, 1, r)
        if L.off is not None:
            fx, fy = hands['off']
            off = L.off
            if off.shape in ('shield', 'tower'):
                off = replace(off, mat=WOOD, trim=IRON)  # the back of the shield
            self.weapon(d, off, fx, fy, -1, r)

    # ================================================================= side

    def side(self, step: int, breathe: bool = False) -> Image.Image:
        """Facing left. Far limbs in shadow, near limbs in light."""
        d = Doll()
        L = self.look
        b = self.b
        cx = 12
        bob = 1 if (step != 0 or breathe) else 0
        r = self.rows(bob)
        depth = b.torso_w - 2
        x0 = cx - depth // 2
        x1 = x0 + depth - 1
        lw = b.leg_w
        c = L.chest

        # Behind the body: cape, quiver, shield on the far arm.
        if L.cape is not None:
            p = d.part(edge=L.cape.mat[2])
            for i, y in enumerate(range(r['torso_top'], r['legs_top'] + 3)):
                span(p, y, x1 - 1, x1 + 1 + i // 4 + (1 if step else 0), L.cape.mat)
        if L.quiver:
            q = d.part(edge=LEATHER[2])
            for y in range(r['torso_top'] - 1, r['legs_top']):
                span(q, y, x1, x1 + 2, LEATHER)
            put(q, x1 + 1, r['torso_top'] - 2, RED[1])
            put(q, x1 + 2, r['torso_top'] - 3, WHITE[0])
        if L.off is not None and L.off.shape in ('shield', 'tower'):
            sh = d.part(edge=L.off.mat[2])
            sy = r['torso_top'] + 1
            tall = 7 if L.off.shape == 'shield' else 10
            for i in range(tall):
                inset = 1 if (L.off.shape == 'shield' and i in (0, tall - 1)) else 0
                span(sh, sy + i, x1 - 1 + inset, x1 + 2 - inset, L.off.mat)
            put(sh, x1 + 1, sy + tall // 2, (L.off.trim or GOLD)[1])

        # Far arm (swings opposite to the near one).
        far = d.part(edge=c.mat[2])
        fax = cx + step
        hy_far = r['legs_top'] - 1
        for y in range(r['torso_top'] + 1, hy_far):
            span(far, y, fax, fax + 1, c.mat, 'dark')
        put(far, fax, hy_far, self.skin[2] if L.gloves is None else L.gloves.mat[2])
        put(far, fax + 1, hy_far, self.skin[2] if L.gloves is None else L.gloves.mat[2])

        # Legs: far one in shadow, stride of 2px each way, knee lift.
        boot_rows = 0 if L.boots is None else 3 if L.boots.shape == 'sabatons' else 2
        for leg, off in ((0, 2 * step), (1, -2 * step)):
            p = d.part(edge=None if leg == 0 else OUTLINE)
            lx = cx - lw // 2 + off
            lift = 1 if (step != 0 and leg == 1 and off < 0) else 0
            bottom = FEET_Y - lift
            for y in range(r['legs_top'], bottom + 1):
                foot = y > bottom - max(1, boot_rows)
                if foot:
                    tones = self.skin if L.boots is None else L.boots.mat
                else:
                    tones = L.legs.mat
                span(p, y, lx, lx + lw - 1, tones, 'dark' if leg == 0 else 'lr')
            toe = self.skin if L.boots is None else L.boots.mat
            put(p, lx - 1, bottom, toe[2] if leg == 0 else toe[1])

        if self.robe():
            sk = d.part(edge=c.mat[2])
            hem = FEET_Y - 2
            for y in range(r['legs_top'] - 1, hem + 1):
                spread = (y - r['legs_top'] + 1) // 3
                sway = -step if y >= hem - 1 else 0
                span(sk, y, x0 - spread + sway, x1 + spread + sway, c.mat)
                if y == hem and c.trim:
                    span(sk, y, x0 - spread + sway, x1 + spread + sway, c.trim, 'flat')

        torso = d.part(edge=c.mat[2])
        for i, y in enumerate(range(r['torso_top'], r['legs_top'])):
            span(torso, y, x0 + (1 if i == 0 else 0), x1, c.mat)
        det = d.part()
        belt = r['legs_top'] - 2
        span(det, belt, x0, x1, (c.trim if self.robe() else None) or LEATHER, 'flat')
        if c.shape == 'plate':
            if c.trim:
                for y in range(r['torso_top'] + 2, r['legs_top']):
                    span(det, y, x0, x0 + 1, c.trim, 'flat')
            pa = d.part(edge=c.mat[2])
            span(pa, r['torso_top'], cx - 1, cx + 1, c.mat, 'light')
            span(pa, r['torso_top'] + 1, cx - 2, cx + 2, c.mat)
        elif c.shape == 'chain':
            for y in range(r['torso_top'] + 1, belt):
                for x in range(x0 + 1, x1):
                    if (x + y) % 2 == 0:
                        put(det, x, y, c.mat[2])
        elif c.shape in ('leather', 'jerkin'):
            for y in range(r['torso_top'] + 1, belt):
                put(det, x0, y, c.mat[0])
        elif c.shape == 'robe' and c.trim:
            for y in range(r['torso_top'] + 1, r['legs_top']):
                put(det, x0, y, c.trim[1])

        self.head_side(d, r)

        # Near arm with the main weapon.
        arm = d.part(edge=c.mat[2])
        ax = cx - 1 - step
        hy = r['legs_top']
        for y in range(r['torso_top'] + 1, hy):
            span(arm, y, ax, ax + 1, c.mat)
        hand = d.part()
        g = L.gloves
        span(hand, hy, ax, ax + 1, self.skin if g is None or g.shape == 'bracers' else g.mat)
        if g is not None and g.shape == 'bracers':
            span(hand, hy - 1, ax, ax + 1, g.mat, 'flat')
        if L.main is not None:
            self.weapon_side(d, L.main, ax, hy, r, x0)
        if L.off is not None and L.off.shape == 'tome':
            pass  # held on the far side, hidden
        return d.render()

    def head_side(self, d: Doll, r: dict[str, int]) -> None:
        L = self.look
        b = self.b
        cx = 12
        top = r['head_top']
        hh = b.head_h
        hw = b.head_w - 1
        hx0 = cx - hw // 2 - 1
        hx1 = hx0 + hw - 1
        shape = b.head_shape
        head = d.part(edge=self.skin[2])
        for i in range(hh):
            span(head, top + i, hx0 + shape[i], hx1 - shape[i], self.skin)
        eye_y = top + 5
        put(head, hx0 - 1, eye_y + 1, self.skin[1])  # nose
        hood = L.head is not None and L.head.shape == 'hood'
        hp = d.part(edge=self.hair[2])
        h = self.hair
        if not hood:
            if self.race == 'orc':
                for y in range(top - 3, top + 1):
                    span(hp, y, cx - 1, cx + 2, h)
                for y in range(top + 1, top + 5):
                    put(hp, hx1, y, h[1])
            else:
                span(hp, top, hx0 + 2, hx1 - 2, h)
                span(hp, top + 1, hx0 + 1, hx1 - 1, h)
                span(hp, top + 2, hx0 + 1, hx1, h)
                for y in range(top + 3, top + hh - 1):
                    span(hp, y, hx1 - 3, hx1, h)
                if self.race == 'human':
                    put(hp, hx0 + 1, top + 3, h[1])
                if self.race == 'elf':
                    for y in range(top + hh - 1, top + hh + 4):
                        span(hp, y, hx1 - 3, hx1, h)
                if self.race == 'dwarf':
                    for y in range(top + 2, top + 6):
                        put(hp, hx1 + 1, y, h[2])
                if self.race == 'halfling':
                    for x in range(hx0 + 2, hx1, 2):
                        put(hp, x, top - 1, h[1])
                    for y in range(top + 3, top + 7):
                        put(hp, hx1 + (y % 2), y, h[2])
        face = d.part()
        put(face, hx0 + 1, eye_y, EYE)
        put(face, hx0 + 1, eye_y - 1, EYE)
        if self.race not in ('dwarf',) and L.mask is None:
            put(face, hx0, eye_y + 2, self.skin[2])  # mouth
        if self.race == 'orc':
            put(face, hx0 + 1, eye_y - 2, self.skin[2])
        if self.race == 'halfling':
            put(face, hx0 + 2, eye_y + 1, BLUSH)
        if self.race == 'dwarf':
            beard = d.part(edge=h[2])
            for i, y in enumerate(range(eye_y + 1, eye_y + 9)):
                w = 5 if i < 4 else 4 if i < 6 else 2
                span(beard, y, hx0 - 1, hx0 - 2 + w, h)
            put(beard, hx0, eye_y + 7, GOLD[1])
        if L.mask is not None:
            m = d.part(edge=L.mask.mat[2])
            for y in range(eye_y + 2, top + hh):
                span(m, y, hx0 - 1 + shape[y - top], hx1 - 4, L.mask.mat)
            put(m, hx1 - 2, eye_y + 3, L.mask.mat[2])
        g = L.head
        if g is not None:
            p = d.part(edge=g.mat[2])
            m = g.mat
            if g.shape in ('helm', 'plumed'):
                span(p, top - 1, hx0 + 2, hx1 - 1, m, 'light')
                span(p, top, hx0 + 1, hx1, m)
                span(p, top + 1, hx0, hx1, m)
                span(p, top + 2, hx0, hx1, m, 'dark')
                for y in range(top + 3, top + hh - 2):
                    span(p, y, hx1 - 2, hx1, m)
                put(p, hx0, top + 3, m[1])
                if g.shape == 'plumed' or g.trim:
                    t = g.trim or RED
                    pl = d.part()
                    for i, y in enumerate(range(top - 4, top)):
                        span(pl, y, cx + i // 2, cx + 1 + i // 2, t)
                    span(pl, top - 4, cx + 2, cx + 3, t)
            elif g.shape == 'cap':
                span(p, top - 1, hx0 + 2, hx1 - 1, m, 'light')
                span(p, top, hx0 + 1, hx1, m)
                span(p, top + 1, hx0, hx1, m)
                span(p, top + 2, hx0 - 1, hx1, g.trim or m, 'dark')
            elif g.shape == 'hat':
                for i, y in enumerate(range(top - 7, top + 1)):
                    w = min(1 + i, b.head_w - 2)
                    lean = max(0, 3 - i)
                    span(p, y, cx - w // 2 + lean, cx - w // 2 + lean + w - 1, m)
                span(p, top + 1, hx0 - 1, hx1 + 1, m)
                span(p, top + 2, hx0 - 2, hx1 + 2, m, 'dark')
                if g.trim:
                    span(p, top, hx0 + 1, hx1 - 1, g.trim, 'flat')
            elif g.shape == 'hood':
                span(p, top - 1, hx0 + 2, hx1 - 1, m, 'light')
                span(p, top, hx0 + 1, hx1, m)
                span(p, top + 1, hx0, hx1 + 1, m)
                span(p, top + 2, hx0, hx1 + 1, m)
                for y in range(top + 3, top + hh + 1):
                    span(p, y, hx1 - 3, hx1 + 1, m)
                span(p, top + hh + 1, hx0 + 1, hx1 + 1, m)
            elif g.shape == 'circlet':
                span(p, top + 2, hx0 + 1, hx1, m, 'flat')
                if g.trim:
                    put(p, hx0 + 1, top + 2, g.trim[0])
        marks = d.part()
        if self.race == 'elf':
            put(marks, hx1 - 3, eye_y, self.skin[1])
            put(marks, hx1 - 2, eye_y - 1, self.skin[1])
            put(marks, hx1 - 1, eye_y - 2, self.skin[0])
            put(marks, hx1, eye_y - 3, self.skin[0])
        elif self.race == 'halfling' and not hood:
            put(marks, hx1 - 3, eye_y - 1, self.skin[1])
        elif not hood and g is None or (g is not None and g.shape in ('circlet',)):
            put(marks, hx1 - 3, eye_y, self.skin[2])
        if self.race == 'orc':
            put(marks, hx0, eye_y + 2, TUSK)
            put(marks, hx0, eye_y + 1, TUSK)

    def weapon_side(self, d: Doll, g: Gear, ax: int, hy: int, r: dict[str, int], body_front: int) -> None:
        p = d.part()
        m = g.mat
        shape = g.shape
        if shape in ('sword', 'greatsword'):
            length = 8 if shape == 'sword' else 11
            span(p, hy - 1, ax - 1, ax - 1, g.trim or GOLD, 'flat')
            put(p, ax - 1, hy, g.trim[1] if g.trim else GOLD[1])
            put(p, ax - 1, hy + 1, (g.trim or GOLD)[1])
            for i in range(2, 2 + length):
                y = hy - (1 if i > length // 2 + 1 else 0)
                put(p, ax - i, y, m[0] if i < 1 + length else m[1])
                if shape == 'greatsword':
                    put(p, ax - i, y + 1, m[2])
        elif shape in ('axe', 'greataxe'):
            length = 7 if shape == 'axe' else 10
            for i in range(1, length):
                put(p, ax - i, hy - i // 3, WOOD[1])
            head = d.part(edge=m[2])
            tipx, tipy = ax - length, hy - (length - 1) // 3
            for y in range(tipy - 2, tipy + 2 + (1 if shape == 'greataxe' else 0)):
                span(head, y, tipx - 1, tipx, m)
        elif shape == 'dagger':
            for x, y in ((ax - 1, hy + 1), (ax - 2, hy + 1), (ax - 3, hy + 2)):
                put(p, x, y, m[0])
        elif shape == 'mace':
            for y in range(hy - 4, hy + 2):
                put(p, ax - 1, y, WOOD[1])
            head = d.part(edge=m[2])
            span(head, hy - 6, ax - 2, ax, m)
            span(head, hy - 5, ax - 2, ax, m)
            put(head, ax - 1, hy - 7, (g.trim or m)[0])
        elif shape == 'staff':
            hx0 = 12 - (self.b.head_w - 1) // 2 - 1
            tx, ty = hx0 - 2, r['head_top'] - 2
            line(p, ax, FEET_Y, tx, ty, m[1])
            orb = g.trim or PURPLE
            head = d.part()
            span(head, ty - 2, tx - 1, tx, orb)
            span(head, ty - 1, tx - 2, tx + 1, orb)
            put(head, tx - 1, ty - 1, GLOW)
        elif shape == 'bow':
            bx = body_front - 2
            for y in range(hy - 8, hy + 3):
                put(p, bx, y, (232, 228, 214))
            for i, y in enumerate(range(hy - 9, hy + 4)):
                off = 2 if 3 < i < 9 else 1 if 1 < i < 11 else 0
                put(p, bx - off, y, m[1] if off < 2 else m[0])
            span(p, hy, bx, ax - 1, self.skin, 'flat')


# -------------------------------------------------------------- exports

VIEWS = ['down', 'left', 'right', 'up']
# Columns of a sheet: stepA, idle, stepB, breathe.
COLUMNS = [(-1, False), (0, False), (1, False), (0, True)]


def all_frames(race: str, cls: str, look: Look | None = None) -> dict[str, list[Image.Image]]:
    hero = Hero(race, cls, look)
    return {view: [hero.frame(view, s, br) for s, br in COLUMNS] for view in VIEWS}
