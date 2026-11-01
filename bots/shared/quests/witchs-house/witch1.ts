// Witch's House, everything except the shapeshifter fight (done after Waterfall Quest).
// Server version: key under the flower pot, gloves for the basement iron gate, magnet
// from the basement cupboard, cheese on the mouse hole + magnet on the mouse unlocks
// the back door, fountain "Search" gives the shed key (no combination).
import { walk } from '../../travel';
import { talk, sleep, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const worn = (re: RegExp) => sdk.getState().equipment.some((e: any) => re.test(e.name));
  const loc = async (re: RegExp, r = 10) => (await sdk.scanNearbyLocs(r)).find((l: any) => re.test(l.name));

  if (!args?.skipBoy) {
    log.push(await walk(bot, sdk, 2928, 3457, 2, 'to ball boy'));
    log.push({ boy: await talk(bot, sdk, /^boy$/i, [/help|what|ball|yes|ok|sure/i]) });
  }

  if (!has(/door key/i)) {
    log.push(await walk(bot, sdk, 2900, 3475, 1, 'boy->pot'));
    const pot = (await sdk.scanNearbyLocs(4)).find((l: any) => l.x === 2900 && l.z === 3474);
    if (!pot) throw new Error('flower pot not found at (2900, 3474)');
    log.push((await bot.interactLoc(pot, 1)).message);
    for (let i = 0; i < 10 && !has(/door key/i); i++) await sleep(400);
    await bot.dismissBlockingUI();
    log.push(`key ${has(/door key/i)}`);
  }

  if (!worn(/leather gloves/i) && has(/leather gloves/i)) await bot.equipItem(/leather gloves/i);

  // Enter through the front door with the key (the door script teleports us through).
  const p0 = sdk.getState().player;
  if (p0.worldZ >= 3473) {
    const door = (await sdk.scanNearbyLocs(4)).find((l: any) => l.x === 2901 && l.z === 3473);
    log.push((await bot.useItemOnLoc(sdk.findInventoryItem(/door key/i), door)).message);
    for (let i = 0; i < 15 && sdk.getState().player.worldZ >= 3473; i++) await sleep(400);
    log.push(`inside ${sdk.getState().player.worldZ < 3473}`);
  }

  if (!has(/magnet/i)) {
    const ladder = await loc(/ladder/i, 10);
    if (!ladder) throw new Error('no ladder in the witch\'s house');
    const pl = sdk.getState().player.level;
    const z0 = sdk.getState().player.worldZ;
    await bot.interactLoc(ladder, /climb.?down|down/i);
    for (let i = 0; i < 30 && sdk.getState().player.worldZ === z0; i++) await sleep(400);
    log.push(`basement at ${sdk.getState().player.worldX},${sdk.getState().player.worldZ}`);
    const w = await bot.walkTo(2898, 9874, 1, { timeout: 60_000 });
    log.push(`to cupboard: ${w.message}`);
    let cb = await loc(/cupboard/i, 6);
    if (cb && cb.options.some((o: string) => /^open$/i.test(o))) { await bot.interactLoc(cb, 'Open'); await sleep(1500); cb = await loc(/cupboard/i, 6); }
    if (cb) await bot.interactLoc(cb, /search/i);
    for (let i = 0; i < 10 && !has(/magnet/i); i++) await sleep(400);
    await bot.dismissBlockingUI();
    log.push(`magnet ${has(/magnet/i)}`);
    const up = await loc(/ladder/i, 15);
    const zb = sdk.getState().player.worldZ;
    if (up) { await bot.walkTo(up.x, up.z, 1); await bot.interactLoc(up, /climb.?up|up/i); }
    for (let i = 0; i < 30 && sdk.getState().player.worldZ === zb; i++) await sleep(400);
  }

  // Mouse: cheese on the hole, magnet on the mouse -> back door unlocks.
  if (has(/magnet/i)) {
    const hole = (await sdk.scanNearbyLocs(10)).find((l: any) => l.x === 2903 && l.z === 3466);
    log.push((await bot.useItemOnLoc(sdk.findInventoryItem(/^cheese$/i), hole)).message);
    await sleep(1500);
    await bot.dismissBlockingUI();
    const rat = sdk.findNearbyNpc(/mouse|rat/i);
    if (rat) log.push((await bot.useItemOnNpc(sdk.findInventoryItem(/magnet/i), rat)).message);
    await sleep(1500);
    await bot.dismissBlockingUI();
    log.push(`magnet used ${!has(/magnet/i)}`);
  }

  // Back door -> garden, fountain -> shed key.
  if (!has(/shed key|small key/i)) {
    const back = (await sdk.scanNearbyLocs(10)).find((l: any) => l.x === 2901 && l.z === 3465);
    if (back) { log.push((await bot.interactLoc(back, 1)).message); await sleep(2000); }
    const fountain = (await sdk.scanNearbyLocs(15)).find((l: any) => /fountain/i.test(l.name));
    if (fountain) log.push((await bot.interactLoc(fountain, /search/i)).message);
    for (let i = 0; i < 10 && !has(/key/i); i++) await sleep(400);
    await bot.dismissBlockingUI();
  }
  const p = sdk.getState().player;
  return { log, pos: [p.worldX, p.worldZ, p.level], hp: p.hp, inv: sdk.getInventory().map((i: any) => i.name) };
};
