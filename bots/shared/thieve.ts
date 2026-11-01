// Pickpocket a target NPC until a Thieving level goal or a time limit. Eats through stun
// damage with the HP guard; stops when food runs low.
// args: { npc: regex source, level?: number, minutes?: number, center?: [x, z], minFood?: number,
//         ids?: number[] (only these NPC ids) }
import { walk } from './travel';
import { sleep, startGuard, foodCount } from './lib';

export default async ({ bot, sdk, args }: any) => {
  const npcRe = new RegExp(args?.npc ?? '^man$', 'i');
  const goal = args?.level ?? 99;
  const end = Date.now() + (args?.minutes ?? 10) * 60_000;
  const minFood = args?.minFood ?? 3;
  const ids: number[] | undefined = args?.ids;
  const log: any[] = [];
  const coins = () => sdk.findInventoryItem(/^coins$/i)?.count ?? 0;
  const thieving = () => sdk.getSkill('Thieving');

  if (args?.center) log.push(await walk(bot, sdk, args.center[0], args.center[1], 4, `to ${args.npc}`));
  const guard = startGuard(bot, sdk, { eatAt: 0.6 });
  const start = { xp: thieving().experience, lvl: thieving().baseLevel, coins: coins() };
  let ok = 0, stunned = 0, failed = 0;
  try {
    while (Date.now() < end && thieving().baseLevel < goal) {
      guard.check();
      if (foodCount(sdk) < minFood && sdk.getState().player.hp < sdk.getState().player.maxHp * 0.5) { log.push('low food + HP: stopping'); break; }
      const target = sdk.getState().nearbyNpcs
        .filter((n: any) => npcRe.test(n.name) && (!ids || ids.includes(n.id)) && n.reachable !== false
          && n.optionsWithIndex?.some((o: any) => /pickpocket/i.test(o.text)))
        .sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!target) { await sleep(800); continue; }
      const r = await bot.pickpocketNpc(target);
      if (r.success) ok++;
      else if (/stun|caught/i.test(r.message ?? '')) { stunned++; await sleep(4500); }
      else { failed++; await sleep(600); }
    }
  } finally {
    guard.stop();
  }
  const p = sdk.getState().player;
  return {
    ok, stunned, failed, thieving: `${start.lvl} -> ${thieving().baseLevel}`, xp: thieving().experience - start.xp,
    coins: `${start.coins} -> ${coins()}`, hp: `${p.hp}/${p.maxHp}`, food: foodCount(sdk), log,
  };
};
