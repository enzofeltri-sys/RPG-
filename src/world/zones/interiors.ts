import type { ZoneArt, ZoneLight } from '../zonePlan';
import type { DungeonPropKind, PropKind } from '../../art/props';

// The inside of the houses one can enter (InteriorScene): a small room
// with a plank floor, whitewashed timber walls with windows, a hearth
// that gives the light, and furniture telling who lives there. The middle
// of the room (the way from the door to the resident) stays clear.

export type RoomKind = 'house' | 'fisher' | 'cats' | 'inn' | 'weaver' | 'garden';

const W = 160;
const H = 160;

const d = (kind: DungeonPropKind, x: number, y: number) => ({ kind, x, y });
const p = (kind: PropKind, x: number, y: number, seed = 1) => ({ kind, x, y, seed });

// Footprints that block: a bed (head against the wall), a table, the
// inn's counter, a loom.
const bedSolid = (x: number, y: number) => ({ x, y: y - 14, w: 20, h: 28 });
const tableSolid = (x: number, y: number) => ({ x, y: y - 6, w: 28, h: 10 });

function room(kind: RoomKind, extra: Partial<ZoneArt>, lights: ZoneLight[] = []): ZoneArt {
  return {
    key: `interior-${kind}`,
    ground: {
      w: W,
      h: H,
      base: 'planks',
      seed: 600 + kind.length,
      shapes: [{ kind: 'rect', material: 'carpet', x: 58, y: 76, w: 44, h: 50 }],
    },
    walls: [
      { x: 4, y: H / 2, w: 8, h: H, face: 0, solid: true, style: 'timber' },
      { x: W - 4, y: H / 2, w: 8, h: H, face: 0, solid: true, style: 'timber' },
      { x: W / 2, y: 12, w: W, h: 24, face: 18, solid: true, style: 'timber' },
    ],
    ...extra,
    dark: {
      ambient: 0.66,
      lights: [
        // Daylight from the door and the windows.
        { x: W / 2, y: H + 20, r: 70, kind: 'cold' },
        { x: 18, y: 30, r: 34, kind: 'cold' },
        { x: 66, y: 30, r: 34, kind: 'cold' },
        ...lights,
      ],
    },
    enclosed: true,
    preview: { hero: [W / 2, 130] },
  };
}

const HEARTH_RIGHT: ZoneLight = { x: 128, y: 18, r: 80, kind: 'fire' };

export const INTERIORS: Record<RoomKind, ZoneArt> = {
  // Thibault, always ready for the next goblin: crates against the door
  // he never uses, an axe by the bed.
  house: room(
    'house',
    {
      dprops: [d('hearth', 128, 26), d('bed', 24, 54), d('dining_table', 116, 100), d('stool', 102, 110), d('stool', 132, 110)],
      props: [p('crate', 22, 140), p('crate', 30, 132), p('barrel', 146, 140), p('woodpile', 146, 40)],
      solids: [bedSolid(24, 54), tableSolid(116, 100)],
    },
    [HEARTH_RIGHT],
  ),
  // Bertrand the fisherman: a net drying by the wall, a barrel of fish,
  // a rod propped in the corner.
  fisher: room(
    'fisher',
    {
      dprops: [d('hearth', 128, 26), d('bed', 24, 54), d('dining_table', 116, 104), d('stool', 102, 114)],
      props: [p('net_rack', 30, 124, 3), p('barrel', 140, 142), p('barrel', 148, 136), p('crate', 146, 64)],
      solids: [bedSolid(24, 54), tableSolid(116, 104)],
    },
    [HEARTH_RIGHT],
  ),
  // Ombeline and her cats: baskets everywhere, a rug, the bed.
  cats: room(
    'cats',
    {
      dprops: [d('hearth', 128, 26), d('bed', 24, 54), d('cat_basket', 120, 64), d('cat_basket', 30, 108), d('cat_basket', 136, 132), d('dining_table', 120, 104), d('stool', 106, 114)],
      props: [p('flower_bush', 146, 46, 6)],
      solids: [bedSolid(24, 54), tableSolid(120, 104)],
    },
    [HEARTH_RIGHT],
  ),
  // The Cerf Bleu: Fernand behind his counter, kegs in the corner, two
  // tables by the fire.
  inn: room(
    'inn',
    {
      dprops: [d('hearth', 128, 26), d('counter', 80, 76), d('dining_table', 34, 112), d('dining_table', 126, 112), d('stool', 20, 122), d('stool', 48, 122), d('stool', 112, 122), d('stool', 140, 122)],
      props: [p('barrel', 20, 44), p('barrel', 30, 50), p('barrel', 20, 58), p('crate', 44, 40), p('sacks', 146, 70)],
      solids: [{ x: 80, y: 68, w: 58, h: 12 }, tableSolid(34, 112), tableSolid(126, 112)],
    },
    [HEARTH_RIGHT, { x: 80, y: 66, r: 30, kind: 'fire' }],
  ),
  // Solange the weaver: her loom, baskets of wool.
  weaver: room(
    'weaver',
    {
      dprops: [d('hearth', 128, 26), d('bed', 24, 54), d('loom', 128, 108), d('stool', 112, 116)],
      props: [p('sacks', 30, 120), p('sacks', 22, 132), p('crate', 146, 64)],
      solids: [bedSolid(24, 54), { x: 128, y: 104, w: 24, h: 8 }],
    },
    [HEARTH_RIGHT],
  ),
  // Fauvette and her garden: pots of seedlings, herbs drying.
  garden: room(
    'garden',
    {
      dprops: [d('hearth', 128, 26), d('bed', 24, 54), d('pots', 32, 112), d('pots', 128, 132), d('dining_table', 120, 100), d('stool', 106, 110)],
      props: [p('herb_patch', 146, 70, 2), p('sacks', 22, 140)],
      solids: [bedSolid(24, 54), tableSolid(120, 100)],
    },
    [HEARTH_RIGHT],
  ),
};
