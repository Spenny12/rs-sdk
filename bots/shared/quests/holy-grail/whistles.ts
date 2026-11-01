// Holy Grail: magic whistles. Draynor Manor front door (3108, 3353) from the north, climb to
// level 2, the whistle door (3106, 3361) spawns 2 whistles at (3107, 3359) while carrying the
// napkin. Exit via the east wing doors (3119, 3356) and (3123, 3360).
import { walk } from '../../travel';
import { sleep, startGuard, waitPlane } from '../../lib';

export default async ({ bot, sdk }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const whistles = () => sdk.getInventory().filter((i: any) => /magic whistle/i.test(i.name)).length;
  const guard = startGuard(bot, sdk);
  try {
    log.push(await walk(bot, sdk, 3108, 3355, 1, 'Galahad->manor front door'));
    if (p().worldZ >= 3354) {
      const door = (await sdk.scanNearbyLocs(4)).find((l: any) => /door/i.test(l.name) && l.x === 3108 && l.z === 3353);
      if (door) { await sdk.sendInteractLoc(door.x, door.z, door.id, 1); for (let i = 0; i < 15 && p().worldZ >= 3354; i++) await sleep(400); }
    }
    log.push(`inside ${p().worldX},${p().worldZ}`);
    for (let i = 0; i < 3 && p().level < 2; i++) {
      const st = (await sdk.scanNearbyLocs(25)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /up/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
      if (!st) { log.push(`no stairs up on level ${p().level}`); break; }
      const lv = p().level;
      await bot.interactLoc(st, /up/i);
      await waitPlane(sdk, lv);
      log.push(`level ${p().level} at ${p().worldX},${p().worldZ}`);
    }
    if (p().level === 2) {
      const r = await bot.walkTo(3106, 3362, 1, { timeout: 40_000 });
      log.push(`to whistle door: ${r.message} ${p().worldX},${p().worldZ}`);
      const wd = (await sdk.scanNearbyLocs(4)).find((l: any) => /door/i.test(l.name) && l.x === 3106 && l.z === 3361);
      if (wd) { await sdk.sendInteractLoc(wd.x, wd.z, wd.id, 1); await sleep(2500); }
      for (let t = 0; t < 4 && whistles() < 2; t++) {
        const ws = (await sdk.scanGroundItems()).filter((g: any) => /magic whistle/i.test(g.name));
        for (const w of ws) { if (whistles() < 2) await bot.pickupItem(w); }
        if (whistles() < 2) await sleep(1500);
      }
      log.push(`whistles ${whistles()}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level] };
};
