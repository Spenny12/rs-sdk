// Train melee on a target NPC.
// args: { npc: regex source, skill?: 'Attack'|'Strength'|'Defence' (default: policy pick,
//         Defence until 30 then Strength), level?, minutes?, center?: [x, z],
//         minFood?: number (retreat when food drops below it, default 4), safe?: [x, z] }
// Leaves the fight when FOOD runs low, not HP, so there is food left for the walk out.
import { startGuard, sleep, setMeleeStyle, pickMeleeSkill, foodCount, retreat } from './lib';

export default async ({ bot, sdk, args }: any) => {
  const npcRe = new RegExp(args?.npc ?? '^cow$', 'i');
  const fixedSkill: string | undefined = args?.skill;
  const goal = args?.level ?? 99;
  const end = Date.now() + (args?.minutes ?? 10) * 60_000;
  const center: [number, number] | undefined = args?.center;
  const minFood = args?.minFood ?? 4;
  const safe: [number, number] | undefined = args?.safe ?? center;
  const log: string[] = [];
  const skillNow = () => fixedSkill ?? pickMeleeSkill(sdk);

  log.push(`style -> ${await setMeleeStyle(sdk, skillNow())}`);
  if (center) await bot.walkTo(center[0], center[1], 4);

  const guard = startGuard(bot, sdk);
  const start: Record<string, number> = {};
  for (const s of ['Attack', 'Strength', 'Defence', 'Hitpoints']) start[s] = sdk.getSkill(s).experience;
  let kills = 0;
  let lastSkill = skillNow();
  try {
    while (Date.now() < end && sdk.getSkill(skillNow()).baseLevel < goal) {
      guard.check();
      if (foodCount(sdk) < minFood) {
        log.push(`food ${foodCount(sdk)} < ${minFood}: retreating`);
        if (safe) log.push(await retreat(bot, sdk, safe));
        break;
      }
      // Defence 30 reached mid-run: switch to Strength.
      if (skillNow() !== lastSkill) { lastSkill = skillNow(); log.push(`style -> ${await setMeleeStyle(sdk, lastSkill)}`); }
      const target = sdk.getState().nearbyNpcs
        .filter((n: any) => npcRe.test(n.name) && !n.inCombat && n.reachable !== false)
        .sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!target) { await sleep(600); continue; }
      const a = await bot.attack(target);
      if (!a.success) { await sleep(300); continue; }
      const t0 = Date.now();
      try {
        await sdk.waitForCondition((s: any) => {
          const n = s.nearbyNpcs.find((x: any) => x.index === target.index);
          return !n || n.hp === 0 || (!s.player?.combat?.inCombat && Date.now() - t0 > 8000);
        }, 40_000);
      } catch {}
      kills++;
    }
  } finally {
    guard.stop();
  }
  const gained: Record<string, number> = {};
  for (const s of Object.keys(start)) gained[s] = sdk.getSkill(s).experience - start[s];
  const p = sdk.getState().player;
  return {
    kills, gained,
    levels: { att: sdk.getSkill('Attack').baseLevel, str: sdk.getSkill('Strength').baseLevel, def: sdk.getSkill('Defence').baseLevel, hp: sdk.getSkill('Hitpoints').baseLevel },
    hp: `${p.hp}/${p.maxHp}`, food: foodCount(sdk), log,
  };
};
