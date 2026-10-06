"""Fixed palette shared by every sprite, so all generated art stays coherent.

Each entry is a single character used in the ASCII pixel grids (sprites.py)
mapped to an RGBA colour. '.' is fully transparent.
"""

PALETTE: dict[str, tuple[int, int, int, int]] = {
    '.': (0, 0, 0, 0),
    # Outlines
    'k': (34, 28, 41, 255),  # character/object outline
    'K': (22, 52, 38, 255),  # foliage outline
    # Foliage greens (dark -> highlight)
    'G': (36, 84, 52, 255),
    'g': (58, 126, 60, 255),
    'h': (104, 172, 68, 255),
    'H': (168, 214, 92, 255),
    # Ground grass
    'q': (70, 134, 58, 255),
    'w': (92, 158, 64, 255),
    'e': (130, 190, 80, 255),
    # Browns (dark -> tan)
    'B': (72, 44, 34, 255),
    'b': (118, 76, 46, 255),
    'n': (168, 114, 68, 255),
    'N': (214, 168, 110, 255),
    # Stone greys (dark -> highlight)
    'S': (66, 68, 84, 255),
    's': (112, 116, 132, 255),
    'r': (162, 166, 178, 255),
    'R': (212, 216, 222, 255),
    'T': (40, 40, 54, 255),  # stone outline
    # Skin
    'f': (196, 122, 90, 255),
    'F': (240, 180, 138, 255),
    # Blues (hero tunic)
    'U': (34, 56, 114, 255),
    'u': (50, 96, 176, 255),
    'i': (98, 150, 222, 255),
    # Reds
    'X': (122, 28, 44, 255),
    'x': (198, 52, 58, 255),
    'y': (242, 114, 100, 255),
    # Golds / yellows
    'O': (172, 112, 30, 255),
    'o': (238, 188, 60, 255),
    'Y': (252, 236, 140, 255),
    # Purples
    'P': (92, 52, 128, 255),
    'p': (152, 94, 188, 255),
    # Teals (slime)
    'C': (28, 100, 118, 255),
    'c': (52, 164, 172, 255),
    'v': (138, 222, 214, 255),
    'W': (248, 248, 238, 255),
}
