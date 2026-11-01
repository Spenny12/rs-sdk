// Waterfall Quest part 1: Almera -> raft -> Hudon -> washed off the island ->
// Hadley's bookcase (book, read it). Coordinates from server/content/maps.
import { walk } from '../../travel';
import { talk, sleep } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const pos = () => { const p = sdk.getState().player; return [p.worldX, p.worldZ, p.level]; };
  const waitMoved = async (ms = 15_000) => {
    const [x0, z0] = pos();
    const end = Date.now() + ms;
    while (Date.now() < end) { const [x, z] = pos(); if (x !== x0 || z !== z0) return true; await sleep(400); }
    return false;
  };

  if (!skip.has('almera')) {
    log.push(await walk(bot, sdk, 2522, 3496, 2, 'Catherby->Almera'));
    log.push({ almera: await talk(bot, sdk, /almera/i, [/take a look/i, /help/i, /what's wrong|problem/i]) });
  }
  if (!skip.has('raft')) {
    log.push(await walk(bot, sdk, 2510, 3494, 1, 'Almera->raft'));
    const raft = (await sdk.scanNearbyLocs(6)).find((l: any) => /raft/i.test(l.name));
    if (!raft) throw new Error('no raft');
    log.push((await bot.interactLoc(raft, 1)).message);
    await waitMoved();
    await sleep(3000);
    await bot.dismissBlockingUI();
    log.push(`after raft ${pos()}`);
    log.push({ hudon: await talk(bot, sdk, /hudon/i, [/maybe i could help|help/i]) });
  }
  if (!skip.has('offisland')) {
    // No rope: the current washes us to the riverbank (cheapest way off the island).
    const rock = (await sdk.scanNearbyLocs(15)).find((l: any) => /rock/i.test(l.name) && l.x === 2512 && l.z === 3468);
    if (rock) {
      log.push((await bot.interactLoc(rock, 1)).message);
      await waitMoved(20_000);
      await sleep(4000);
      await bot.dismissBlockingUI();
    }
    log.push(`off island ${pos()} hp ${sdk.getState().player.hp}`);
  }
  if (!sdk.findInventoryItem(/book on baxtorian/i)) {
    log.push(await walk(bot, sdk, 2520, 3428, 3, 'river->Hadley house'));
    const stairs = (await sdk.scanNearbyLocs(10)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)));
    if (stairs) {
      const lv = sdk.getState().player.level;
      await bot.interactLoc(stairs, /climb.?up|up/i);
      for (let i = 0; i < 25 && sdk.getState().player.level === lv; i++) await sleep(400);
    }
    const bc = (await sdk.scanNearbyLocs(8)).find((l: any) => /bookcase/i.test(l.name) && l.x === 2520 && l.z === 3426);
    if (bc) log.push((await bot.interactLoc(bc, /search/i)).message);
    for (let i = 0; i < 12 && !sdk.findInventoryItem(/book on baxtorian/i); i++) await sleep(400);
    await bot.dismissBlockingUI();
  }
  const book = sdk.findInventoryItem(/book on baxtorian/i);
  if (book) {
    const opt = book.optionsWithIndex?.find((o: any) => /read/i.test(o.text));
    await sdk.sendUseItem(book.slot, opt?.opIndex ?? 1);
    await sleep(2000);
    await bot.closeInterface();
    await bot.dismissBlockingUI();
    log.push('read book');
  }
  return { log, pos: pos(), hp: sdk.getState().player.hp, inv: sdk.getInventory().map((i: any) => i.name) };
};
