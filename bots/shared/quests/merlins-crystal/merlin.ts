// Merlin's Crystal finale + Holy Grail start. Light the black candle (tinderbox on candle),
// drop bat bones on the magic symbol (2780, 3515) -> Thrantax: "Snarthon Candtrick Termanto",
// Excalibur on the crystal (2767, 3493, level 2), then King Arthur twice.
import { walk } from '../../travel';
import { talk, sleep, startGuard, waitPlane } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk);
  const clickWords = async () => {
    const end = Date.now() + 60_000; let idle = 0; const seen: string[] = [];
    while (Date.now() < end && idle < 10) {
      const d = sdk.getState().dialog;
      if (!d.isOpen) { idle++; await sleep(500); continue; }
      idle = 0;
      const o = d.options.find((x: any) => /snarthon candtrick termanto/i.test(x.text));
      if (o) { seen.push('> ' + o.text); await sdk.clickDialogByText(/snarthon candtrick termanto/i); }
      else await sdk.sendClickDialog(0);
      await sleep(450);
    }
    return seen;
  };
  try {
    if (!skip.has('ritual')) {
      log.push(await walk(bot, sdk, 2780, 3515, 0, 'Draynor->magic symbol'));
      if (!inv(/lit black candle/i)) {
        await sdk.sendUseItemOnItem(inv(/tinderbox/i).slot, inv(/black candle/i).slot);
        for (let i = 0; i < 10 && !inv(/lit black candle/i); i++) await sleep(500);
      }
      log.push(`lit candle ${!!inv(/lit black candle/i)} pos ${p().worldX},${p().worldZ}`);
      await sdk.sendDropItem(inv(/bat bones/i).slot);
      await sleep(2500);
      log.push({ thrantax: await clickWords(), msgs: sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text) });
    }
    if (!skip.has('crystal')) {
      log.push(await walk(bot, sdk, 2767, 3496, 3, 'symbol->crystal tower'));
      for (let i = 0; i < 3 && p().level < 2; i++) {
        const st = (await sdk.scanNearbyLocs(15)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /up/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
        if (!st) break;
        const lv = p().level;
        await bot.interactLoc(st, /up/i);
        await waitPlane(sdk, lv);
      }
      const crystal = (await sdk.scanNearbyLocs(15)).find((l: any) => /crystal/i.test(l.name));
      log.push(`level ${p().level}; crystal ${crystal ? `${crystal.x},${crystal.z}` : 'none'}`);
      if (crystal) {
        await sdk.sendUseItemOnLoc(inv(/excalibur/i).slot, crystal.x, crystal.z, crystal.id);
        await sleep(4000);
        await bot.dismissBlockingUI();
        log.push(`msgs: ${sdk.getState().gameMessages?.slice(-3).map((m: any) => m.text).join(' | ')}`);
      }
      for (let i = 0; i < 3 && p().level > 0; i++) {
        const st = (await sdk.scanNearbyLocs(15)).filter((l: any) => /stair|ladder/i.test(l.name) && l.options.some((o: string) => /down/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
        if (!st) break;
        const lv = p().level;
        await bot.interactLoc(st, /down/i);
        await waitPlane(sdk, lv);
      }
    }
    if (!skip.has('arthur')) {
      log.push(await walk(bot, sdk, 2764, 3513, 2, 'to King Arthur'));
      log.push({ arthur1: await talk(bot, sdk, /king arthur/i, [/freed merlin/i]) });
      await sleep(2000);
      log.push({ arthur2: await talk(bot, sdk, /king arthur/i, [/tell me of this quest/i, /enjoy trying/i]) });
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ, p().level], msgs: sdk.getState().gameMessages?.slice(-4).map((m: any) => m.text) };
};
