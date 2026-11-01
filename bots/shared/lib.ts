// Shared helpers for Spencebot quest scripts.
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Talk to an NPC and click through. Options matching `prefs` (in order) win; options
 * starting with "No" are never picked by a pattern (Morgan's "No, vampires are scary!"
 * matched /vampire/ once). Falls back to the first non-"No" option.
 */
export async function talk(bot: any, sdk: any, npc: RegExp, prefs: RegExp[] = []) {
  const t = await bot.talkTo(npc);
  if (!t.success) return [`${npc}: ${t.message}`];
  const seen: string[] = [];
  for (let i = 0; i < 50; i++) {
    const d = sdk.getState().dialog;
    // Scripts pause between pages (mes + p_delay): Golrie hands over the pebble only
    // after a ~2 s gap. Wait up to 3 s of closed dialog before treating it as over.
    if (!d.isOpen) {
      let reopened = false;
      for (let w = 0; w < 6 && !reopened; w++) { await sleep(500); reopened = sdk.getState().dialog.isOpen; }
      if (!reopened) break;
      continue;
    }
    const opts: string[] = d.options.filter((o: any) => !/continue/i.test(o.text)).map((o: any) => o.text);
    if (opts.length) {
      const yes = opts.filter((o) => !/^no\b/i.test(o));
      let pick: string | undefined;
      for (const p of prefs) { pick = yes.find((o) => p.test(o)); if (pick) break; }
      pick ??= yes[0] ?? opts[0];
      seen.push('> ' + pick);
      await sdk.clickDialogByText(new RegExp('^' + esc(pick!) + '$', 'i'));
    } else {
      await sdk.sendClickDialog(0);
    }
    await sleep(350);
  }
  return seen;
}

export async function buy(bot: any, npc: RegExp, item: RegExp, n: number) {
  const o = await bot.openShop(npc);
  if (!o.success) return `openShop ${npc}: ${o.message}`;
  const r = await bot.buyFromShop(item, n);
  await bot.closeShop();
  return `buy ${item} x${n}: ${r.message}`;
}

export const FOOD = /shrimps|bread|cake|chocolate slice|meat|chicken|trout|salmon|lobster|tuna|swordfish|pie|stew|kebab/i;

export const foodCount = (sdk: any) => sdk.getInventory().filter((i: any) => FOOD.test(i.name)).length;

/** Combat-training policy: Defence until level 30, then Strength. */
export function pickMeleeSkill(sdk: any): 'Defence' | 'Strength' {
  return sdk.getSkill('Defence').baseLevel < 30 ? 'Defence' : 'Strength';
}

/**
 * Set the combat style for `skill` (default: the policy pick). Prefers a style that
 * trains only that skill. Call after equipping a weapon: styles depend on it.
 */
export async function setMeleeStyle(sdk: any, skill: string = pickMeleeSkill(sdk)) {
  const cs = sdk.getState()?.combatStyle;
  const styles = cs?.styles ?? [];
  const style = styles.find((s: any) => s.trainsSkills?.length === 1 && s.trainsSkills[0] === skill)
    ?? styles.find((s: any) => s.trainsSkills?.includes(skill));
  if (style && cs.currentStyle !== style.index) await sdk.sendSetCombatStyle(style.index);
  return style?.name ?? null;
}

/**
 * Leave a fight on purpose: walk to `safe` (a tile away from aggressive or multi-combat
 * NPCs), eating on the way. Call when FOOD gets low, not when HP does - the bot needs
 * food in hand to survive the walk out (Al Kharid warriors took it to 1 HP once).
 */
export async function retreat(bot: any, sdk: any, safe: [number, number]) {
  const r = await bot.walkTo(safe[0], safe[1], 3, { timeout: 60_000 });
  for (let i = 0; i < 4; i++) {
    const p = sdk.getState().player;
    if (p.hp >= p.maxHp * 0.6) break;
    const f = sdk.getInventory().find((x: any) => FOOD.test(x.name));
    if (!f) break;
    await bot.eatFood(f);
  }
  return r.message;
}

/**
 * HP guard: runs beside a script. Eats when HP drops below `eatAt` (fraction of max),
 * and when HP is below `abortAt` with no food left it throws on the next `check()`
 * so the script stops before the bot dies. Spencebot died in the Tree Gnome Village
 * dungeon (hobgoblins/zombies) at 14/23 HP with almost no food and no guard.
 */
export function startGuard(bot: any, sdk: any, opts: { eatAt?: number; abortAt?: number; keep?: RegExp } = {}) {
  const eatAt = opts.eatAt ?? 0.55;
  const abortAt = opts.abortAt ?? 0.35;
  let danger = '';
  let busy = false;
  const timer = setInterval(async () => {
    if (busy) return;
    const p = sdk.getState()?.player;
    if (!p || !p.maxHp) return;
    const frac = p.hp / p.maxHp;
    if (frac >= eatAt) return;
    // `keep`: food reserved for a quest (the Port Sarim beggar's bread) is never eaten.
    const food = sdk.getInventory().find((i: any) => FOOD.test(i.name) && !(opts.keep && opts.keep.test(i.name)));
    if (food) {
      busy = true;
      try { await bot.eatFood(food); } catch {} finally { busy = false; }
    } else if (frac < abortAt) {
      danger = `HP ${p.hp}/${p.maxHp} with no food`;
    }
  }, 600);
  return {
    stop: () => clearInterval(timer),
    /** Throw if the guard has seen fatal danger. Call between steps. */
    check: () => { if (danger) throw new Error(`HP guard: ${danger} - stopping`); },
  };
}

/** Wait until the player's plane changes (ladders/stairs). State lags 1-3 s. */
export async function waitPlane(sdk: any, from: number) {
  for (let i = 0; i < 30 && sdk.getState().player.level === from; i++) await sleep(400);
}

/** Wait until the player's position leaves `from` (teleports through doors/gates). */
export async function waitMoved(sdk: any, from: { x: number; z: number }, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const p = sdk.getState().player;
    if (p.worldX !== from.x || p.worldZ !== from.z) return true;
    await sleep(300);
  }
  return false;
}
