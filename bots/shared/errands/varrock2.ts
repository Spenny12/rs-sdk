// Sell cowhides at the Varrock GE, then leather gloves (Thessalia) and a beer
// (Blue Moon bartender, dialog only - no Trade option).
import { walk } from '../travel';
import { talk, buy, sleep, startGuard } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const coins = () => sdk.findInventoryItem(/^coins$/i)?.count ?? 0;
  const hides = () => sdk.getInventory().filter((i: any) => /^cowhide$/i.test(i.name)).length;
  const guard = startGuard(bot, sdk);
  try {
    if (hides() > 0) {
      log.push(await walk(bot, sdk, 3182, 3442, 2, 'cows->GE'));
      const table = sdk.getState().nearbyLocs.find((l: any) => /grand exchange table/i.test(l.name));
      log.push((await bot.interactLoc(table, 'Exchange')).message);
      for (let i = 0; i < 20 && !sdk.getGEState?.(); i++) await sleep(500);
      const n = hides();
      const p = await bot.placeGEOffer({ item: 1739, side: 'sell', quantity: n, price: args?.price ?? 55 });
      log.push(`sell ${n}: ${p.message}`);
      await sleep(4000);
      log.push((await bot.collectGE()).message);
      await bot.closeInterface();
      await sleep(1000);
    }
    log.push(`coins ${coins()}`);
    if (!sdk.findInventoryItem(/leather gloves/i) && !sdk.getState().equipment.some((e: any) => /leather gloves/i.test(e.name))) {
      log.push(await walk(bot, sdk, 3204, 3416, 2, 'GE->Thessalia'));
      log.push(await buy(bot, /thessalia/i, /^leather gloves$/i, 1));
    }
    if (!sdk.findInventoryItem(/^beer$/i)) {
      log.push(await walk(bot, sdk, 3226, 3399, 3, 'Thessalia->Blue Moon'));
      log.push({ bar: await talk(bot, sdk, /bartender/i, [/beer|ale|drink/i]) });
    }
  } finally {
    guard.stop();
  }
  return { log, coins: coins(), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
