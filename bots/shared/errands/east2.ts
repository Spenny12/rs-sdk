// East leg part 2 (Varrock): earth/water runes (GE, Aubury), Dr Harlow's stake (needs beer),
// King Roald (Priest in Peril check).
import { walk } from '../travel';
import { talk, buy, sleep, startGuard } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const count = (re: RegExp) => sdk.findInventoryItem(re)?.count ?? 0;
  const guard = startGuard(bot, sdk);
  try {
    if (!skip.has('ge') && (count(/^earth rune$/i) < 6 || count(/^water rune$/i) < 6)) {
      log.push(await walk(bot, sdk, 3182, 3442, 2, 'Port Sarim->GE'));
      const table = sdk.getState().nearbyLocs.find((l: any) => /grand exchange table/i.test(l.name));
      await bot.interactLoc(table, 'Exchange');
      for (let i = 0; i < 20 && !sdk.getGEState?.(); i++) await sleep(500);
      const needE = 6 - count(/^earth rune$/i);
      if (needE > 0) log.push(`earth: ${(await bot.placeGEOffer({ item: 557, side: 'buy', quantity: needE, price: args?.earthPrice ?? 60 })).message}`);
      const needW = 6 - count(/^water rune$/i);
      if (needW > 0) log.push(`water: ${(await bot.placeGEOffer({ item: 555, side: 'buy', quantity: needW, price: args?.waterPrice ?? 60 })).message}`);
      await sleep(3000);
      log.push((await bot.collectGE()).message);
      await bot.closeInterface();
      await sleep(800);
      log.push(`runes now: earth ${count(/^earth rune$/i)} water ${count(/^water rune$/i)} air ${count(/^air rune$/i)}`);
    }
    if (!skip.has('aubury') && (count(/^earth rune$/i) < 6 || count(/^water rune$/i) < 6)) {
      log.push(await walk(bot, sdk, 3252, 3401, 3, 'GE->Aubury'));
      if (count(/^water rune$/i) < 6) log.push(await buy(bot, /aubury/i, /^water rune$/i, 6 - count(/^water rune$/i)));
      if (count(/^earth rune$/i) < 6) log.push(await buy(bot, /aubury/i, /^earth rune$/i, 6 - count(/^earth rune$/i)));
    }
    if (!skip.has('harlow') && !sdk.findInventoryItem(/stake/i)) {
      log.push(await walk(bot, sdk, 3277, 3491, 2, 'to Dr Harlow'));
      log.push({ harlow: await talk(bot, sdk, /harlow/i, [/vampire|morgan|stake|count|drink|beer|yes/i]) });
      log.push(`stake ${!!sdk.findInventoryItem(/stake/i)} hammer ${!!sdk.findInventoryItem(/hammer/i)}`);
    }
    if (!skip.has('roald')) {
      log.push(await walk(bot, sdk, 3222, 3473, 3, 'Harlow->King Roald'));
      log.push({ roald: await talk(bot, sdk, /king roald/i, [/quest|sure|drezel|news/i]) });
    }
  } finally {
    guard.stop();
  }
  return { log, coins: count(/^coins$/i), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
