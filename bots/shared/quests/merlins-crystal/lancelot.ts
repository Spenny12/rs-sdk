// Merlin's Crystal: find Sir Lancelot upstairs in Camelot (2759, 3515, level 1) by trying
// each up-staircase nearby, then buy a rope at Arhein's (Catherby).
import { walk } from '../../travel';
import { talk, buy, sleep, startGuard, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  try {
    if (!args?.skipLancelot) {
      log.push(await walk(bot, sdk, 2757, 3512, 3, 'to Camelot (Lancelot)'));
      const ups = (await sdk.scanNearbyLocs(20))
        .filter((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)))
        .sort((a: any, b: any) => Math.max(Math.abs(a.x - 2759), Math.abs(a.z - 3515)) - Math.max(Math.abs(b.x - 2759), Math.abs(b.z - 3515)));
      log.push(`staircases: ${ups.map((s: any) => `${s.x},${s.z}`).join(' ')}`);
      let found = false;
      for (const s of ups.slice(0, 4)) {
        const lv = p().level;
        await bot.interactLoc(s, /climb.?up|up/i);
        await waitPlane(sdk, lv);
        await sleep(800);
        const lance = sdk.getState().nearbyNpcs.find((n: any) => /lancelot/i.test(n.name));
        log.push(`up via ${s.x},${s.z}: level ${p().level}, lancelot ${lance ? `${lance.x},${lance.z} reach ${lance.reachable}` : 'no'}`);
        if (lance && lance.reachable !== false) {
          log.push({ lancelot: await talk(bot, sdk, /sir lancelot/i, [/stronghold/i, /get merlin out/i]) });
          found = true;
        }
        const down = (await sdk.scanNearbyLocs(15)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /down/i.test(o)));
        const lv2 = p().level;
        if (down && lv2 > 0) { await bot.interactLoc(down, /climb.?down|down/i); await waitPlane(sdk, lv2); }
        if (found) break;
      }
    }
    if (!sdk.findInventoryItem(/^rope$/i)) {
      log.push(await walk(bot, sdk, 2804, 3431, 2, 'Camelot->Arhein'));
      log.push(await buy(bot, /arhein/i, /^rope$/i, 1));
    }
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], coins: sdk.findInventoryItem(/^coins$/i)?.count, rope: !!sdk.findInventoryItem(/^rope$/i) };
};
