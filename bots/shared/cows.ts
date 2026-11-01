// Kill cows (style by policy: Defence until 30, then Strength). Picks up cowhides (loose ones first: other players leave
// plenty) until the inventory is full, then keeps fighting without looting.
// Stops at args.hpLevel (Hitpoints level), args.hides collected, or args.minutes.
import { startGuard, sleep, setMeleeStyle } from './lib';

export default async ({ bot, sdk, args }: any) => {
  const target = args?.hides ?? 99;
  const hpGoal = args?.hpLevel ?? 99;
  const end = Date.now() + (args?.minutes ?? 10) * 60_000;
  const log: string[] = [];
  const hides = () => sdk.getInventory().filter((i: any) => /^cowhide$/i.test(i.name)).length;
  const free = () => 28 - sdk.getInventory().length;
  const hpLevel = () => sdk.getSkill('Hitpoints').baseLevel;
  const inPen = (x: number, z: number) => x >= 3242 && x <= 3265 && z >= 3255 && z <= 3298;

  // Wield the best weapon we carry.
  for (const w of [/scimitar/i, /sword/i]) {
    if (sdk.findInventoryItem(w)) { await bot.equipItem(w); break; }
  }
  // Combat-training policy: Defence until 30, then Strength.
  log.push(`style -> ${await setMeleeStyle(sdk)}`);
  if (!inPen(sdk.getState().player.worldX, sdk.getState().player.worldZ)) {
    await bot.walkTo(3253, 3275, 4);
  }

  const guard = startGuard(bot, sdk);
  let kills = 0, loots = 0;
  const start = { hides: hides(), str: sdk.getSkill('Strength').experience, hp: sdk.getSkill('Hitpoints').experience };
  try {
    while (Date.now() < end && hides() - start.hides < target && hpLevel() < hpGoal) {
      guard.check();
      // 1. Loose hides inside the pen, nearest first (only while there is room).
      if (free() > 0) {
        const loose = (await sdk.scanGroundItems())
          .filter((g: any) => /^cowhide$/i.test(g.name) && inPen(g.x, g.z) && g.reachable !== false)
          .sort((a: any, b: any) => a.distance - b.distance)[0];
        if (loose && loose.distance <= 12) {
          const before = hides();
          await bot.pickupItem(loose);
          if (hides() > before) loots++;
          continue;
        }
      }
      // 2. Fight the nearest free cow.
      const cow = sdk.getState().nearbyNpcs
        .filter((n: any) => /^cow$/i.test(n.name) && !n.inCombat && n.reachable !== false && inPen(n.x, n.z))
        .sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!cow) { await sleep(600); continue; }
      const a = await bot.attack(cow);
      if (!a.success) { await sleep(300); continue; }
      const t0 = Date.now();
      try {
        // Dead when the NPC index disappears or its hp hits 0. Give up if we are
        // out of combat for 8 s (someone else took the cow).
        await sdk.waitForCondition((s: any) => {
          const n = s.nearbyNpcs.find((x: any) => x.index === cow.index);
          return !n || n.hp === 0 || (!s.player?.combat?.inCombat && Date.now() - t0 > 8000);
        }, 30_000);
      } catch {}
      kills++;
      await sleep(900); // drop appears a tick after death
    }
  } finally {
    guard.stop();
  }

  return {
    kills, loots, hidesGained: hides() - start.hides, hides: hides(), free: free(),
    strXp: sdk.getSkill('Strength').experience - start.str, strLevel: sdk.getSkill('Strength').baseLevel,
    hpXp: sdk.getSkill('Hitpoints').experience - start.hp, hpLevel: hpLevel(),
    attack: sdk.getSkill('Attack').baseLevel, log,
  };
};
