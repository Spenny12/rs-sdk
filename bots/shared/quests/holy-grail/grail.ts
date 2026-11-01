// Holy Grail finale: Port Sarim boat -> Karamja whistle spot -> restored realm (arrival ~2678, 4715)
// -> castle (bell near a maiden if needed) -> level 2, take the Holy Grail (2649, 4684) -> whistle out.
import { walk } from '../../travel';
import { talk, sleep, startGuard, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk);
  const blow = async () => {
    const w = inv(/magic whistle/i);
    await sdk.sendUseItem(w.slot, w.optionsWithIndex?.find((o: any) => /blow/i.test(o.text))?.opIndex ?? 1);
    const z0 = p().worldZ;
    for (let i = 0; i < 15 && Math.abs(p().worldZ - z0) < 500; i++) await sleep(500);
    await bot.dismissBlockingUI();
  };
  try {
    if (!skip.has('boat') && p().worldZ < 4000 && p().worldX > 2990) {
      log.push(await walk(bot, sdk, 3029, 3217, 3, 'Goblin Village->Port Sarim seamen'));
      log.push({ seaman: await talk(bot, sdk, /captain tobias|seaman/i, [/karamja|journey|yes|ok/i]) });
      for (let i = 0; i < 40 && p().worldX > 2990; i++) { await sleep(500); const d = sdk.getState().dialog; if (d.isOpen && d.options.length <= 1) await sdk.sendClickDialog(0); }
      const plank = (await sdk.scanNearbyLocs(6)).find((l: any) => /gangplank/i.test(l.name));
      if (plank) { await sdk.sendInteractLoc(plank.x, plank.z, plank.id, 1); await sleep(3000); }
      log.push(`Karamja ${p().worldX},${p().worldZ}`);
    }
    if (p().worldZ < 4000) {
      log.push(await walk(bot, sdk, 2742, 3235, 1, '->whistle spot'));
      await blow();
      log.push(`realm ${p().worldX},${p().worldZ}`);
    }
    if (!inv(/holy grail/i)) {
      // Into the castle: walk toward it; ring the bell next to a maiden if we cannot path in.
      const path = await sdk.sendFindPath(2649, 4684, 500);
      log.push(`path to grail tile: ${path.success && path.reachedDestination}`);
      let r = await bot.walkTo(2640, 4690, 3, { timeout: 60_000 });
      log.push(`walk castle: ${r.message} ${p().worldX},${p().worldZ}`);
      if (!r.success && inv(/bell/i)) {
        for (let t = 0; t < 8; t++) {
          const maiden = sdk.getState().nearbyNpcs.filter((n: any) => /maiden/i.test(n.name)).sort((a: any, b: any) => a.distance - b.distance)[0];
          if (maiden && maiden.distance > 4) { await bot.walkTo(maiden.x, maiden.z, 2, { timeout: 30_000 }); }
          const bell = inv(/bell/i);
          await sdk.sendUseItem(bell.slot, bell.optionsWithIndex?.find((o: any) => /ring/i.test(o.text))?.opIndex ?? 1);
          const z0 = p().worldZ;
          for (let i = 0; i < 10; i++) { await sleep(500); const d = sdk.getState().dialog; if (d.isOpen) await sdk.sendClickDialog(0); }
          if (p().worldZ !== z0) break;
        }
        log.push(`after bell ${p().worldX},${p().worldZ}`);
      }
      for (let i = 0; i < 3 && p().level < 2; i++) {
        const st = (await sdk.scanNearbyLocs(25)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)))
          .sort((a: any, b: any) => Math.max(Math.abs(a.x - 2649), Math.abs(a.z - 4684)) - Math.max(Math.abs(b.x - 2649), Math.abs(b.z - 4684)))[0];
        if (!st) break;
        const lv = p().level; await bot.interactLoc(st, /up/i); await waitPlane(sdk, lv);
        log.push(`level ${p().level} at ${p().worldX},${p().worldZ}`);
      }
      const g = (await sdk.scanGroundItems()).find((x: any) => /holy grail/i.test(x.name));
      log.push(`grail on ground ${g ? `${g.x},${g.z} r:${g.reachable}` : 'no'}`);
      if (g) { await bot.pickupItem(g); await sleep(1500); await bot.dismissBlockingUI(); }
      log.push(`grail ${!!inv(/holy grail/i)} msgs: ${sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text).join(' | ')}`);
    }
    if (inv(/holy grail/i) && p().worldZ > 4000) {
      await blow();
      log.push(`out ${p().worldX},${p().worldZ}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], grail: !!inv(/holy grail/i), coins: inv(/^coins$/i)?.count };
};
