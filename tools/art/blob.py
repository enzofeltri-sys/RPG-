"""Procedural pixel-art shading for organic shapes (foliage, bushes, rocks).

A shape is a union of "clumps" (circles or ellipses). Each pixel takes the
height of the tallest clump covering it, as if each clump were a small
sphere, so foliage reads as a pile of rounded leaf clusters lit from the
top-left. Lighting is quantized to a short ramp of palette colours, lone
pixels are cleaned up, and a 1px outline is added.
"""

import math

from PIL import Image

from palette import PALETTE

LIGHT = (-0.55, -0.65, 0.52)
_ll = math.sqrt(sum(c * c for c in LIGHT))
LIGHT = tuple(c / _ll for c in LIGHT)


def shade_blob(
    size: tuple[int, int],
    clumps: list[tuple[float, float, float, float]],
    ramp: str,
    outline: str,
    thresholds: list[float],
) -> list[list[str | None]]:
    """clumps: (cx, cy, rx, ry). ramp: palette keys dark -> light.

    Returns a grid of palette keys (None = transparent).
    """
    w, h = size
    grid: list[list[str | None]] = [[None] * w for _ in range(h)]
    band: list[list[int]] = [[-1] * w for _ in range(h)]

    for y in range(h):
        for x in range(w):
            px, py = x + 0.5, y + 0.5
            best = None
            for cx, cy, rx, ry in clumps:
                dx, dy = (px - cx) / rx, (py - cy) / ry
                d2 = dx * dx + dy * dy
                if d2 >= 1:
                    continue
                z = math.sqrt(1 - d2)
                if best is None or z > best[0]:
                    best = (z, dx, dy)
            if best is None:
                continue
            z, dx, dy = best
            # Sphere normal of the winning clump.
            nx, ny, nz = dx, dy, z
            nl = math.sqrt(nx * nx + ny * ny + nz * nz) or 1
            lit = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / nl
            b = 0
            for t in thresholds:
                if lit > t:
                    b += 1
            band[y][x] = min(b, len(ramp) - 1)

    # Remove isolated pixels whose band matches none of their 4 neighbours.
    for _ in range(2):
        for y in range(h):
            for x in range(w):
                b = band[y][x]
                if b < 0:
                    continue
                neigh = [
                    band[y + dy][x + dx]
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                    if 0 <= x + dx < w and 0 <= y + dy < h and band[y + dy][x + dx] >= 0
                ]
                if neigh and b not in neigh:
                    band[y][x] = max(set(neigh), key=neigh.count)

    for y in range(h):
        for x in range(w):
            if band[y][x] >= 0:
                grid[y][x] = ramp[band[y][x]]

    # 1px outline around the shape.
    for y in range(h):
        for x in range(w):
            if grid[y][x] is not None:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx_, ny_ = x + dx, y + dy
                if 0 <= nx_ < w and 0 <= ny_ < h and band[ny_][nx_] >= 0:
                    grid[y][x] = outline
                    break
    return grid


def grid_to_image(grid: list[list[str | None]]) -> Image.Image:
    h = len(grid)
    w = len(grid[0])
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        for x in range(w):
            k = grid[y][x]
            if k is not None and k != '.':
                px[x, y] = PALETTE[k]
    return img


def ascii_to_grid(rows: list[str]) -> list[list[str | None]]:
    width = len(rows[0])
    for i, r in enumerate(rows):
        if len(r) != width:
            raise ValueError(f'row {i} has length {len(r)}, expected {width}: {r!r}')
        for ch in r:
            if ch not in PALETTE:
                raise ValueError(f'unknown palette key {ch!r} in row {i}')
    return [[None if ch == '.' else ch for ch in r] for r in rows]


def overlay(base: list[list[str | None]], top: list[list[str | None]], ox: int, oy: int) -> None:
    for y, row in enumerate(top):
        for x, k in enumerate(row):
            if k is None:
                continue
            ty, tx = oy + y, ox + x
            if 0 <= ty < len(base) and 0 <= tx < len(base[0]):
                base[ty][tx] = k
