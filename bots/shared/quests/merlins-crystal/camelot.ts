// Merlin's Crystal opening at Camelot (Arthur -> Gawain -> Lancelot upstairs), then rope
// from Arhein's store in Catherby. Keep Le Faye (Sir Mordred, level 39) waits until after
// Waterfall Quest.
import { walk } from '../../travel';
import { talk, buy, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);

  if (!skip.has('arthur')) {
    log.push(await walk(bot, sdk, 2764, 3513, 2, 'Taverley->King Arthur'));
    log.push({ arthur: await talk(bot, sdk, /king arthur/i, [/knight of the round table/i]) });
  }
  if (!skip.has('gawain')) {
    log.push(await walk(bot, sdk, 2763, 3507, 2, 'Arthur->Gawain'));
    log.push({ gawain: await talk(bot, sdk, /sir gawain/i, [/how merlin got trapped/i, /stronghold/i, /thank/i]) });
  }
  if (!skip.has('lancelot')) {
    // Lancelot is upstairs at (2759, 3515, 1): nearest staircase up.
    const stairs = (await sdk.scanNearbyLocs(20))
      .filter((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)))
      .sort((a: any, b: any) => Math.max(Math.abs(a.x - 2759), Math.abs(a.z - 3515)) - Math.max(Math.abs(b.x - 2759), Math.abs(b.z - 3515)))[0];
    if (!stairs) throw new Error('no staircase up near Lancelot');
    log.push(`stairs at ${stairs.x},${stairs.z}`);
    const p0 = sdk.getState().player.level;
    await bot.interactLoc(stairs, /climb.?up|up/i);
    await waitPlane(sdk, p0);
    log.push({ lancelot: await talk(bot, sdk, /sir lancelot/i, [/stronghold/i, /get merlin out/i]) });
    const down = (await sdk.scanNearbyLocs(15)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /down/i.test(o)));
    const p1 = sdk.getState().player.level;
    if (down) { await bot.interactLoc(down, /climb.?down|down/i); await waitPlane(sdk, p1); }
  }
  if (!sdk.findInventoryItem(/^rope$/i)) {
    log.push(await walk(bot, sdk, 2804, 3431, 2, 'Camelot->Arhein'));
    log.push(await buy(bot, /arhein/i, /^rope$/i, 1));
  }
  const p = sdk.getState().player;
  return { log, pos: [p.worldX, p.worldZ, p.level], coins: sdk.findInventoryItem(/^coins$/i)?.count, rope: !!sdk.findInventoryItem(/^rope$/i) };
};
