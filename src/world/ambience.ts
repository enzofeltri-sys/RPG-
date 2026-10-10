import Phaser from 'phaser';
import { bat, bird, butterfly, chicken, dragonfly, frog, glint, glow, leaf, pigeon, puff, rat } from '../art/critters';
import { materialAt } from '../art/ground';
import type { RGB } from '../art/pixmap';
import { NPC_LOOKS } from '../art/npcLooks';
import { HERO_FEET_Y, HERO_FRAME_H, ensureHeroAnimations, facingFrom, idleFrame, lookTextures } from '../entities/heroSprite';
import type { Facing } from '../entities/heroSprite';
import { pixmapTexture } from './drawnArt';
import { ZoneArt, buildingArt } from './zonePlan';

// The small life of a zone: butterflies over the grass, birds crossing
// high up, leaves falling in the woods, dragonflies and frogs by the bog,
// fireflies, dust in the light of dark places, spores over corrupted
// ground, glints on the water, flames that flicker, sparks and smoke,
// pigeons on the square, hens in the villages, rats and bats underground,
// people walking about the towns. None of it blocks or reacts to taps.

export interface AmbienceSpec {
  butterflies?: number;
  birds?: boolean;
  leaves?: boolean;
  fireflies?: number;
  dragonflies?: number;
  dust?: number;
  spores?: number;
  frogs?: number;
  rats?: boolean;
  bats?: boolean;
  glints?: boolean;
  // Where pigeons gather and hens scratch about (one bird per point).
  pigeons?: [number, number][];
  chickens?: [number, number][];
}

// Someone walking a route back and forth (a look from npcLooks.ts).
export interface Walker {
  look: string;
  path: [number, number][];
}

const LIGHT_DEPTH = 800; // the light map of dark zones (zoneArt.ts)
const GLOW_DEPTH = LIGHT_DEPTH + 5; // things that shine, above the dark
const SKY_DEPTH = 950; // above everything in the world, below the HUD

const TREES = new Set(['tree', 'big_tree', 'apple_tree', 'pine', 'swamp_tree']);
const BUTTERFLY_COLORS: RGB[] = [
  [248, 248, 240],
  [250, 214, 90],
  [240, 140, 60],
  [140, 180, 250],
];
const LEAF_COLORS: RGB[] = [
  [120, 160, 70],
  [176, 150, 70],
  [190, 120, 60],
];

// What a zone gets when it doesn't say: from its ground, decor and light.
function resolve(art: ZoneArt): AmbienceSpec {
  const shapes = art.ground.shapes ?? [];
  const has = (m: string) => art.ground.base === m || shapes.some((s) => s.material === m);
  const dark = !!art.dark && art.dark.ambient < 0.7;
  const outdoor = !dark && !art.enclosed;
  const props = art.props ?? [];
  const spec: AmbienceSpec = {
    butterflies: outdoor && (art.ground.base === 'grass' || art.ground.base === 'forest') ? (art.ground.base === 'forest' ? 2 : 5) : 0,
    birds: outdoor,
    leaves: outdoor && props.filter((p) => TREES.has(p.kind)).length > 6,
    dragonflies: has('bog') || has('marsh') || has('water') ? (outdoor ? 3 : 0) : 0,
    fireflies: has('bog') ? 6 : has('marsh') && !outdoor ? 3 : 0,
    frogs: outdoor && (has('bog') || has('marsh')) ? 3 : 0,
    spores: has('blight') || props.some((p) => p.kind.startsWith('blight')) ? 10 : 0,
    dust: dark ? 14 : 0,
    rats: dark && !art.enclosed && !has('blight') && art.ground.base !== 'bog',
    bats: dark && (art.ground.base === 'cave' || (art.walls ?? []).some((w) => w.style === 'rock' || w.style === 'crypt')),
    glints: has('water') || has('bog') || has('flooded'),
  };
  return { ...spec, ...art.ambience };
}

interface Live {
  obj: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite;
  step(dt: number, t: number): boolean; // false: remove
}

export class Ambience {
  private readonly live: Live[] = [];
  private target?: { x: number; y: number };
  private time = 0;
  private timers: { every: number; left: number; run: () => void }[] = [];
  private readonly spec: AmbienceSpec;
  private readonly waterPoints: [number, number][] = [];
  private readonly grassPoints: [number, number][] = [];
  private readonly lightPoints: [number, number][] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly art: ZoneArt,
  ) {
    this.spec = resolve(art);
    this.samplePoints();
    this.makeTextures();
    this.populate();
    const onUpdate = (_t: number, dt: number) => this.update(Math.min(dt, 50) / 1000);
    scene.events.on(Phaser.Scenes.Events.UPDATE, onUpdate);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.UPDATE, onUpdate));
  }

  follow(target: { x: number; y: number }): void {
    this.target = target;
  }

  // ------------------------------------------------------------ setup

  private samplePoints(): void {
    const { w, h } = this.art.ground;
    let seed = w * 7 + h;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
    for (let i = 0; i < 900 && (this.waterPoints.length < 120 || this.grassPoints.length < 120); i++) {
      const x = Math.round(rnd() * w);
      const y = Math.round(rnd() * h);
      const m = materialAt(this.art.ground, x, y);
      if (m === 'water' || m === 'bog' || m === 'flooded') this.waterPoints.push([x, y]);
      else if (m === 'grass' || m === 'forest') this.grassPoints.push([x, y]);
    }
    (this.art.dark?.lights ?? []).forEach((l) => this.lightPoints.push([l.x, l.y]));
    (this.art.dprops ?? []).forEach((d) => {
      if (d.kind === 'torch' || d.kind === 'brazier' || d.kind === 'candles') this.lightPoints.push([d.x, d.y - 12]);
    });
  }

  private tex(key: string, make: () => import('../art/pixmap').Pixmap): string {
    return pixmapTexture(this.scene, `amb-${key}`, make());
  }

  private makeTextures(): void {
    BUTTERFLY_COLORS.forEach((c, i) => {
      this.tex(`bfly-${i}-o`, () => butterfly(c, true));
      this.tex(`bfly-${i}-c`, () => butterfly(c, false));
    });
    this.tex('bird-u', () => bird(true));
    this.tex('bird-d', () => bird(false));
    LEAF_COLORS.forEach((c, i) => {
      this.tex(`leaf-${i}-a`, () => leaf(c, true));
      this.tex(`leaf-${i}-b`, () => leaf(c, false));
    });
    this.tex('dfly-u', () => dragonfly(true));
    this.tex('dfly-d', () => dragonfly(false));
    (['stand', 'peck', 'fly1', 'fly2'] as const).forEach((f) => this.tex(`pigeon-${f}`, () => pigeon(f)));
    (['stand', 'peck', 'walk'] as const).forEach((f) => this.tex(`hen-${f}`, () => chicken(f)));
    this.tex('frog-s', () => frog(false));
    this.tex('frog-h', () => frog(true));
    this.tex('rat-a', () => rat(true));
    this.tex('rat-b', () => rat(false));
    this.tex('bat-u', () => bat(true));
    this.tex('bat-d', () => bat(false));
    this.tex('glow-fire', () => glow(12, [255, 170, 80]));
    this.tex('glow-small', () => glow(4, [255, 236, 150]));
    this.tex('glow-fly', () => glow(4, [220, 255, 140]));
    this.tex('glow-spore', () => glow(3, [200, 120, 250]));
    this.tex('dust', () => glow(1, [255, 246, 220]));
    this.tex('spark', () => glow(1, [255, 200, 90]));
    this.tex('puff', () => puff(5));
    this.tex('glint', () => glint());
    this.tex('splash', () => glint());
  }

  private every(seconds: number, run: () => void, jitter = 0.4): void {
    this.timers.push({ every: seconds, left: seconds * Math.random(), run: () => run() });
    const t = this.timers[this.timers.length - 1];
    const base = t.every;
    t.run = () => {
      run();
      t.every = base * (1 - jitter / 2 + Math.random() * jitter);
    };
  }

  private view(): Phaser.Geom.Rectangle {
    return this.scene.cameras.main.worldView;
  }

  private near(x: number, y: number, margin = 40): boolean {
    const v = this.view();
    return x > v.x - margin && x < v.right + margin && y > v.y - margin && y < v.bottom + margin;
  }

  private populate(): void {
    const s = this.spec;
    for (let i = 0; i < (s.butterflies ?? 0) && this.grassPoints.length; i++) this.butterfly(this.grassPoints[(i * 37) % this.grassPoints.length]);
    if (s.birds) this.every(9, () => this.bird());
    if (s.leaves) this.every(0.7, () => this.leaf());
    for (let i = 0; i < (s.dragonflies ?? 0) && this.waterPoints.length; i++) this.dragonfly(this.waterPoints[(i * 41) % this.waterPoints.length]);
    for (let i = 0; i < (s.fireflies ?? 0); i++) this.firefly(i);
    for (let i = 0; i < (s.frogs ?? 0) && this.waterPoints.length; i++) this.frog(i);
    if (s.spores) this.every(2.4 / s.spores, () => this.spore());
    if (s.dust && this.lightPoints.length) this.every(3 / s.dust, () => this.dust());
    if (s.rats) this.every(11, () => this.rat());
    if (s.bats) this.every(13, () => this.bat());
    if (s.glints && this.waterPoints.length) this.every(0.35, () => this.glint());
    (s.pigeons ?? []).forEach(([x, y], i) => this.pigeon(x, y, i));
    (s.chickens ?? []).forEach(([x, y], i) => this.hen(x, y, i));
    this.fires();
    this.chimneys();
    (this.art.walkers ?? []).forEach((w, i) => this.walker(w, i));
  }

  private update(dt: number): void {
    this.time += dt;
    this.timers.forEach((t) => {
      t.left -= dt;
      if (t.left <= 0) {
        t.left += t.every;
        t.run();
      }
    });
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i];
      if (!l.step(dt, this.time)) {
        l.obj.destroy();
        this.live.splice(i, 1);
      }
    }
  }

  private add(obj: Live['obj'], step: Live['step']): void {
    this.live.push({ obj, step });
  }

  private image(x: number, y: number, key: string): Phaser.GameObjects.Image {
    return this.scene.add.image(x, y, `amb-${key}`);
  }

  private playerNear(x: number, y: number, r: number): boolean {
    return !!this.target && Math.hypot(this.target.x - x, this.target.y - y) < r;
  }

  // ---------------------------------------------------------- the air

  private butterfly([hx, hy]: [number, number]): void {
    const c = Math.floor(Math.random() * BUTTERFLY_COLORS.length);
    const img = this.image(hx, hy - 10, `bfly-${c}-o`);
    let tx = hx;
    let ty = hy - 10;
    let wait = 0;
    let flap = 0;
    this.add(img, (dt, t) => {
      wait -= dt;
      if (wait <= 0) {
        tx = hx + (Math.random() - 0.5) * 70;
        ty = hy - 10 + (Math.random() - 0.5) * 50;
        wait = 1.5 + Math.random() * 2;
      }
      const dx = tx - img.x;
      const dy = ty - img.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        img.x += (dx / d) * 16 * dt;
        img.y += (dy / d) * 16 * dt + Math.sin(t * 9 + hx) * 0.25;
      }
      flap += dt;
      if (flap > 0.12) {
        flap = 0;
        img.setTexture(img.texture.key.endsWith('-o') ? `amb-bfly-${c}-c` : `amb-bfly-${c}-o`);
      }
      img.setDepth(img.y + 30);
      return true;
    });
  }

  private bird(): void {
    const v = this.view();
    const fromLeft = Math.random() < 0.5;
    const y = v.y + 20 + Math.random() * (v.height * 0.6);
    const img = this.image(fromLeft ? v.x - 10 : v.right + 10, y, 'bird-u').setDepth(SKY_DEPTH).setFlipX(!fromLeft);
    const shadow = this.scene.add.ellipse(img.x, y + 46, 6, 2, 0x221c29, 0.22).setDepth(-600);
    const vx = (fromLeft ? 1 : -1) * (55 + Math.random() * 25);
    const vy = (Math.random() - 0.5) * 12;
    let flap = 0;
    this.add(img, (dt) => {
      img.x += vx * dt;
      img.y += vy * dt;
      shadow.setPosition(img.x + 4, img.y + 46);
      flap += dt;
      if (flap > 0.16) {
        flap = 0;
        img.setTexture(img.texture.key === 'amb-bird-u' ? 'amb-bird-d' : 'amb-bird-u');
      }
      const alive = img.x > v.x - 60 && img.x < v.right + 60;
      if (!alive) shadow.destroy();
      return alive;
    });
  }

  private leaf(): void {
    const trees = (this.art.props ?? []).filter((p) => TREES.has(p.kind) && this.near(p.x, p.y - 30, 0));
    if (!trees.length) return;
    const tr = trees[Math.floor(Math.random() * trees.length)];
    const c = Math.floor(Math.random() * LEAF_COLORS.length);
    const x0 = tr.x + (Math.random() - 0.5) * 24;
    const img = this.image(x0, tr.y - 30 - Math.random() * 14, `leaf-${c}-a`);
    let life = 0;
    const ground = tr.y + Math.random() * 10;
    this.add(img, (dt, t) => {
      life += dt;
      if (img.y < ground) {
        img.y += 14 * dt;
        img.x = x0 + Math.sin(t * 3 + x0) * 6;
        img.setTexture(Math.sin(t * 3 + x0) > 0 ? `amb-leaf-${c}-a` : `amb-leaf-${c}-b`);
      } else img.setAlpha(Math.max(0, 1 - (life - 2.5)));
      img.setDepth(img.y + 40);
      return life < 3.6;
    });
  }

  private dragonfly([hx, hy]: [number, number]): void {
    const img = this.image(hx, hy - 8, 'dfly-u');
    let tx = hx;
    let ty = hy;
    let rest = 0;
    let flap = 0;
    this.add(img, (dt) => {
      rest -= dt;
      const dx = tx - img.x;
      const dy = ty - img.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) {
        img.x += (dx / d) * 70 * dt;
        img.y += (dy / d) * 70 * dt;
        img.setFlipX(dx > 0);
      } else if (rest <= 0) {
        // Dart off somewhere else over the water.
        const p = this.waterPoints[Math.floor(Math.random() * this.waterPoints.length)];
        const far = Math.hypot(p[0] - hx, p[1] - hy) > 80;
        tx = far ? hx + (Math.random() - 0.5) * 60 : p[0];
        ty = (far ? hy + (Math.random() - 0.5) * 40 : p[1]) - 8;
        rest = 0.6 + Math.random() * 1.8;
      }
      flap += dt;
      if (flap > 0.05) {
        flap = 0;
        img.setTexture(img.texture.key === 'amb-dfly-u' ? 'amb-dfly-d' : 'amb-dfly-u');
      }
      img.setDepth(img.y + 30);
      return true;
    });
  }

  private firefly(i: number): void {
    const pool = this.waterPoints.length ? this.waterPoints : this.grassPoints;
    if (!pool.length) return;
    const [hx, hy] = pool[(i * 53 + 7) % pool.length];
    const img = this.image(hx, hy - 12, 'glow-fly').setBlendMode(Phaser.BlendModes.ADD).setDepth(GLOW_DEPTH);
    const phase = Math.random() * 6;
    this.add(img, (_dt, t) => {
      img.x = hx + Math.sin(t * 0.7 + phase) * 22 + Math.sin(t * 1.9 + phase) * 6;
      img.y = hy - 12 + Math.cos(t * 0.5 + phase) * 14;
      img.setAlpha(0.25 + Math.max(0, Math.sin(t * 2.2 + phase)) * 0.75);
      return true;
    });
  }

  private spore(): void {
    const v = this.view();
    const props = (this.art.props ?? []).filter((p) => p.kind.startsWith('blight') && this.near(p.x, p.y));
    let x: number;
    let y: number;
    if (props.length && Math.random() < 0.5) {
      const p = props[Math.floor(Math.random() * props.length)];
      x = p.x + (Math.random() - 0.5) * 16;
      y = p.y - 6;
    } else {
      x = v.x + Math.random() * v.width;
      y = v.y + Math.random() * v.height;
      if (materialAt(this.art.ground, x, y) !== 'blight') return;
    }
    const img = this.image(x, y, 'glow-spore').setBlendMode(Phaser.BlendModes.ADD).setDepth(GLOW_DEPTH);
    let life = 0;
    const drift = (Math.random() - 0.5) * 6;
    this.add(img, (dt) => {
      life += dt;
      img.y -= 7 * dt;
      img.x += drift * dt;
      img.setAlpha(Math.sin(Math.min(1, life / 3.5) * Math.PI) * 0.9);
      return life < 3.5;
    });
  }

  private dust(): void {
    const [lx, ly] = this.lightPoints[Math.floor(Math.random() * this.lightPoints.length)];
    if (!this.near(lx, ly)) return;
    const img = this.image(lx + (Math.random() - 0.5) * 50, ly + (Math.random() - 0.5) * 40, 'dust').setDepth(GLOW_DEPTH);
    let life = 0;
    const vx = (Math.random() - 0.5) * 4;
    this.add(img, (dt) => {
      life += dt;
      img.x += vx * dt;
      img.y -= 2 * dt;
      img.setAlpha(Math.sin(Math.min(1, life / 5) * Math.PI) * 0.55);
      return life < 5;
    });
  }

  private glint(): void {
    const v = this.view();
    const pts = this.waterPoints.filter(([x, y]) => x > v.x && x < v.right && y > v.y && y < v.bottom);
    if (!pts.length) return;
    const [x, y] = pts[Math.floor(Math.random() * pts.length)];
    const img = this.image(x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 6, 'glint').setDepth(-845);
    let life = 0;
    this.add(img, (dt) => {
      life += dt;
      img.setAlpha(Math.sin(Math.min(1, life / 0.9) * Math.PI) * 0.9);
      return life < 0.9;
    });
  }

  // ------------------------------------------------------- the animals

  private frog(i: number): void {
    // Frogs sit on the bank: a water point with dry ground just beside.
    const banks = this.waterPoints.filter(([x, y]) => {
      const m = materialAt(this.art.ground, x, y + 8);
      return m !== 'water' && m !== 'bog' && m !== 'flooded';
    });
    const pool = banks.length ? banks : this.waterPoints;
    const [hx, hy] = pool[(i * 29 + 3) % pool.length];
    const img = this.image(hx, hy + 6, 'frog-s').setOrigin(0.5, 1).setDepth(hy + 6 - 8);
    let gone = 0;
    let next = 2 + Math.random() * 6;
    this.add(img, (dt) => {
      if (gone > 0) {
        gone -= dt;
        if (gone <= 0 && !this.playerNear(hx, hy, 60)) img.setVisible(true).setPosition(hx, hy + 6).setTexture('amb-frog-s');
        return true;
      }
      if (this.playerNear(img.x, img.y, 30)) {
        // Plop: into the water, a ring where it went.
        this.splash(img.x, img.y - 3);
        img.setVisible(false);
        gone = 8 + Math.random() * 6;
        return true;
      }
      next -= dt;
      if (next <= 0) {
        img.setTexture('amb-frog-h');
        img.x += (Math.random() - 0.5) * 12;
        this.scene.time.delayedCall(180, () => img.active && img.setTexture('amb-frog-s'));
        next = 3 + Math.random() * 7;
      }
      return true;
    });
  }

  private splash(x: number, y: number): void {
    const ring = this.scene.add.ellipse(x, y, 4, 2).setStrokeStyle(1, 0xdcecf8, 0.9).setDepth(-845);
    let life = 0;
    this.add(ring as unknown as Phaser.GameObjects.Image, (dt) => {
      life += dt;
      ring.setSize(4 + life * 18, 2 + life * 7).setAlpha(1 - life / 0.8);
      ring.setOrigin(0.5);
      return life < 0.8;
    });
  }

  private pigeon(hx: number, hy: number, i: number): void {
    const img = this.image(hx, hy, 'pigeon-stand').setOrigin(0.5, 1).setDepth(hy - 8).setFlipX(i % 2 === 0);
    let state: 'idle' | 'flying' | 'away' = 'idle';
    let timer = Math.random() * 2;
    let vx = 0;
    let vy = 0;
    this.add(img, (dt) => {
      timer -= dt;
      if (state === 'idle') {
        if (this.playerNear(img.x, img.y, 34)) {
          state = 'flying';
          const away = this.target ? Math.sign(img.x - this.target.x) || 1 : 1;
          vx = away * (50 + Math.random() * 30);
          vy = -40 - Math.random() * 20;
          img.setFlipX(vx > 0).setDepth(SKY_DEPTH);
          timer = 1.6;
          return true;
        }
        if (timer <= 0) {
          img.setTexture(Math.random() < 0.5 ? 'amb-pigeon-peck' : 'amb-pigeon-stand');
          if (Math.random() < 0.3) {
            img.x = Phaser.Math.Clamp(img.x + (Math.random() - 0.5) * 8, hx - 14, hx + 14);
            img.setFlipX(Math.random() < 0.5);
          }
          timer = 0.4 + Math.random() * 1.2;
        }
      } else if (state === 'flying') {
        img.x += vx * dt;
        img.y += vy * dt;
        img.setTexture(Math.floor(timer * 10) % 2 ? 'amb-pigeon-fly1' : 'amb-pigeon-fly2');
        img.setAlpha(Math.min(1, timer));
        if (timer <= 0) {
          state = 'away';
          img.setVisible(false);
          timer = 10 + Math.random() * 8;
        }
      } else if (timer <= 0 && !this.playerNear(hx, hy, 90)) {
        state = 'idle';
        img.setPosition(hx + (Math.random() - 0.5) * 10, hy).setAlpha(1).setVisible(true).setDepth(hy - 8).setTexture('amb-pigeon-stand');
      }
      return true;
    });
  }

  private hen(hx: number, hy: number, i: number): void {
    const img = this.image(hx, hy, 'hen-stand').setOrigin(0.5, 1).setFlipX(i % 2 === 1);
    let tx = hx;
    let ty = hy;
    let timer = Math.random() * 2;
    this.add(img, (dt) => {
      timer -= dt;
      if (this.playerNear(img.x, img.y, 22) && this.target) {
        // Shoo: a few quick steps away from the hero.
        const a = Math.atan2(img.y - this.target.y, img.x - this.target.x);
        tx = Phaser.Math.Clamp(img.x + Math.cos(a) * 18, hx - 34, hx + 34);
        ty = Phaser.Math.Clamp(img.y + Math.sin(a) * 12, hy - 20, hy + 20);
        timer = 0.8;
      } else if (timer <= 0) {
        if (Math.random() < 0.45) {
          tx = hx + (Math.random() - 0.5) * 40;
          ty = hy + (Math.random() - 0.5) * 24;
        }
        timer = 1 + Math.random() * 2.5;
      }
      const dx = tx - img.x;
      const dy = ty - img.y;
      const d = Math.hypot(dx, dy);
      if (d > 1) {
        img.x += (dx / d) * 22 * dt;
        img.y += (dy / d) * 22 * dt;
        img.setFlipX(dx > 0);
        img.setTexture(Math.floor(this.time * 8) % 2 ? 'amb-hen-walk' : 'amb-hen-stand');
      } else if (timer > 0.8 && Math.floor(this.time * 3 + i) % 4 === 0) img.setTexture('amb-hen-peck');
      else img.setTexture('amb-hen-stand');
      img.setDepth(img.y - 8);
      return true;
    });
  }

  private rat(): void {
    const v = this.view();
    const y = v.y + 30 + Math.random() * (v.height - 60);
    const fromLeft = Math.random() < 0.5;
    const img = this.image(fromLeft ? Math.max(16, v.x) : Math.min(this.art.ground.w - 16, v.right), y, 'rat-a').setOrigin(0.5, 1).setFlipX(fromLeft);
    const vx = (fromLeft ? 1 : -1) * 70;
    this.add(img, (dt, t) => {
      img.x += vx * dt;
      img.setTexture(Math.floor(t * 14) % 2 ? 'amb-rat-a' : 'amb-rat-b');
      img.setDepth(img.y - 8);
      return img.x > 10 && img.x < this.art.ground.w - 10;
    });
  }

  private bat(): void {
    const v = this.view();
    const fromLeft = Math.random() < 0.5;
    const img = this.image(fromLeft ? v.x - 8 : v.right + 8, v.y + 30 + Math.random() * 80, 'bat-u').setDepth(LIGHT_DEPTH - 1);
    const vx = (fromLeft ? 1 : -1) * 80;
    const y0 = img.y;
    this.add(img, (dt, t) => {
      img.x += vx * dt;
      img.y = y0 + Math.sin(t * 7) * 8 + (img.x - v.x) * 0.15;
      img.setTexture(Math.floor(t * 12) % 2 ? 'amb-bat-u' : 'amb-bat-d');
      return img.x > v.x - 30 && img.x < v.right + 30;
    });
  }

  // -------------------------------------------------- fire and smoke

  private fires(): void {
    const dark = !!this.art.dark && this.art.dark.ambient < 0.7;
    const flames: { x: number; y: number; big: boolean; sparks: boolean; smoke: boolean }[] = [];
    (this.art.dprops ?? []).forEach((d) => {
      if (d.kind === 'torch') flames.push({ x: d.x - 1, y: d.y - 14, big: false, sparks: false, smoke: false });
      if (d.kind === 'brazier') flames.push({ x: d.x, y: d.y - 16, big: true, sparks: true, smoke: false });
      if (d.kind === 'candles') flames.push({ x: d.x, y: d.y - 9, big: false, sparks: false, smoke: false });
      if (d.kind === 'hearth') flames.push({ x: d.x, y: d.y - 8, big: true, sparks: true, smoke: false });
    });
    (this.art.props ?? []).forEach((p) => {
      if (p.kind === 'campfire') flames.push({ x: p.x, y: p.y - 6, big: true, sparks: true, smoke: true });
      if (p.kind === 'smithy') flames.push({ x: p.x - 4, y: p.y - 19, big: true, sparks: true, smoke: true });
      if (dark && (p.kind === 'lamppost' || p.kind === 'street_lamp')) flames.push({ x: p.x + (p.kind === 'lamppost' ? 6 : 0), y: p.y - (p.kind === 'lamppost' ? 21 : 30), big: false, sparks: false, smoke: false });
    });
    flames.forEach((f) => {
      const img = this.image(f.x, f.y, f.big ? 'glow-fire' : 'glow-small').setBlendMode(Phaser.BlendModes.ADD).setDepth(GLOW_DEPTH);
      const base = dark ? (f.big ? 0.4 : 0.55) : f.big ? 0.22 : 0.3;
      let level = base;
      this.add(img, () => {
        level += (base * (0.6 + Math.random() * 0.8) - level) * 0.25;
        img.setAlpha(level);
        img.setScale(0.9 + level * 0.3);
        return true;
      });
      if (f.sparks) this.every(0.35, () => this.near(f.x, f.y) && this.spark(f.x, f.y));
      if (f.smoke) this.every(1.1, () => this.near(f.x, f.y) && this.smoke(f.x, f.y - 6));
    });
  }

  private spark(x: number, y: number): void {
    const img = this.image(x + (Math.random() - 0.5) * 6, y, 'spark').setBlendMode(Phaser.BlendModes.ADD).setDepth(GLOW_DEPTH);
    const vx = (Math.random() - 0.5) * 10;
    let life = 0;
    this.add(img, (dt) => {
      life += dt;
      img.x += vx * dt;
      img.y -= 22 * dt;
      img.setAlpha(1 - life / 0.9);
      return life < 0.9;
    });
  }

  private smoke(x: number, y: number): void {
    const img = this.image(x, y, 'puff').setDepth(SKY_DEPTH - 1).setScale(0.5).setAlpha(0);
    let life = 0;
    const drift = 3 + Math.random() * 3;
    this.add(img, (dt) => {
      life += dt;
      img.y -= 9 * dt;
      img.x += drift * dt;
      img.setScale(0.45 + life * 0.25);
      img.setAlpha(Math.sin(Math.min(1, life / 3.2) * Math.PI) * 0.6);
      return life < 3.2;
    });
  }

  private chimneys(): void {
    Object.values(this.art.buildings ?? {}).forEach((b) => {
      const a = buildingArt(b.kind, b.w, b.h);
      if (!a.smoke) return;
      const bottom = b.y + b.h / 2;
      const x = b.x - a.anchorX + a.smoke[0];
      const y = bottom - a.anchorY + a.smoke[1];
      this.every(1.3, () => this.near(x, y, 60) && this.smoke(x, y));
    });
  }

  // ------------------------------------------------------------ people

  private walker(w: Walker, i: number): void {
    const look = NPC_LOOKS[w.look];
    if (!look || w.path.length < 2) return;
    const { sheet } = lookTextures(this.scene, look);
    ensureHeroAnimations(this.scene, sheet);
    const [x0, y0] = w.path[0];
    const sprite = this.scene.add.sprite(x0, y0, sheet, idleFrame('down')).setOrigin(0.5, HERO_FEET_Y / HERO_FRAME_H);
    const shadow = this.scene.add.ellipse(x0, y0, 14, 5, 0x221c29, 0.35);
    let leg = 1;
    let dir = 1;
    let pause = i * 1.3;
    let facing: Facing = 'down';
    this.add(sprite, (dt) => {
      const [tx, ty] = w.path[leg];
      const dx = tx - sprite.x;
      const dy = ty - sprite.y;
      const d = Math.hypot(dx, dy);
      // Wait for the hero to pass rather than walk through him.
      const blocked = this.target && Math.hypot(this.target.x - (sprite.x + (dx / (d || 1)) * 10), this.target.y - (sprite.y + (dy / (d || 1)) * 10)) < 12;
      if (pause > 0 || blocked) {
        pause -= dt;
        sprite.anims.play(`${sheet}-idle-${facing}`, true);
      } else if (d < 1) {
        if (leg === w.path.length - 1 || leg === 0) dir = -dir;
        leg += dir;
        pause = Math.random() < 0.4 ? 1 + Math.random() * 2.5 : 0;
      } else {
        const sp = 20;
        sprite.x += (dx / d) * Math.min(d, sp * dt);
        sprite.y += (dy / d) * Math.min(d, sp * dt);
        facing = facingFrom(dx, dy, facing);
        sprite.anims.play(`${sheet}-walk-${facing}`, true);
      }
      sprite.setDepth(sprite.y);
      shadow.setPosition(sprite.x, sprite.y + 1).setDepth(sprite.y - 1);
      return true;
    });
  }
}
