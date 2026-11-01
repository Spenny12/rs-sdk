// Merlin's Crystal ritual items: wax (insect repellent on the beehive 2755, 3440, then
// bucket on it), black candle (candle maker 2800, 3439: ask for a black candle, then
// hand over the wax).
import { walk } from '../../travel';
import { talk, sleep, startGuard } from '../../lib';

export default async ({ bot, sdk }: any) => {
  const log: any[] = [];
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk);
  try {
    if (!inv(/wax/i) && !inv(/black candle/i)) {
      log.push(await walk(bot, sdk, 2755, 3442, 2, 'keep->beehive'));
      const hive = (await sdk.scanNearbyLocs(5)).find((l: any) => /hive/i.test(l.name));
      log.push(`hive ${hive?.name} ${hive?.x},${hive?.z} [${hive?.options?.join('/')}]`);
      if (hive && inv(/insect repellent/i)) {
        await sdk.sendUseItemOnLoc(inv(/insect repellent/i).slot, hive.x, hive.z, hive.id);
        await sleep(3500);
        await bot.dismissBlockingUI();
      }
      if (hive && inv(/^bucket$/i)) {
        await sdk.sendInteractLoc(hive.x, hive.z, hive.id, 1);
        for (let i = 0; i < 15 && !inv(/wax/i); i++) await sleep(500);
        await bot.dismissBlockingUI();
      }
      log.push(`wax ${!!inv(/wax/i)} msgs: ${sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text).join(' | ')}`);
    }
    if (!inv(/black candle/i)) {
      log.push(await walk(bot, sdk, 2800, 3440, 2, 'beehive->candle maker'));
      log.push({ candle1: await talk(bot, sdk, /candle maker/i, [/black candle/i, /yes/i]) });
      if (!inv(/black candle/i) && inv(/wax/i)) log.push({ candle2: await talk(bot, sdk, /candle maker/i, [/black candle/i, /yes/i]) });
      log.push(`black candle ${!!inv(/black candle/i)}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, inv: sdk.getInventory().map((i: any) => i.name).filter((n: string) => /wax|candle|bucket|repellent|bone/i.test(n)) };
};
