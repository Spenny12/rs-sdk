// East Ardougne: buy food at the bakery stall, then fight Men in the market on the
// policy style (Defence until 30), looting earth runes and coins, until 6 earth runes
// or args.minutes. Food-based retreat via train-style checks.
import { walk } from '../travel';
import { buy, sleep, startGuard, setMeleeStyle, pickMeleeSkill, foodCount, retreat } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const earth = () => sdk.findInventoryItem(/^earth rune$/i)?.count ?? 0;
  const market: [number, number] = [2662, 3307];
  const guard = startGuard(bot, sdk);
  try {
    log.push(await walk(bot, sdk, market[0], market[1], 4, 'Catherby->Ardougne market'));
    if (!args?.skipFood) {
      const baker = sdk.getState().nearbyNpcs.find((n: any) => /baker/i.test(n.name) && n.optionsWithIndex?.some((o: any) => /trade/i.test(o.text)));
      log.push(`baker: ${baker ? `${baker.name} ${baker.x},${baker.z}` : 'not found'}`);
      if (baker) {
        log.push(await buy(bot, /baker/i, /^cake$/i, 3));
        log.push(await buy(bot, /baker/i, /^chocolate slice$/i, 8));
        log.push(await buy(bot, /baker/i, /^bread$/i, 6));
      }
    }
    log.push(`style -> ${await setMeleeStyle(sdk)}`);
    const end = Date.now() + (args?.minutes ?? 8) * 60_000;
    let kills = 0;
    let curSkill = pickMeleeSkill(sdk);
    const defStart = sdk.getSkill('Defence').experience;
    while (Date.now() < end && earth() < 6) {
      guard.check();
      if (foodCount(sdk) < 4) { log.push(await retreat(bot, sdk, market)); break; }
      if (28 - sdk.getInventory().length < 1) break;
      // Re-check the policy every fight: Defence 30 reached -> Strength (this once overshot to Defence 47).
      if (pickMeleeSkill(sdk) !== curSkill) { curSkill = pickMeleeSkill(sdk); log.push(`style -> ${await setMeleeStyle(sdk, curSkill)}`); }
      const man = sdk.getState().nearbyNpcs
        .filter((n: any) => new RegExp(args?.target ?? '^(man|woman)$', 'i').test(n.name) && !n.inCombat && n.reachable !== false && n.optionsWithIndex?.some((o: any) => /attack/i.test(o.text)))
        .sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!man) { await sleep(800); continue; }
      const a = await bot.attack(man);
      if (!a.success) { await sleep(300); continue; }
      const t0 = Date.now();
      let last = { x: man.x, z: man.z };
      try {
        await sdk.waitForCondition((s: any) => {
          const n = s.nearbyNpcs.find((x: any) => x.index === man.index);
          if (n) last = { x: n.x, z: n.z };
          return !n || n.hp === 0 || (!s.player?.combat?.inCombat && Date.now() - t0 > 8000);
        }, 30_000);
      } catch {}
      kills++;
      await sleep(1200);
      const loot = (await sdk.scanGroundItems())
        .filter((g: any) => /earth rune|coins/i.test(g.name) && Math.max(Math.abs(g.x - last.x), Math.abs(g.z - last.z)) <= 2);
      for (const g of loot) await bot.pickupItem(g);
    }
    log.push({ kills, earth: earth(), defXp: sdk.getSkill('Defence').experience - defStart });
  } finally {
    guard.stop();
  }
  return { log, levels: { att: sdk.getSkill('Attack').baseLevel, str: sdk.getSkill('Strength').baseLevel, def: sdk.getSkill('Defence').baseLevel, hp: sdk.getSkill('Hitpoints').baseLevel }, hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk), coins: sdk.findInventoryItem(/^coins$/i)?.count, inv: sdk.getInventory().map((i: any) => i.name) };
};
