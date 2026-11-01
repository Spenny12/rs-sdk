// Holy Grail: from the Draynor Manor top floor -> out via the east wing, Draynor bank
// (Excalibur), Lumbridge church altar (prayer), Port Sarim boat to Karamja (30 gp),
// walk to the Brimhaven whistle spot (2740-2743, 3234-3237).
import { walk } from '../../travel';
import { talk, sleep, startGuard, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  const rawDoor = async (dx: number, dz: number, from: [number, number], to: [number, number]) => {
    await sdk.sendWalk(from[0], from[1], true);
    for (let i = 0; i < 15 && (p().worldX !== from[0] || p().worldZ !== from[1]); i++) await sleep(400);
    const door = (await sdk.scanNearbyLocs(3)).find((l: any) => /door/i.test(l.name) && l.x === dx && l.z === dz);
    if (door && door.options.some((o: string) => /^open$/i.test(o))) { await sdk.sendInteractLoc(dx, dz, door.id, 1); await sleep(1500); }
    await sdk.sendWalk(to[0], to[1], true);
    for (let i = 0; i < 15 && (p().worldX !== to[0] || p().worldZ !== to[1]); i++) await sleep(400);
  };
  try {
    if (!skip.has('manor')) {
      for (let i = 0; i < 3 && p().level > 0; i++) {
        const st = (await sdk.scanNearbyLocs(20)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /down/i.test(o)) && l.reachable !== false).sort((a: any, b: any) => a.distance - b.distance)[0];
        if (!st) break;
        const lv = p().level; await bot.interactLoc(st, /down/i); await waitPlane(sdk, lv);
      }
      log.push(`ground ${p().worldX},${p().worldZ}`);
      // Back through the hall door to the entry, then the east wing route out.
      if (p().worldZ >= 3359) await rawDoor(3109, 3358, [3109, 3359], [3109, 3357]);
      await rawDoor(3119, 3356, [3118, 3356], [3120, 3356]);
      await rawDoor(3123, 3360, [3123, 3359], [3123, 3361]);
      log.push(`out ${p().worldX},${p().worldZ}`);
    }
    if (!skip.has('bank') && !sdk.findInventoryItem(/excalibur/i)) {
      log.push(await walk(bot, sdk, 3092, 3244, 2, 'manor->Draynor bank'));
      await bot.openBank();
      log.push((await bot.withdrawItem(/^excalibur$/i, 1)).message);
      await bot.closeBank();
      await bot.equipItem(/excalibur/i);
    }
    if (!skip.has('pray')) {
      log.push(await walk(bot, sdk, 3243, 3206, 2, 'bank->Lumbridge church'));
      const altar = (await sdk.scanNearbyLocs(6)).find((l: any) => /altar/i.test(l.name));
      if (altar) { await bot.interactLoc(altar, /pray/i); await sleep(2500); }
      log.push(`prayer ${JSON.stringify(sdk.getPrayerState?.()?.prayerPoints)}`);
    }
    if (!skip.has('boat')) {
      log.push(await walk(bot, sdk, 3029, 3217, 3, 'church->Port Sarim seamen'));
      log.push({ seaman: await talk(bot, sdk, /captain tobias|seaman/i, [/karamja|journey|yes|ok/i]) });
      for (let i = 0; i < 40 && p().worldX < 2900 === false && p().worldZ > 3180; i++) { await sleep(500); const d = sdk.getState().dialog; if (d.isOpen && d.options.length <= 1) await sdk.sendClickDialog(0); }
      log.push(`after boat ${p().worldX},${p().worldZ}`);
      const plank = (await sdk.scanNearbyLocs(6)).find((l: any) => /gangplank/i.test(l.name));
      if (plank) { await sdk.sendInteractLoc(plank.x, plank.z, plank.id, 1); await sleep(3000); }
      log.push(`landed ${p().worldX},${p().worldZ}`);
    }
    log.push(await walk(bot, sdk, 2742, 3235, 1, 'Musa Point->Brimhaven whistle spot'));
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], equip: sdk.getState().equipment.map((e: any) => e.name), coins: sdk.findInventoryItem(/^coins$/i)?.count };
};
