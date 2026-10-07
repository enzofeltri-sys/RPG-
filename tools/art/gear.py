"""Maps the game's items to the hero layers they show (visible equipment).

Rule: what you see is what you wear. With nothing equipped a hero wears
their class clothes (plus the class's signature headgear: mage hat, hood,
circlet); each equipped item replaces its layer. The item's family (leather,
guard, marsh, steel, archivist, watcher, shadow, mithril, ritual, garrison)
gives the material, its category and weapon type give the shape, and an
epic or legendary item gets a purple or gold trim. Rings and amulets do not
show (an amulet adds a small glint at the neck).
"""

from __future__ import annotations

from dataclasses import replace

from heroes import (
    BLUE, CHARCOAL, CLOTH_BROWN, DARK_LEATHER, FOREST, GOLD, GREEN, IRON, LEATHER, MITHRIL, PURPLE, RED, STEEL,
    WHITE, WOOD, Gear, Look, Tones,
)

MARSH: Tones = ((150, 160, 96), (102, 114, 68), (62, 72, 48))
WATCH: Tones = ((156, 176, 206), (94, 112, 150), (52, 64, 98))
CRIMSON: Tones = ((226, 104, 100), (156, 44, 54), (92, 26, 38))
EMBER: Tones = ((255, 190, 110), (240, 120, 60), (170, 60, 40))
FROST: Tones = ((200, 240, 255), (110, 190, 232), (60, 120, 180))

# family keyword -> (material, trim)
FAMILIES: list[tuple[str, Tones, Tones | None]] = [
    ('mithril', MITHRIL, STEEL),
    ('shadow', CHARCOAL, PURPLE),
    ('ritual', CRIMSON, GOLD),
    ('watch', WATCH, STEEL),
    ('archivist', PURPLE, GOLD),
    ('garrison', IRON, RED),
    ('bregan', IRON, RED),
    ('guard', IRON, BLUE),
    ('sentry', IRON, BLUE),
    ('patrol', IRON, BLUE),
    ('militia', IRON, None),
    ('steel', STEEL, None),
    ('iron', IRON, None),
    ('marsh', MARSH, None),
    ('smuggler', DARK_LEATHER, RED),
    ('purified', WHITE, GOLD),
    ('order', STEEL, GOLD),
    ('sealed', STEEL, GOLD),
    ('blackened', CHARCOAL, RED),
    ('frost', FROST, None),
    ('flame', EMBER, None),
]

WOODEN = ('branch', 'wicker', 'novice', 'gnarled', 'study', 'short_bow', 'hunting', 'reinforced_bow', 'composite')


def family(base_id: str) -> tuple[Tones | None, Tones | None]:
    for key, mat, trim in FAMILIES:
        if key in base_id:
            return mat, trim
    return None, None


def rarity_trim(rarity: str, trim: Tones | None) -> Tones | None:
    return {'epic': PURPLE, 'legendary': GOLD}.get(rarity, trim)


def item_gear(base_id: str, category: str, weapon_type: str | None, rarity: str = 'common') -> Gear | None:
    mat, trim = family(base_id)
    trim = rarity_trim(rarity, trim)
    if category == 'helmet':
        if 'hood' in base_id:
            return Gear('hood', mat or DARK_LEATHER, trim)
        if 'circlet' in base_id:
            return Gear('circlet', GOLD, trim or BLUE)
        if base_id in ('leather_helmet',):
            return Gear('cap', LEATHER, trim)
        if base_id == 'iron_cap':
            return Gear('cap', IRON, trim)
        return Gear('plumed' if trim else 'helm', mat or IRON, trim)
    if category == 'chest':
        if 'robe' in base_id:
            return Gear('robe', mat if mat else CLOTH_BROWN, trim or GOLD)
        if 'chainmail' in base_id:
            return Gear('chain', IRON, trim)
        if base_id in ('leather_chest',):
            return Gear('leather', LEATHER, trim)
        if 'vest' in base_id or base_id == 'padded_vest':
            return Gear('jerkin', mat or CLOTH_BROWN, trim)
        return Gear('plate', mat or IRON, trim)
    if category == 'legs':
        metal = mat in (IRON, STEEL, MITHRIL, WATCH) or 'greaves' in base_id
        return Gear('greaves' if metal else 'pants', mat or LEATHER, trim)
    if category == 'boots':
        metal = mat in (IRON, STEEL, MITHRIL, WATCH) or 'iron' in base_id
        return Gear('sabatons' if metal else 'boots', mat or LEATHER, trim if rarity in ('epic', 'legendary') else None)
    if category == 'gloves':
        if 'gauntlets' in base_id or mat in (IRON, MITHRIL, WATCH):
            return Gear('gauntlets', mat or IRON, trim)
        return Gear('gloves', mat if mat and mat not in (STEEL,) else LEATHER, trim)
    if category in ('weapon', 'offhand'):
        if weapon_type is None:
            weapon_type = 'axe' if 'axe' in base_id or 'hatchet' in base_id else 'dagger'
        if weapon_type in ('staff',):
            orb = trim or (FROST if 'frost' in base_id else GREEN if mat is None else mat)
            return Gear('staff', WOOD if any(k in base_id for k in WOODEN) or mat is None else mat, orb)
        if weapon_type == 'tome':
            return Gear('tome', mat or RED, trim or GOLD)
        if weapon_type == 'bow':
            return Gear('bow', WOOD if mat is None or mat in (IRON, STEEL) else mat, trim)
        return Gear(weapon_type, mat or STEEL, trim)
    if category == 'shield':
        tower = 'tower' in base_id
        if 'buckler' in base_id:
            return Gear('shield', mat or WOOD, trim or IRON)
        return Gear('tower' if tower else 'shield', mat or WOOD, trim or IRON)
    return None


def base_look(race: str, cls: str) -> Look:
    """Class clothes with nothing equipped (no weapon, no armor)."""
    bare = race == 'halfling'
    boots = None if bare else Gear('boots', LEATHER)
    if cls == 'warrior':
        return Look(race, None, Gear('tunic', RED, LEATHER), Gear('pants', CHARCOAL), boots)
    if cls == 'mage':
        return Look(race, Gear('hat', BLUE, GOLD), Gear('robe', BLUE, GOLD), Gear('pants', BLUE), boots)
    if cls == 'archer':
        return Look(race, Gear('hood', GREEN), Gear('tunic', GREEN, LEATHER), Gear('pants', CLOTH_BROWN), boots,
                    gloves=Gear('bracers', LEATHER), cape=Gear('cape', FOREST))
    if cls == 'rogue':
        return Look(race, Gear('hood', CHARCOAL), Gear('jerkin', DARK_LEATHER, GOLD), Gear('pants', CHARCOAL), boots,
                    cape=Gear('cape', CHARCOAL), mask=Gear('mask', RED))
    return Look(race, Gear('circlet', GOLD, BLUE), Gear('robe', WHITE, GOLD), Gear('pants', WHITE), boots)


def dressed(race: str, cls: str, equipment: dict[str, tuple[str, str, str | None, str]]) -> Look:
    """equipment: slot -> (baseId, category, weaponType, rarity)."""
    look = base_look(race, cls)
    for slot, (base_id, category, wtype, rarity) in equipment.items():
        g = item_gear(base_id, category, wtype, rarity)
        if g is None:
            continue
        if slot == 'helmet':
            look = replace(look, head=g, mask=None if g.shape in ('helm', 'plumed', 'cap') else look.mask)
        elif slot == 'chest':
            look = replace(look, chest=g)
        elif slot == 'legs':
            look = replace(look, legs=g)
        elif slot == 'boots':
            look = replace(look, boots=g)
        elif slot == 'gloves':
            look = replace(look, gloves=g)
        elif slot == 'weapon':
            look = replace(look, main=g, quiver=g.shape == 'bow')
        elif slot == 'shield':
            look = replace(look, off=g)
    return look
