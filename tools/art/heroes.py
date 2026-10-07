"""Paper-doll generator for the 25 playable heroes (5 races x 5 classes).

Every sprite is composed from parts drawn by code at native resolution
(1 art pixel = 1 game pixel in the world, like the 16px ground tiles):
the body comes from the race (skin, height, build, ears, beard, tusks), the
clothes and headgear from the class, then the class weapon. Parts are
layered, each part gets a darker edge where it overlaps the one beneath,
and the whole silhouette gets a 1px dark outline.

Views: 'down' (front), 'up' (back), 'left', 'right' (mirror of left), three
frames each [stepA, idle, stepB]. The portrait and the large views used by
the interface are taken from these same frames, so every screen shows the
same hero.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from PIL import Image

W, H = 24, 32
FEET_Y = 30  # last row of the boots
OUTLINE = (34, 28, 41)

RGB = tuple[int, int, int]
Tones = tuple[RGB, RGB, RGB]  # light, mid, dark

# ------------------------------------------------------------------ colors

SKIN: dict[str, Tones] = {
    'human': ((248, 196, 152), (232, 164, 120), (190, 118, 86)),
    'elf': ((252, 222, 194), (238, 196, 162), (198, 148, 118)),
    'dwarf': ((242, 178, 136), (222, 142, 104), (172, 98, 74)),
    'orc': ((156, 196, 100), (114, 162, 74), (72, 112, 52)),
    'halfling': ((250, 202, 152), (236, 170, 122), (194, 124, 88)),
}
HAIR: dict[str, Tones] = {
    'human': ((200, 128, 70), (158, 90, 50), (112, 58, 38)),
    'elf': ((252, 240, 180), (232, 204, 126), (180, 148, 88)),
    'dwarf': ((238, 124, 62), (198, 82, 42), (138, 50, 30)),
    'orc': ((96, 86, 104), (62, 54, 72), (40, 34, 48)),
    'halfling': ((182, 112, 62), (142, 82, 44), (100, 56, 32)),
}
METAL: Tones = ((222, 226, 232), (166, 170, 182), (110, 114, 130))
GOLD: Tones = ((252, 236, 140), (238, 188, 60), (172, 112, 30))
LEATHER: Tones = ((168, 114, 68), (118, 76, 46), (78, 48, 34))
WOOD: Tones = ((190, 132, 78), (140, 92, 54), (92, 58, 36))
RED: Tones = ((242, 114, 100), (198, 52, 58), (122, 28, 44))
BLUE: Tones = ((106, 158, 226), (56, 100, 180), (34, 58, 116))
GREEN: Tones = ((156, 206, 88), (98, 160, 66), (54, 112, 58))
DARK: Tones = ((104, 100, 124), (70, 66, 90), (44, 42, 58))
WHITE: Tones = ((250, 250, 242), (224, 220, 208), (172, 168, 164))
PURPLE: Tones = ((196, 140, 232), (152, 94, 188), (92, 52, 128))
EYE: RGB = (34, 28, 41)
TUSK: RGB = (250, 246, 226)


# ------------------------------------------------------------------- races

@dataclass(frozen=True)
class Build:
    head_w: int
    head_h: int
    torso_w: int
    torso_h: int
    legs_h: int
    leg_w: int


BUILDS: dict[str, Build] = {
    'human': Build(head_w=10, head_h=9, torso_w=10, torso_h=8, legs_h=8, leg_w=4),
    'elf': Build(head_w=9, head_h=9, torso_w=8, torso_h=8, legs_h=9, leg_w=3),
    'orc': Build(head_w=10, head_h=9, torso_w=12, torso_h=9, legs_h=8, leg_w=5),
    'dwarf': Build(head_w=10, head_h=9, torso_w=12, torso_h=7, legs_h=5, leg_w=5),
    'halfling': Build(head_w=9, head_h=8, torso_w=8, torso_h=6, legs_h=5, leg_w=3),
}

RACES = ['human', 'elf', 'dwarf', 'orc', 'halfling']
CLASSES = ['warrior', 'mage', 'archer', 'rogue', 'cleric']


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
        # Edge where a part covers an earlier (lower) one.
        final = dict(color)
        for (x, y), i in owner.items():
            edge = self.parts[i].edge
            if edge is None:
                continue
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                j = owner.get((nx, ny))
                if j is not None and j < i:
                    final[(x, y)] = edge
                    break
        im = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        px = im.load()
        for (x, y), c in final.items():
            px[x, y] = (*c, 255)
        # 1px outline around the silhouette.
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
    """Fills x0..x1 on row y: light on the left edge, dark on the right."""
    for x in range(x0, x1 + 1):
        c = tones[1]
        if shade == 'lr':
            if x == x0:
                c = tones[0]
            elif x == x1:
                c = tones[2]
        elif shade == 'flat':
            pass
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

@dataclass
class Frame:
    view: str  # down / up / left
    step: int  # -1, 0, +1


class Hero:
    def __init__(self, race: str, cls: str) -> None:
        self.race = race
        self.cls = cls
        self.b = BUILDS[race]
        self.skin = SKIN[race]
        self.hair = HAIR[race]

    # Vertical layout, from the feet up.
    def rows(self, bob: int = 0) -> dict[str, int]:
        b = self.b
        legs_top = FEET_Y - b.legs_h + 1
        torso_top = legs_top - b.torso_h + bob
        head_top = torso_top - b.head_h + 1
        return {'legs_top': legs_top, 'torso_top': torso_top, 'head_top': head_top}

    def robe(self) -> bool:
        return self.cls in ('mage', 'cleric')

    def outfit(self) -> tuple[Tones, Tones]:
        """Main and accent cloth for the class."""
        return {
            'warrior': (METAL, RED),
            'mage': (BLUE, GOLD),
            'archer': (GREEN, LEATHER),
            'rogue': (DARK, RED),
            'cleric': (WHITE, GOLD),
        }[self.cls]

    # ------------------------------------------------------------ front/back

    def draw_front(self, step: int, back: bool) -> Image.Image:
        d = Doll()
        b = self.b
        cx = 12
        bob = 0 if step == 0 else 1
        r = self.rows(bob)
        main, accent = self.outfit()

        # Legs.
        legs = d.part(edge=None)
        lw = b.leg_w
        left_x = cx - 1 - lw  # viewer's left leg
        right_x = cx + 1
        for side, x0 in ((-1, left_x), (1, right_x)):
            lift = 1 if (step != 0 and side == step) else 0
            for y in range(r['legs_top'], FEET_Y + 1 - lift):
                boot = y >= FEET_Y - 1 - lift
                if boot:
                    tones = self.boots()
                else:
                    tones = main if self.robe() else self.pants()
                span(legs, y, x0, x0 + lw - 1, tones)
        if self.robe():
            # The robe covers the legs down to the boots.
            skirt = d.part(edge=main[2])
            for y in range(r['legs_top'], FEET_Y - 1):
                spread = (y - r['legs_top']) // 3
                span(skirt, y, cx - b.torso_w // 2 - spread, cx + b.torso_w // 2 - 1 + spread, main)
            hem = FEET_Y - 2
            span(skirt, hem, cx - b.torso_w // 2 - (hem - r['legs_top']) // 3, cx + b.torso_w // 2 - 1 + (hem - r['legs_top']) // 3, accent, 'flat')

        # Torso.
        torso = d.part(edge=main[2])
        tw = b.torso_w
        for i, y in enumerate(range(r['torso_top'], r['legs_top'])):
            inset = 1 if i == 0 else 0
            span(torso, y, cx - tw // 2 + inset, cx + tw // 2 - 1 - inset, main)
        self.torso_details(d, r, back)

        # Arms (with a slight swing while walking).
        arms = d.part(edge=main[2])
        for side in (-1, 1):
            swing = -step * side if step else 0
            x0 = cx - tw // 2 - 2 if side < 0 else cx + tw // 2
            top = r['torso_top'] + 1
            bottom = r['legs_top'] + 1 + swing
            for y in range(top, bottom):
                span(arms, y, x0, x0 + 1, self.sleeve())
            hand = d.part(edge=None)
            span(hand, bottom, x0, x0 + 1, self.skin)
            if back is False and side < 0:
                self.hand_main = (x0, bottom)
            if back is False and side > 0:
                self.hand_off = (x0, bottom)
            if back and side > 0:
                self.hand_main = (x0, bottom)
            if back and side < 0:
                self.hand_off = (x0, bottom)

        # Head.
        self.draw_head_front(d, r, back)
        if back:
            self.back_items(d, r)

        if not back:
            self.front_items(d, r)
        else:
            self.back_held(d, r)
        return d.render()

    def boots(self) -> Tones:
        return self.skin if self.race == 'halfling' else LEATHER

    def pants(self) -> Tones:
        return {'warrior': DARK, 'archer': LEATHER, 'rogue': DARK}.get(self.cls, LEATHER)

    def sleeve(self) -> Tones:
        main, _ = self.outfit()
        return main

    def torso_details(self, d: Doll, r: dict[str, int], back: bool) -> None:
        b = self.b
        cx = 12
        main, accent = self.outfit()
        det = d.part()
        top, bottom = r['torso_top'], r['legs_top'] - 1
        belt = bottom - 1
        if self.cls == 'warrior':
            # Red tabard down the middle, steel pauldrons.
            for y in range(top + 2, bottom + 1):
                span(det, y, cx - 2, cx + 1, accent)
            span(det, belt, cx - b.torso_w // 2 + 1, cx + b.torso_w // 2 - 2, LEATHER, 'flat')
            if not back:
                put(det, cx - 1, belt, GOLD[1])
                put(det, cx, belt, GOLD[1])
        elif self.cls == 'mage':
            if not back:
                for y in range(top + 1, bottom + 1):
                    put(det, cx - 1, y, accent[1])
            span(det, belt, cx - b.torso_w // 2 + 1, cx + b.torso_w // 2 - 2, accent, 'flat')
        elif self.cls == 'archer':
            span(det, belt, cx - b.torso_w // 2 + 1, cx + b.torso_w // 2 - 2, LEATHER, 'flat')
            # Quiver strap across the chest.
            for i in range(b.torso_h - 1):
                put(det, cx - b.torso_w // 2 + 1 + i if not back else cx + b.torso_w // 2 - 2 - i, top + i, LEATHER[2])
        elif self.cls == 'rogue':
            span(det, belt, cx - b.torso_w // 2 + 1, cx + b.torso_w // 2 - 2, LEATHER, 'flat')
            put(det, cx + 1, belt, GOLD[1])
            if not back:
                # Red scarf at the neck.
                span(det, top, cx - 2, cx + 1, accent, 'flat')
                put(det, cx + 1, top + 1, accent[2])
        elif self.cls == 'cleric':
            for y in range(top + 1, bottom + 1):
                if not back:
                    put(det, cx - 1, y, accent[1])
                    put(det, cx, y, accent[1])
            if not back:
                # Holy symbol on the chest.
                put(det, cx - 1, top + 2, accent[0])
                put(det, cx, top + 2, accent[0])
            span(det, belt, cx - b.torso_w // 2 + 1, cx + b.torso_w // 2 - 2, accent, 'flat')

    def draw_head_front(self, d: Doll, r: dict[str, int], back: bool) -> None:
        b = self.b
        cx = 12
        top = r['head_top']
        hw, hh = b.head_w, b.head_h
        x0 = cx - hw // 2
        x1 = x0 + hw - 1
        head = d.part(edge=self.skin[2])
        for i in range(hh):
            inset = 2 if i == 0 else 1 if i in (1, hh - 1) else 0
            span(head, top + i, x0 + inset, x1 - inset, self.skin)
        # Ears.
        ear = d.part(edge=None)
        ey = top + hh // 2
        if self.race == 'elf':
            put(ear, x0 - 1, ey, self.skin[1])
            put(ear, x0 - 2, ey - 1, self.skin[0])
            put(ear, x1 + 1, ey, self.skin[1])
            put(ear, x1 + 2, ey - 1, self.skin[2])
        else:
            put(ear, x0 - 1, ey, self.skin[1])
            put(ear, x1 + 1, ey, self.skin[2])
        hair = d.part(edge=self.hair[2])
        if back:
            # Back of the head: hair over everything.
            for i in range(hh - 1):
                inset = 2 if i == 0 else 1 if i in (1,) else 0
                span(hair, top + i, x0 + inset, x1 - inset, self.hair)
        else:
            # Fringe and sides.
            span(hair, top, x0 + 2, x1 - 2, self.hair)
            span(hair, top + 1, x0 + 1, x1 - 1, self.hair)
            span(hair, top + 2, x0, x1, self.hair)
            put(hair, x0 + 2, top + 3, self.hair[1])
            put(hair, x1 - 3, top + 3, self.hair[1])
            for y in range(top + 3, top + hh - 2):
                put(hair, x0, y, self.hair[1])
                put(hair, x1, y, self.hair[2])
            if self.race == 'elf':
                # Long hair down the back.
                for y in range(top + hh - 2, top + hh + 2):
                    put(hair, x0, y, self.hair[1])
                    put(hair, x1, y, self.hair[2])
            # Eyes.
            face = d.part()
            eye_y = top + hh // 2 + (0 if hh >= 9 else 0)
            for ex in (cx - 2, cx + 1):
                put(face, ex, eye_y, EYE)
                put(face, ex, eye_y - 1, EYE)
            if self.race == 'orc':
                put(face, cx - 2, top + hh - 2, TUSK)
                put(face, cx + 1, top + hh - 2, TUSK)
                # Heavy brow.
                put(face, cx - 3, eye_y - 1, self.skin[2])
                put(face, cx + 2, eye_y - 1, self.skin[2])
            if self.race == 'halfling':
                put(face, cx - 3, eye_y + 1, (240, 140, 120))
                put(face, cx + 2, eye_y + 1, (240, 140, 120))
            if self.race == 'dwarf':
                beard = d.part(edge=self.hair[2])
                for i, y in enumerate(range(eye_y + 1, top + hh + 4)):
                    w = hw - 2 - max(0, i - 3) * 2
                    if w <= 0:
                        break
                    span(beard, y, cx - w // 2, cx - w // 2 + w - 1, self.hair)
                put(beard, cx - 1, eye_y + 2, self.skin[1])  # mouth gap
                put(beard, cx, eye_y + 2, self.skin[2])
        self.headgear_front(d, r, back)
        # Race marks stay visible over any hood or helm.
        marks = d.part(edge=None)
        if self.race == 'elf':
            put(marks, x0 - 1, ey, self.skin[1])
            put(marks, x0 - 2, ey - 1, self.skin[0])
            put(marks, x1 + 1, ey, self.skin[1])
            put(marks, x1 + 2, ey - 1, self.skin[2])
        if self.race == 'orc' and not back:
            put(marks, cx - 2, top + hh - 2, TUSK)
            put(marks, cx + 1, top + hh - 2, TUSK)

    def headgear_front(self, d: Doll, r: dict[str, int], back: bool) -> None:
        b = self.b
        cx = 12
        top = r['head_top']
        hw = b.head_w
        x0 = cx - hw // 2
        x1 = x0 + hw - 1
        main, accent = self.outfit()
        g = d.part(edge=None)
        if self.cls == 'warrior':
            # Open steel helm.
            span(g, top - 1, x0 + 2, x1 - 2, METAL)
            span(g, top, x0 + 1, x1 - 1, METAL)
            span(g, top + 1, x0, x1, METAL)
            span(g, top + 2, x0, x1, METAL)
            if not back:
                put(g, cx - 1, top + 3, METAL[2])  # nose guard
                put(g, cx, top + 3, METAL[1])
                for y in range(top + 3, top + 5):
                    put(g, x0, y, METAL[1])
                    put(g, x1, y, METAL[2])
            else:
                for y in range(top + 3, top + b.head_h - 2):
                    span(g, y, x0, x1, METAL)
            span(g, top + 2, x0, x1, METAL, 'dark') if False else None
        elif self.cls == 'mage':
            # Pointed hat with a gold band.
            tip = top - 6
            for i, y in enumerate(range(tip, top + 1)):
                w = 1 + i
                lean = 2 - i // 2 if i < 4 else 0
                span(g, y, cx - w // 2 + lean, cx - w // 2 + lean + w - 1, main)
            span(g, top + 1, x0 - 1, x1 + 1, main)
            span(g, top, x0 + 1, x1 - 1, accent, 'flat')
        elif self.cls in ('archer', 'rogue'):
            # Hood framing the face (rogue adds a mask).
            span(g, top - 1, x0 + 2, x1 - 2, main)
            span(g, top, x0 + 1, x1 - 1, main)
            span(g, top + 1, x0, x1, main)
            span(g, top + 2, x0, x1, main)  # over the forehead
            for y in range(top + 2, top + b.head_h):
                put(g, x0, y, main[0])
                put(g, x0 - 1, y, main[1]) if y > top + 3 else None
                put(g, x1, y, main[2])
                put(g, x1 + 1, y, main[2]) if y > top + 3 else None
            if back:
                for y in range(top + 2, top + b.head_h + 1):
                    span(g, y, x0, x1, main)
            elif self.cls == 'rogue':
                # Mask over nose and mouth; the eyes stay in a skin band.
                mask_y = top + b.head_h // 2 + 1
                for y in range(mask_y, top + b.head_h):
                    span(g, y, x0 + 1, x1 - 1, RED if y == mask_y else main)
        elif self.cls == 'cleric':
            # Gold circlet over the hair.
            if not back:
                span(g, top + 2, x0 + 1, x1 - 1, accent, 'flat')
                put(g, cx - 1, top + 2, (110, 200, 230))
            else:
                span(g, top + 2, x0 + 1, x1 - 1, accent, 'flat')

    # ----------------------------------------------------------- weapons

    def front_items(self, d: Doll, r: dict[str, int]) -> None:
        hx, hy = self.hand_main
        ox, oy = self.hand_off
        w = d.part(edge=None)
        if self.cls == 'warrior':
            # Sword held upright beside the right arm, round shield on the left.
            bx = hx - 1
            span(w, hy - 1, bx - 1, bx + 1, GOLD, 'flat')
            put(w, bx, hy, LEATHER[1])
            for y in range(hy - 9, hy - 1):
                put(w, bx, y, METAL[0] if y < hy - 2 else METAL[1])
            put(w, bx, hy - 10, METAL[1])
            sh = d.part(edge=RED[2])
            sy = r['torso_top'] + 1
            sx = ox - 1
            for i in range(7):
                inset = 1 if i in (0, 6) else 0
                span(sh, sy + i, sx + inset, sx + 5 - inset, RED)
            for i in range(1, 6):
                put(sh, sx + 2, sy + i, GOLD[1])
            span(sh, sy + 3, sx + 1, sx + 4, GOLD, 'flat')
        elif self.cls in ('mage',):
            # Staff, gem above the head.
            top = r['head_top'] - 4
            for y in range(top + 2, FEET_Y + 1):
                put(w, hx, y, WOOD[1])
                put(w, hx + 1, y, WOOD[2])
            gem = d.part(edge=None)
            span(gem, top, hx, hx + 1, PURPLE)
            span(gem, top + 1, hx - 1, hx + 2, PURPLE)
            put(gem, hx, top + 1, (240, 220, 255))
        elif self.cls == 'cleric':
            # Mace.
            for y in range(hy - 4, hy + 2):
                put(w, hx, y, WOOD[1])
            head = d.part(edge=None)
            span(head, hy - 6, hx - 1, hx + 1, METAL)
            span(head, hy - 5, hx - 1, hx + 1, METAL)
            put(head, hx, hy - 7, METAL[0])
        elif self.cls == 'archer':
            # Bow in the left hand, feathers over the shoulder.
            bx = ox + 2
            top = oy - 9
            for i, y in enumerate(range(top, oy + 4)):
                off = 1 if 2 < i < 10 else 0
                put(w, bx + off, y, WOOD[1])
            for y in range(top + 1, oy + 3):
                put(w, bx - 1, y, (230, 226, 210))
            fe = d.part(edge=None)
            put(fe, 12 + self.b.torso_w // 2 - 1, r['torso_top'] - 1, RED[1])
            put(fe, 12 + self.b.torso_w // 2, r['torso_top'] - 2, WHITE[0])
        elif self.cls == 'rogue':
            # Two daggers, blades pointing down and outward.
            mx, my = self.hand_main
            fx, fy = self.hand_off
            for x, y in ((mx - 1, my + 1), (mx - 1, my + 2), (mx - 2, my + 3)):
                put(w, x, y, METAL[0])
            for x, y in ((fx + 2, fy + 1), (fx + 2, fy + 2), (fx + 3, fy + 3)):
                put(w, x, y, METAL[0])

    def back_items(self, d: Doll, r: dict[str, int]) -> None:
        if self.cls == 'archer':
            # Quiver slung across the back, feathers over the shoulder.
            q = d.part(edge=LEATHER[2])
            x = 12 + 1
            for y in range(r['torso_top'] - 1, r['legs_top']):
                span(q, y, x, x + 2, LEATHER)
            put(q, x, r['torso_top'] - 2, RED[1])
            put(q, x + 1, r['torso_top'] - 3, WHITE[0])
            put(q, x + 2, r['torso_top'] - 2, RED[0])

    def back_held(self, d: Doll, r: dict[str, int]) -> None:
        hx, hy = self.hand_main
        ox, oy = self.hand_off
        w = d.part(edge=None)
        if self.cls == 'warrior':
            for y in range(hy + 1, min(H - 1, hy + 7)):
                put(w, hx, y, METAL[1])
                put(w, hx + 1, y, METAL[2])
            sh = d.part(edge=RED[2])
            sy = r['torso_top'] + 1
            sx = ox - 3
            for i in range(7):
                inset = 1 if i in (0, 6) else 0
                span(sh, sy + i, sx + inset, sx + 5 - inset, WOOD)
        elif self.cls == 'mage':
            top = r['head_top'] - 4
            for y in range(top + 2, FEET_Y + 1):
                put(w, hx, y, WOOD[1])
            span(w, top, hx, hx + 1, PURPLE)
            span(w, top + 1, hx - 1, hx + 2, PURPLE)
        elif self.cls == 'cleric':
            for y in range(hy - 4, hy + 2):
                put(w, hx, y, WOOD[1])
            span(w, hy - 6, hx - 1, hx + 1, METAL)
            span(w, hy - 5, hx - 1, hx + 1, METAL)
        elif self.cls == 'archer':
            for y in range(oy - 9, oy + 4):
                put(w, ox - 1, y, WOOD[1])
        elif self.cls == 'rogue':
            for hxx, hyy in (self.hand_main, self.hand_off):
                for y in range(hyy + 1, hyy + 4):
                    put(w, hxx, y, METAL[1])

    # ------------------------------------------------------------- views

    def frame(self, view: str, step: int) -> Image.Image:
        if view == 'down':
            return self.draw_front(step, back=False)
        if view == 'up':
            return self.draw_front(step, back=True)
        if view == 'left':
            return self.draw_side(step)
        if view == 'right':
            return self.draw_side(step).transpose(Image.FLIP_LEFT_RIGHT)
        raise ValueError(view)

    def draw_side(self, step: int) -> Image.Image:
        """Facing left. Back leg/arm darker, front ones lighter."""
        d = Doll()
        b = self.b
        cx = 12
        bob = 0 if step == 0 else 1
        r = self.rows(bob)
        main, accent = self.outfit()
        depth = b.torso_w - 2  # body thickness seen from the side
        x0 = cx - depth // 2
        x1 = x0 + depth - 1
        lw = b.leg_w

        # Behind the body: shield on the back arm, quiver on the back.
        if self.cls == 'warrior':
            sh = d.part(edge=RED[2])
            sy = r['torso_top'] + 1
            for i in range(7):
                inset = 1 if i in (0, 6) else 0
                span(sh, sy + i, x1 - 1 + inset, x1 + 2 - inset, RED)
        if self.cls == 'archer':
            q = d.part(edge=LEATHER[2])
            for y in range(r['torso_top'] - 2, r['legs_top']):
                span(q, y, x1, x1 + 2, LEATHER)
            put(q, x1 + 1, r['torso_top'] - 3, RED[1])
            put(q, x1 + 2, r['torso_top'] - 3, WHITE[0])

        # Legs: the back one in shadow; a stride of 2px each way.
        for leg, off in ((0, 2 * step), (1, -2 * step)):
            p = d.part(edge=None if leg == 0 else OUTLINE)
            lx = cx - lw // 2 + off
            for y in range(r['legs_top'], FEET_Y + 1):
                boot = y >= FEET_Y - 1
                tones = self.boots() if boot else LEATHER if self.robe() else self.pants()
                span(p, y, lx, lx + lw - 1, tones, 'dark' if leg == 0 else 'lr')
            put(p, lx - 1, FEET_Y, self.boots()[2] if leg == 0 else self.boots()[1])  # toe
        if self.robe():
            skirt = d.part(edge=main[2])
            for y in range(r['legs_top'], FEET_Y - 1):
                spread = (y - r['legs_top']) // 3
                span(skirt, y, x0 - spread, x1 + spread, main)
            hem = FEET_Y - 2
            spread = (hem - r['legs_top']) // 3
            span(skirt, hem, x0 - spread, x1 + spread, accent, 'flat')

        torso = d.part(edge=main[2])
        for i, y in enumerate(range(r['torso_top'], r['legs_top'])):
            span(torso, y, x0 + (1 if i == 0 else 0), x1, main)
        det = d.part()
        belt = r['legs_top'] - 2
        span(det, belt, x0, x1, accent if self.robe() else LEATHER, 'flat')
        if self.cls == 'warrior':
            for y in range(r['torso_top'] + 2, r['legs_top']):
                span(det, y, x0, x0 + 1, accent, 'flat')
        elif self.cls == 'rogue':
            span(det, r['torso_top'], x0, x0 + 2, accent, 'flat')
        elif self.cls == 'cleric':
            for y in range(r['torso_top'] + 1, r['legs_top']):
                put(det, x0, y, accent[1])

        # Head in profile.
        top = r['head_top']
        hh = b.head_h
        hw = b.head_w - 1
        hx0 = cx - hw // 2 - 1
        hx1 = hx0 + hw - 1
        head = d.part(edge=self.skin[2])
        for i in range(hh):
            inset = 2 if i == 0 else 1 if i in (1, hh - 1) else 0
            span(head, top + i, hx0 + inset, hx1 - inset, self.skin)
        eye_y = top + hh // 2
        put(head, hx0 - 1, eye_y + 1, self.skin[1])  # nose
        hair = d.part(edge=self.hair[2])
        span(hair, top, hx0 + 2, hx1 - 2, self.hair)
        span(hair, top + 1, hx0 + 1, hx1 - 1, self.hair)
        span(hair, top + 2, hx0 + 1, hx1, self.hair)
        for y in range(top + 3, top + hh - 1):
            span(hair, y, hx1 - 3, hx1, self.hair)
        if self.race == 'elf':
            for y in range(top + hh - 1, top + hh + 3):
                span(hair, y, hx1 - 2, hx1, self.hair)
        face = d.part()
        put(face, hx0 + 1, eye_y, EYE)
        put(face, hx0 + 1, eye_y - 1, EYE)
        if self.race == 'elf':
            put(face, hx1 - 3, eye_y, self.skin[1])
            put(face, hx1 - 2, eye_y - 1, self.skin[1])
            put(face, hx1 - 1, eye_y - 2, self.skin[0])
        else:
            put(face, hx1 - 3, eye_y, self.skin[2])
        if self.race == 'orc':
            put(face, hx0, top + hh - 2, TUSK)
        if self.race == 'halfling':
            put(face, hx0 + 2, eye_y + 1, (240, 140, 120))
        if self.race == 'dwarf':
            beard = d.part(edge=self.hair[2])
            for i, y in enumerate(range(eye_y + 1, top + hh + 4)):
                w = 5 - max(0, i - 3)
                if w <= 0:
                    break
                span(beard, y, hx0 - (1 if i < 3 else 0), hx0 - (1 if i < 3 else 0) + w - 1, self.hair)

        g = d.part()
        if self.cls == 'warrior':
            span(g, top - 1, hx0 + 2, hx1 - 1, METAL)
            span(g, top, hx0 + 1, hx1, METAL)
            span(g, top + 1, hx0, hx1, METAL)
            span(g, top + 2, hx0, hx1, METAL)
            for y in range(top + 3, top + hh - 2):
                span(g, y, hx1 - 2, hx1, METAL)
        elif self.cls == 'mage':
            for i, y in enumerate(range(top - 6, top + 1)):
                w = 1 + i
                lean = 3 - min(i, 3)
                span(g, y, cx - w // 2 + lean, cx - w // 2 + lean + w - 1, main)
            span(g, top + 1, hx0 - 1, hx1 + 1, main)
            span(g, top, hx0 + 1, hx1 - 1, accent, 'flat')
        elif self.cls in ('archer', 'rogue'):
            span(g, top - 1, hx0 + 2, hx1 - 1, main)
            span(g, top, hx0 + 1, hx1, main)
            span(g, top + 1, hx0, hx1 + 1, main)
            for y in range(top + 2, top + hh + 1):
                span(g, y, hx1 - 3, hx1 + 1, main)
            if self.cls == 'rogue':
                for y in range(eye_y + 1, top + hh):
                    span(g, y, hx0 - 1, hx1 - 3, RED if y == eye_y + 1 else main)
        elif self.cls == 'cleric':
            span(g, top + 2, hx0 + 1, hx1, GOLD, 'flat')

        marks = d.part()
        if self.race == 'elf':
            put(marks, hx1 - 2, eye_y - 1, self.skin[1])
            put(marks, hx1 - 1, eye_y - 2, self.skin[0])
        if self.race == 'orc':
            put(marks, hx0, top + hh - 2, TUSK)

        # Front arm, swinging, with the weapon.
        arm = d.part(edge=main[2])
        ax = cx - 1 - step
        hy = r['legs_top'] + 1
        for y in range(r['torso_top'] + 1, hy):
            span(arm, y, ax, ax + 1, self.sleeve())
        hand = d.part()
        span(hand, hy, ax, ax + 1, self.skin)
        w = d.part()
        if self.cls == 'warrior':
            # Blade held forward, outside the silhouette.
            put(w, ax - 1, hy - 1, GOLD[1])
            put(w, ax - 1, hy, GOLD[1])
            put(w, ax - 1, hy + 1, GOLD[1])
            for i in range(2, 9):
                put(w, ax - i, hy - (1 if i > 5 else 0), METAL[0] if i < 8 else METAL[1])
        elif self.cls == 'mage':
            # Staff leaning forward, clear of the face.
            tx, ty = hx0 - 2, r['head_top'] - 2
            line(w, ax, FEET_Y, tx, ty, WOOD[1])
            span(w, ty - 2, tx - 1, tx, PURPLE)
            span(w, ty - 1, tx - 2, tx + 1, PURPLE)
            put(w, tx - 1, ty - 1, (240, 220, 255))
        elif self.cls == 'cleric':
            for y in range(hy - 4, hy + 2):
                put(w, ax - 1, y, WOOD[1])
            span(w, hy - 6, ax - 2, ax, METAL)
            span(w, hy - 5, ax - 2, ax, METAL)
            put(w, ax - 1, hy - 7, METAL[0])
        elif self.cls == 'archer':
            # Bow held out in front of the chest: string, then the curved wood.
            bx = x0 - 2
            for y in range(hy - 8, hy + 3):
                put(w, bx, y, (230, 226, 210))
            for i, y in enumerate(range(hy - 9, hy + 4)):
                off = 2 if 3 < i < 9 else 1 if 1 < i < 11 else 0
                put(w, bx - off, y, WOOD[1] if off < 2 else WOOD[0])
            span(w, hy, bx, ax - 1, self.skin, 'flat')  # reaching arm
        elif self.cls == 'rogue':
            for x, y in ((ax - 1, hy + 1), (ax - 2, hy + 1), (ax - 3, hy + 2)):
                put(w, x, y, METAL[0])
        return d.render()


def all_frames(race: str, cls: str) -> dict[str, list[Image.Image]]:
    hero = Hero(race, cls)
    return {view: [hero.frame(view, s) for s in (-1, 0, 1)] for view in ('down', 'up', 'left', 'right')}
