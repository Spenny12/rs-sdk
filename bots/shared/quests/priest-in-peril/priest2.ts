// Priest in Peril part 2: report to King Roald, buy a bucket, back to the temple, kill a
// Monk of Zamorak for the golden key, climb to Drezel's cell and talk through the door.
import { walk } from '../../travel';
import { talk, buy, sleep, startGuard, setMeleeStyle, foodCount } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk);
  try {
    if (p().worldZ > 9000) {
      await bot.walkTo(3405, 9906, 2);
      const up = (await sdk.scanNearbyLocs(6)).find((l: any) => /ladder/i.test(l.name));
      if (up) { await bot.interactLoc(up, /climb.?up|up/i); for (let i = 0; i < 25 && p().worldZ > 9000; i++) await sleep(400); }
    }
    if (!skip.has('roald')) {
      log.push(await walk(bot, sdk, 3222, 3473, 3, 'temple->King Roald'));
      log.push({ roald: await talk(bot, sdk, /king roald/i, [/drezel|news|dog|killed/i]) });
    }
    if (!has(/^bucket$/i)) {
      log.push(await walk(bot, sdk, 3216, 3415, 3, 'Roald->general store'));
      log.push(await buy(bot, /shop keeper|shop assistant/i, /^bucket$/i, 1));
    }
    log.push(await walk(bot, sdk, 3408, 3487, 2, 'Varrock->temple doors'));
    const door = (await sdk.scanNearbyLocs(5)).find((l: any) => /large door/i.test(l.name));
    if (door) { await sdk.sendInteractLoc(door.x, door.z, door.id, 1); await sleep(2500); }
    log.push(`after door ${p().worldX},${p().worldZ} ${sdk.getState().gameMessages?.slice(-1)[0]?.text}`);

    // Monk of Zamorak -> golden key.
    await setMeleeStyle(sdk);
    const end = Date.now() + 180_000;
    while (Date.now() < end && !has(/golden key/i)) {
      guard.check();
      const monk = sdk.getState().nearbyNpcs.filter((n: any) => /monk of zamorak/i.test(n.name) && n.reachable !== false).sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!monk) { await sleep(800); continue; }
      if (!p().combat?.inCombat) await bot.attack(monk);
      let last = { x: monk.x, z: monk.z };
      try {
        await sdk.waitForCondition((s: any) => {
          const n = s.nearbyNpcs.find((x: any) => x.index === monk.index);
          if (n) last = { x: n.x, z: n.z };
          return !n || n.hp === 0;
        }, 40_000);
      } catch {}
      await sleep(1500);
      const key = (await sdk.scanGroundItems()).find((g: any) => /golden key/i.test(g.name));
      if (key) await bot.pickupItem(key);
    }
    log.push(`golden key ${has(/golden key/i)}`);

    // Up to Drezel (top floor): take staircases up until level 2.
    for (let i = 0; i < 3 && p().level < 2; i++) {
      const st = (await sdk.scanNearbyLocs(15)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /up/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!st) break;
      const lv = p().level;
      await bot.interactLoc(st, /climb.?up|up/i);
      for (let k = 0; k < 25 && p().level === lv; k++) await sleep(400);
    }
    log.push(`level ${p().level} at ${p().worldX},${p().worldZ}`);
    const cell = (await sdk.scanNearbyLocs(15)).find((l: any) => /cell door|prison|door/i.test(l.name) && l.options.some((o: string) => /talk/i.test(o)));
    log.push(`cell ${cell ? `${cell.name} ${cell.x},${cell.z} [${cell.options.join('/')}]` : 'none'}`);
    if (cell) {
      const opt = cell.optionsWithIndex.find((o: any) => /talk/i.test(o.text));
      await sdk.sendInteractLoc(cell.x, cell.z, cell.id, opt.opIndex);
      const seen: string[] = [];
      let idle = 0;
      while (idle < 8) {
        const d = sdk.getState().dialog;
        if (!d.isOpen) { idle++; await sleep(500); continue; }
        idle = 0;
        const o = d.options.find((x: any) => /tell me anyway|key|help|yes/i.test(x.text));
        if (o) { seen.push('> ' + o.text); await sdk.clickDialogByText(new RegExp('^' + o.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')); }
        else await sdk.sendClickDialog(0);
        await sleep(450);
      }
      log.push({ drezel: seen });
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk), inv: sdk.getInventory().map((i: any) => i.name) };
};
