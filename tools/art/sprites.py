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
        '.kbnbbk.',
        '.kbnbbk.',
        '.kbnbbk.',
        '.kbnbbk.',
        '.kbnbbk.',
        'kkbnbbkk',
        'kbbnbbbk',
        '.kkkkkk.',
    ])
    overlay(g, trunk, 12, 21)
    canopy = shade_blob(
        size,
        [
            (16, 7.5, 6.5, 5.5),
            (9.5, 11, 6, 5.5),
            (22.5, 11, 6, 5.5),
            (12, 16.5, 6.5, 5),
            (20, 16.5, 6.5, 5),
            (16, 12.5, 8, 7.5),
        ],
        ramp='GghH',
        outline='K',
        thresholds=[0.12, 0.48, 0.8],
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
        ],
        ramp='GghH',
        outline='K',
        thresholds=[0.12, 0.5, 0.82],
    )


def rock() -> Grid:
    return shade_blob(
        (16, 16),
        [
            (8.5, 10.5, 6, 4.2),
            (6.5, 8.5, 3.6, 3.2),
        ],
        ramp='Ssr' 'R',
        outline='T',
        thresholds=[0.05, 0.45, 0.85],
    )


# ------------------------------------------------------------------ hero

_HERO_HEAD_DOWN = [
    '................',
    '.....kkkkkk.....',
    '....kbbnnbbk....',
    '...kbnnnnnnbk...',
    '...kbnNnnnnbk...',
    '...kbbFFFFbbk...',
    '...kFFFFFFFFk...',
    '...kFkFFFFkFk...',
    '...kfFFFFFFfk...',
    '....kfFFFFfk....',
]
_HERO_BODY_DOWN = [
    '...kuuuiiuuuk...',
    '..kukuuuuuukuk..',
    '..kFkbboobbkFk..',
]
_HERO_HEAD_UP = [
    '................',
    '.....kkkkkk.....',
    '....kbbnnbbk....',
    '...kbnnnnnnbk...',
    '...kbnNnnnnbk...',
    '...kbnnnnnnbk...',
    '...kbbnnnnbbk...',
    '...kbbbbbbbbk...',
    '...kFbbbbbbFk...',
    '....kbbbbbbk....',
]
_HERO_BODY_UP = [
    '...kuuuuuuuuk...',
    '..kukuuuuuukuk..',
    '..kFkbbbbbbkFk..',
]
_LEGS_FRONT = {
    'idle': [
        '....kUUUUUUk....',
        '....kBBkkBBk....',
        '.....kk..kk.....',
    ],
    'stepA': [
        '....kUUkkBBk....',
        '....kBBk.kk.....',
        '.....kk.........',
    ],
    'stepB': [
        '....kBBkkUUk....',
        '.....kk.kBBk....',
        '..........kk....',
    ],
}

_HERO_HEAD_LEFT = [
    '................',
    '.....kkkkkk.....',
    '....kbbnnbbk....',
    '...kbnnnnnnbk...',
    '...kbnNnnnnbk...',
    '...kFFFbbbbbk...',
    '...kFkFFFbbbk...',
    '..kFFFFFFFbbk...',
    '...kfFFFFfbbk...',
    '....kfFFfbbk....',
]
_HERO_BODY_LEFT = [
    '....kuuuuuuk....',
    '....kuUUuuuk....',
    '....kbFbbbbk....',
]
_LEGS_SIDE = {
    'idle': [
        '.....kUUUUk.....',
        '.....kBBBBk.....',
        '....kkkkkk......',
    ],
    'stepA': [
        '....kUUkUUk.....',
        '...kBBk.kBBk....',
        '...kkk...kkk....',
    ],
    'stepB': [
        '.....kUUUUk.....',
        '....kBBkBBk.....',
        '....kkk.kkk.....',
    ],
}


def _hero(head: list[str], body: list[str], legs: list[str]) -> Grid:
    return ascii_to_grid(head + body + legs)


def _mirror(g: Grid) -> Grid:
    return [list(reversed(row)) for row in g]


def hero_frames() -> dict[str, list[Grid]]:
    """3-frame walk per direction: [stepA, idle, stepB] (play A, idle, B, idle)."""
    down = [_hero(_HERO_HEAD_DOWN, _HERO_BODY_DOWN, _LEGS_FRONT[k]) for k in ('stepA', 'idle', 'stepB')]
    up = [_hero(_HERO_HEAD_UP, _HERO_BODY_UP, _LEGS_FRONT[k]) for k in ('stepB', 'idle', 'stepA')]
    left = [_hero(_HERO_HEAD_LEFT, _HERO_BODY_LEFT, _LEGS_SIDE[k]) for k in ('stepA', 'idle', 'stepB')]
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
        '......kkkk......',
        '....kkvvcckk....',
        '...kvWvccccck...',
        '..kcvvccccccck..',
        '..kcckcccckcck..',
        '..kcckcccckcck..',
        '..kCcccccccCck..',
        '..kCCccccccCCk..',
        '...kCCCCCCCCk...',
        '....kkkkkkkk....',
        '................',
    ],
    [
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '......kkkk......',
        '....kkvvcckk....',
        '..kkvWvcccccck..',
        '.kcvvcckcccckck.',
        '.kccccckcccckck.',
        '.kCCcccccccccCk.',
        '.kCCCccccccCCCk.',
        '..kCCCCCCCCCCk..',
        '...kkkkkkkkkk...',
        '................',
    ],
]


# ----------------------------------------------------------------- items

POTION = [
    '................',
    '................',
    '......kkkk......',
    '......kNNk......',
    '......kbbk......',
    '......kRRk......',
    '.....kkRRkk.....',
    '....kyxxxxxk....',
    '...kyWxxxxxxk...',
    '...kyxxxxxxxk...',
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
    '................',
    '..kkkkkkkkkkkk..',
    '..knNNNNNNNNnk..',
    '..knnnnnnnnnnk..',
    '..kOOOOOOOOOOk..',
    '..kbbbboobbbbk..',
    '..kbbbbOObbbbk..',
    '..knnnnnnnnnnk..',
    '..knnnnnnnnnnk..',
    '..kbbbbbbbbbbk..',
    '..kBBBBBBBBBBk..',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
]
