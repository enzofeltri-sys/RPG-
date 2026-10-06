"""Every sprite of the in-house art set, drawn at native 16px-grid scale.

Organic shapes (foliage, bushes, rocks) are generated procedurally by
blob.shade_blob; characters and items are hand-placed ASCII pixel grids
using palette.py's keys. build.py renders all of these to PNG.
"""

from blob import ascii_to_grid, overlay, shade_blob

Grid = list[list[str | None]]

# ---------------------------------------------------------------- ground

GRASS_PLAIN = [
    'wwwwwwwwwwwwwwww',
    'wwwwqwwwwwwwwwww',
    'wwwwwwwwwwwwewww',
    'wwwwwwwwwwwwwwww',
    'wwewwwwwwqwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwqw',
    'wwwwwqwwwwwwwwww',
    'wwwwwwwwwwwewwww',
    'wwwwwwwwwwwwwwww',
    'wqwwwwwwwwwwwwww',
    'wwwwwwwwqwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwewwwwwwwwqw',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
]

GRASS_TUFTS = [
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwewewwwwwwwwww',
    'wwwqeqwwwwwwqwww',
    'wwwwqwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wqwwwwwwwwwwwwww',
    'wwwwwwwwwewewwww',
    'wwwwwwwwwqeqewww',
    'wwwwwwwwwwqwqwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwqwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwqww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
]

GRASS_TALL = [
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwewwewwwwwww',
    'wwwwehwehwwwwwww',
    'wwwweqeeqewwwwww',
    'wwwqeqhqeqwwwwww',
    'wwwqqgqgqqwwwwww',
    'wwwwqqqqqwwwwwww',
    'wwwwwwwwwwwwwqww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wqwwwwwwwwwewwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
]

GRASS_PEBBLES = [
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwqwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwRrwwwwwwwww',
    'wwwwrrsqwwwwwwww',
    'wwwwwqqwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwRwwww',
    'wwqwwwwwwwrsqwww',
    'wwwwwwwwwwwqwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwewwwwwwwww',
    'wwwwwwwwwwwwwwww',
]

GRASS_FLOWERS = [
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwWwwwwwwwwwww',
    'wwwWoWwwwwwwqwww',
    'wwwwWwwwwwwwwwww',
    'wwwwqwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwww',
    'wwqwwwwwwwwwwwww',
    'wwwwwwwwwwwywwww',
    'wwwwwwwwwwyoywww',
    'wwwwwwwwwwwywwww',
    'wwwwwwwwwwwqwwww',
    'wwwwwwwwwwwwwwww',
    'wwwwwwewwwwwwwww',
    'wwwwwwwwwwwwwwww',
]


# ----------------------------------------------------------------- decor

def tree() -> Grid:
    size = (32, 32)
    g: Grid = [[None] * 32 for _ in range(32)]
    trunk = ascii_to_grid([
        '..kbnbbk..',
        '..kbnbbk..',
        '..kbnbbk..',
        '..kbnbBk..',
        '..kbnbBk..',
        '.kkbnbBkk.',
        'kbbbnbbBBk',
        '.kkk..kkk.',
    ])
    overlay(g, trunk, 11, 22)
    canopy = shade_blob(
        size,
        [
            (16, 12, 9, 8.5),
            (16, 5.5, 5, 4),
            (10, 7.5, 5, 4.5),
            (22, 7.5, 5, 4.5),
            (6.5, 12.5, 4.5, 4.5),
            (25.5, 12.5, 4.5, 4.5),
            (9, 18, 5.5, 4),
            (23, 18, 5.5, 4),
            (16, 19.5, 6, 3.5),
        ],
        ramp='GghH',
        outline='K',
        thresholds=[0.12, 0.5, 0.84],
        bottom_darken=0.22,
    )
    overlay(g, canopy, 0, 0)
    return g


def bush() -> Grid:
    return shade_blob(
        (16, 16),
        [
            (5, 10, 3.8, 3.6),
            (11, 10, 3.8, 3.6),
            (8, 7.5, 4.6, 4),
            (8, 11.5, 5, 3),
            (4.5, 7.5, 2.5, 2.4),
            (11.5, 7, 2.6, 2.5),
        ],
        ramp='GghH',
        outline='K',
        thresholds=[0.1, 0.48, 0.8],
        bottom_darken=0.25,
    )


def rock() -> Grid:
    g = shade_blob(
        (16, 16),
        [
            (8.5, 10.5, 6, 4.2),
            (6.5, 8.5, 3.6, 3.2),
            (11, 9, 3, 2.6),
        ],
        ramp='SsrR',
        outline='T',
        thresholds=[0.05, 0.42, 0.82],
        bottom_darken=0.2,
    )
    # A small crack and a moss patch on the lit top-left.
    for x, y, k in [(10, 9, 'S'), (11, 10, 'S'), (11, 11, 'S'), (5, 6, 'g'), (6, 6, 'h'), (7, 6, 'g'), (6, 7, 'g')]:
        if g[y][x] is not None:
            g[y][x] = k
    return g


# ------------------------------------------------------------------ hero
#
# 16x24 frames. Each direction is a 19-row head+torso block plus legs:
# standing frames use 5 leg rows; step frames drop the whole body by 1px
# (weight lands on the leading foot) and use 4 leg rows, so the walk cycle
# [stepA, idle, stepB, idle] bobs naturally instead of gliding.

_DOWN_BODY = [
    '......AA.A......',
    '.....AdAAdA.....',
    '....AadDdDdaA...',
    '...AadDEEDddaA..',
    '..AadEDDddddaA..',
    '..AaddddddddaA..',
    '..AadFdFFdFdaA..',
    '..AaFFFFFFFfaA..',
    '..AaFkFFFFkfaA..',
    '..AlFJFFFFJflA..',
    '...lFFFFFFFfl...',
    '....lfFFFFfl....',
    '....ZxyyxxxZ....',
    '...MiuZxxZuUM...',
    '..MuMiuuuuUMuM..',
    '..MuMiuuuuUMUM..',
    '..lFMbbYobbMfl..',
    '...MiuuuuuUUM...',
    '...MUUUUUUUUM...',
]
_UP_BODY = [
    '......AA.A......',
    '.....AdAAdA.....',
    '....AadDdDdaA...',
    '...AadDEEDddaA..',
    '..AadEDDddddaA..',
    '..AaddDdddddaA..',
    '..AaddadddadaA..',
    '..AadaddaddaaA..',
    '..AaaddaddaaaA..',
    '...AaaAaaAaaA...',
    '....lfFFFFfl....',
    '.....lFFFFl.....',
    '....ZxxxxxxZ....',
    '...MiuZxxZuUM...',
    '..MuMiuZxZuMuM..',
    '..MuMuuZXZuMUM..',
    '..lFMbbbbbbMfl..',
    '...MiuuuuuUUM...',
    '...MUUUUUUUUM...',
]
_FRONT_LEGS_IDLE = [
    '....TmmTTmtT....',
    '....TmtTTmtT....',
    '....AnbAAnbA....',
    '...AnbbAAbbBA...',
    '...AAAA..AAAA...',
]
_FRONT_LEGS_STEP = [
    '....TmmTTmtT....',
    '....TmmTAnbA....',
    '...AnbbAAAAA....',
    '...AAAAA........',
]

_LEFT_BODY = [
    '.......AA.A.....',
    '......AdAAdA....',
    '....AAadDdDdA...',
    '...AadDEEDddaA..',
    '..AadEDDddddddA.',
    '..AdddddddddaA..',
    '..AFdFdddddaaA..',
    '..lFFFFdddddaA..',
    '..lFkFFfddddA...',
    '..lFJFFfdddA....',
    '..FFFFFFfdA.....',
    '...lfFFFlaA.....',
    '...ZxyxxxZZ.....',
    '...MiuuuuMxZ....',
    '...MiUUuuM......',
    '...MiUUuuM......',
    '...MbFlbbM......',
    '...MiuuuuM......',
    '...MUUUUUM......',
]
_SIDE_LEGS_IDLE = [
    '....TmmmT.......',
    '....TmmtT.......',
    '....AnbbA.......',
    '...AnnbbbA......',
    '...AAAAAAA......',
]
_SIDE_LEGS_STEP_A = [
    '...TmmTTmtT.....',
    '..AnbA..AnbA....',
    '.AnnbA..AbbbA...',
    '.AAAAA...AAAA...',
]
_SIDE_LEGS_STEP_B = [
    '...TmtTTmmT.....',
    '..AbbA..AnnA....',
    '.AbbbA..AnnbA...',
    '.AAAAA...AAAA...',
]

_BLANK = '................'


def _mirror_rows(rows: list[str]) -> list[str]:
    return [r[::-1] for r in rows]


def _standing(body: list[str], legs: list[str]) -> Grid:
    return ascii_to_grid(body + legs)


def _stepping(body: list[str], legs: list[str]) -> Grid:
    return ascii_to_grid([_BLANK] + body + legs)


def _mirror(g: Grid) -> Grid:
    return [list(reversed(row)) for row in g]


def hero_frames() -> dict[str, list[Grid]]:
    """3 unique frames per direction: [stepA, idle, stepB].

    Play as stepA, idle, stepB, idle for the walk loop; idle alone to stand.
    """
    down = [
        _stepping(_DOWN_BODY, _FRONT_LEGS_STEP),
        _standing(_DOWN_BODY, _FRONT_LEGS_IDLE),
        _stepping(_DOWN_BODY, _mirror_rows(_FRONT_LEGS_STEP)),
    ]
    up = [
        _stepping(_UP_BODY, _mirror_rows(_FRONT_LEGS_STEP)),
        _standing(_UP_BODY, _FRONT_LEGS_IDLE),
        _stepping(_UP_BODY, _FRONT_LEGS_STEP),
    ]
    left = [
        _stepping(_LEFT_BODY, _SIDE_LEGS_STEP_A),
        _standing(_LEFT_BODY, _SIDE_LEGS_IDLE),
        _stepping(_LEFT_BODY, _SIDE_LEGS_STEP_B),
    ]
    right = [_mirror(f) for f in left]
    return {'down': down, 'up': up, 'left': left, 'right': right}


# --------------------------------------------------------------- monster

SLIME_FRAMES = [
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '......CCCC......',
        '....CCvvccCC....',
        '...CvWWvccccC...',
        '..CcvWvcccccCC..',
        '..CcckcccckccC..',
        '..CccWcccccWcC..',
        '..CcckcccckccC..',
        '..CCcccccccccC..',
        '...CCCccccCCC...',
        '....CCCCCCCC....',
        '................',
    ],
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '......CCCC......',
        '....CCvvccCC....',
        '..CCvWWvcccccC..',
        '.CcvWvcccccccCC.',
        '.CccckcccckcccC.',
        '.CcccWcccccWccC.',
        '.CCcccccccccccC.',
        '..CCCccccccCCC..',
        '...CCCCCCCCCC...',
        '................',
    ],
]


# ----------------------------------------------------------------- items

POTION = [
    '................',
    '................',
    '......kkkk......',
    '......kNnk......',
    '......kbbk......',
    '.....kkRrkk.....',
    '......kRrk......',
    '....kkyxxxkk....',
    '...kyWWxxxxxk...',
    '...kyWxxxxxxk...',
    '...kxxxxxxxXk...',
    '...kxxxxxxXXk...',
    '....kXxxxXXk....',
    '.....kkkkkk.....',
    '................',
    '................',
]

CHEST = [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..ksNNNNNNNNsk..',
    '..knnnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '..ksOOOOOOOOsk..',
    '..kbbbboobbbbk..',
    '..kbbbbOObbbbk..',
    '..knnnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '..kbbbbbbbbbbk..',
    '..ksBBBBBBBBsk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
]
