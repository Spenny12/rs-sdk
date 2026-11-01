// Waterfall Quest part 2: Tree Gnome Village dungeon (hobgoblins level 28, zombies).
// Ladder (2533, 3155) -> crate (2548, 9565) large key -> key on gate (2515, 9575, loc 1991)
// -> talk to Golrie (2515, 9581) -> Glarial's pebble. HP guard + food-based retreat.
import { walk } from '../../travel';
import { talk, sleep, startGuard, setMeleeStyle, foodCount, retreat } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const largeKey = () => sdk.getInventory().find((i: any) => /key/i.test(i.name) && !/door/i.test(i.name));
  const minFood = args?.minFood ?? 5;
  log.push(`style -> ${await setMeleeStyle(sdk)}`);
  const guard = startGuard(bot, sdk);
  const ladderTop: [number, number] = [2533, 3156];
  try {
    if (p().worldZ < 9000) {
      log.push(await walk(bot, sdk, ladderTop[0], ladderTop[1], 1, 'Ardougne->gnome village ladder'));
      // Top up HP before going down.
      for (let i = 0; i < 6 && p().hp < p().maxHp * 0.85; i++) { const f = sdk.getInventory().find((x: any) => /cake|kebab|chocolate|bread/i.test(x.name)); if (!f) break; await bot.eatFood(f); }
      const lad = (await sdk.scanNearbyLocs(5)).find((l: any) => /ladder/i.test(l.name));
      if (!lad) throw new Error('no ladder at (2533, 3155)');
      await bot.interactLoc(lad, /climb.?down|down/i);
      for (let i = 0; i < 25 && p().worldZ < 9000; i++) await sleep(400);
      log.push(`dungeon ${p().worldX},${p().worldZ} hp ${p().hp}/${p().maxHp}`);
    }
    const checkFood = () => { if (foodCount(sdk) < minFood) throw new Error(`food ${foodCount(sdk)} < ${minFood}`); };

    if (!largeKey() && !sdk.findInventoryItem(/pebble/i)) {
      checkFood(); guard.check();
      log.push(await walk(bot, sdk, 2548, 9566, 1, 'ladder->crate'));
      const crate = (await sdk.scanNearbyLocs(4)).find((l: any) => /crate/i.test(l.name) && l.x === 2548 && l.z === 9565);
      if (crate) log.push((await bot.interactLoc(crate, /search/i)).message);
      for (let i = 0; i < 12 && !largeKey(); i++) await sleep(400);
      await bot.dismissBlockingUI();
      log.push(`key: ${largeKey()?.name ?? 'none'}`);
    }
    if (largeKey() && !sdk.findInventoryItem(/pebble/i)) {
      checkFood(); guard.check();
      log.push(await walk(bot, sdk, 2515, 9574, 1, 'crate->gate'));
      await sdk.sendUseItemOnLoc(largeKey().slot, 2515, 9575, 1991);
      const z0 = p().worldZ;
      for (let i = 0; i < 15 && p().worldZ === z0; i++) await sleep(400);
      await bot.dismissBlockingUI();
      log.push(`after gate ${p().worldX},${p().worldZ}`);
      log.push({ golrie: await talk(bot, sdk, /golrie/i, [/help|key|let you out|pebble|yes|glarial/i]) });
    }
    log.push(`pebble ${!!sdk.findInventoryItem(/pebble/i)}`);
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], hp: `${p().hp}/${p().maxHp}`, food: foodCount(sdk), inv: sdk.getInventory().map((i: any) => i.name) };
};
