// Varrock: GE buys (50 rune essence, 6 water runes) + collect old claims (2 earth runes),
// tinderbox from the general store.
import { walk } from '../travel';
import { buy, sleep, startGuard } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const count = (re: RegExp) => sdk.getInventory().filter((i: any) => re.test(i.name)).reduce((s: number, i: any) => s + i.count, 0);
  const guard = startGuard(bot, sdk);
  try {
    log.push(await walk(bot, sdk, 3182, 3442, 2, 'Port Sarim->GE'));
    const table = sdk.getState().nearbyLocs.find((l: any) => /grand exchange table/i.test(l.name));
    await bot.interactLoc(table, 'Exchange');
    for (let i = 0; i < 20 && !sdk.getGEState?.(); i++) await sleep(500);
    log.push(`collect old: ${(await bot.collectGE()).message}`);
    const ess = 50 - count(/^rune essence$/i);
    if (ess > 0) log.push(`essence: ${(await bot.placeGEOffer({ item: 1436, side: 'buy', quantity: ess, price: args?.essPrice ?? 60 })).message}`);
    const water = 6 - count(/^water rune$/i);
    if (water > 0) log.push(`water: ${(await bot.placeGEOffer({ item: 555, side: 'buy', quantity: water, price: args?.waterPrice ?? 120 })).message}`);
    await sleep(4000);
    log.push(`collect: ${(await bot.collectGE(false as any)).message}`);
    const ge = sdk.getGEState?.();
    log.push({ offers: ge?.offers?.map((o: any) => `${o.side} ${o.item} ${o.filled ?? o.completed}/${o.quantity} @${o.price}`) });
    await bot.closeInterface();
    await sleep(1000);
    log.push(`have: essence ${count(/rune essence/i)} water ${count(/^water rune$/i)} earth ${count(/^earth rune$/i)} air ${count(/^air rune$/i)}`);
    if (!sdk.findInventoryItem(/tinderbox/i)) {
      log.push(await walk(bot, sdk, 3216, 3415, 3, 'GE->general store'));
      log.push(await buy(bot, /shop keeper|shop assistant/i, /^tinderbox$/i, 1));
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, coins: count(/^coins$/i), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
