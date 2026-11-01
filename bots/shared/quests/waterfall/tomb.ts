// Waterfall Quest part 3: leave the gnome dungeon, bank the scimitar (the tomb refuses
// weapons, armour, runes, arrows, axes, pickaxes, logs), enter Glarial's tomb with the
// pebble, take the amulet (chest) and urn (coffin), climb out, get the scimitar back.
import { walk } from '../../travel';
import { sleep, startGuard } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const bank: [number, number] = args?.bank ?? [2616, 3332]; // Ardougne north bank
  const guard = startGuard(bot, sdk);
  try {
    // Out of the gnome dungeon.
    if (p().worldZ > 9000 && p().worldZ < 9700) {
      log.push(await walk(bot, sdk, 2533, 9556, 1, 'Golrie->dungeon ladder'));
      const lad = (await sdk.scanNearbyLocs(5)).find((l: any) => /ladder/i.test(l.name));
      if (lad) { await bot.interactLoc(lad, /climb.?up|up/i); for (let i = 0; i < 25 && p().worldZ > 9000; i++) await sleep(400); }
    }
    // Bank anything the tomb refuses.
    if (!sdk.findInventoryItem(/glarial's amulet/i)) {
      log.push(await walk(bot, sdk, bank[0], bank[1], 3, 'to bank (drop weapon)'));
      const o = await bot.openBank();
      log.push(o.message);
      if (o.success) {
        await bot.closeBank();
        for (const e of sdk.getState().equipment) if (/scimitar|sword|shield|gloves|helm|body|legs/i.test(e.name)) await bot.unequipItem(e.name);
        await bot.openBank();
        for (const re of [/scimitar/i, /sword/i, /rune$/i, /arrow/i, /axe/i, /pickaxe/i, /logs/i, /gloves/i, /shield/i])
          if (sdk.findInventoryItem(re)) log.push((await bot.depositItem(re, -1)).message);
        await bot.closeBank();
      }
      log.push(`equipped now: ${sdk.getState().equipment.map((e: any) => e.name).join(', ') || 'nothing'}`);

      log.push(await walk(bot, sdk, 2558, 3445, 1, 'bank->Glarial tombstone'));
      const peb = sdk.findInventoryItem(/pebble/i);
      await sdk.sendUseItemOnLoc(peb.slot, 2558, 3444, 1992);
      for (let i = 0; i < 25 && p().worldZ < 9000; i++) await sleep(400);
      await bot.dismissBlockingUI();
      log.push(`tomb ${p().worldX},${p().worldZ} msgs: ${sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text).join(' | ')}`);
      if (p().worldZ < 9000) throw new Error('did not enter the tomb');

      log.push(await walk(bot, sdk, 2530, 9845, 1, 'tomb->chest'));
      let chest = (await sdk.scanNearbyLocs(4)).find((l: any) => /chest/i.test(l.name));
      if (chest?.options.some((o: string) => /^open$/i.test(o))) { await bot.interactLoc(chest, 'Open'); await sleep(1500); chest = (await sdk.scanNearbyLocs(4)).find((l: any) => /chest/i.test(l.name)); }
      if (chest) await bot.interactLoc(chest, /search/i);
      for (let i = 0; i < 12 && !sdk.findInventoryItem(/glarial's amulet/i); i++) await sleep(400);
      await bot.dismissBlockingUI();
      log.push(`amulet ${!!sdk.findInventoryItem(/glarial's amulet/i)}`);
    }
    if (!sdk.findInventoryItem(/urn/i)) {
      log.push(await walk(bot, sdk, 2542, 9812, 1, 'chest->coffin'));
      const coffin = (await sdk.scanNearbyLocs(4)).find((l: any) => /tomb|coffin/i.test(l.name));
      if (coffin) await bot.interactLoc(coffin, /search/i);
      for (let i = 0; i < 12 && !sdk.findInventoryItem(/urn/i); i++) await sleep(400);
      await bot.dismissBlockingUI();
      log.push(`urn ${!!sdk.findInventoryItem(/urn/i)}`);
    }
    // Climb out: ladder near the arrival point.
    if (p().worldZ > 9000) {
      log.push(await walk(bot, sdk, 2554, 9844, 3, 'coffin->tomb ladder'));
      const lad = (await sdk.scanNearbyLocs(10)).find((l: any) => /ladder/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)));
      if (lad) { await bot.interactLoc(lad, /climb.?up|up/i); for (let i = 0; i < 25 && p().worldZ > 9000; i++) await sleep(400); }
      log.push(`out ${p().worldX},${p().worldZ}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], hp: `${p().hp}/${p().maxHp}`, inv: sdk.getInventory().map((i: any) => i.name) };
};
