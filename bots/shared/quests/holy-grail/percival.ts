// Holy Grail: whistle back to Karamja, boat Musa Point -> Port Sarim (customs officer),
// Goblin Village sacks (2960, 3507) op2 -> Sir Percival "Your father wishes to speak to you."
import { walk } from '../../travel';
import { talk, sleep, startGuard } from '../../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const p = () => sdk.getState().player;
  const inv = (re: RegExp) => sdk.findInventoryItem(re);
  const guard = startGuard(bot, sdk);
  const clickAll = async (prefs: RegExp[], ms = 40_000) => {
    const end = Date.now() + ms; let idle = 0; const seen: string[] = [];
    while (Date.now() < end && idle < 8) {
      const d = sdk.getState().dialog;
      if (!d.isOpen) { idle++; await sleep(500); continue; }
      idle = 0;
      let o: any;
      for (const pr of prefs) { o = d.options.find((x: any) => pr.test(x.text)); if (o) break; }
      if (!o && d.options.length > 1) o = d.options.find((x: any) => !/^no\b/i.test(x.text));
      if (o && d.options.length > 1) { seen.push('> ' + o.text); await sdk.clickDialogByText(new RegExp('^' + o.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')); }
      else await sdk.sendClickDialog(0);
      await sleep(450);
    }
    return seen;
  };
  try {
    if (p().worldZ > 4000) {
      for (let i = 0; i < 2 && p().level > 0; i++) {
        const st = (await sdk.scanNearbyLocs(15)).filter((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /down/i.test(o))).sort((a: any, b: any) => a.distance - b.distance)[0];
        if (!st) break; const lv = p().level; await bot.interactLoc(st, /down/i);
        for (let k = 0; k < 20 && p().level === lv; k++) await sleep(400);
      }
      const w = inv(/magic whistle/i);
      await sdk.sendUseItem(w.slot, w.optionsWithIndex?.find((o: any) => /blow/i.test(o.text))?.opIndex ?? 1);
      for (let i = 0; i < 15 && p().worldZ > 4000; i++) await sleep(500);
      await bot.dismissBlockingUI();
      log.push(`Karamja ${p().worldX},${p().worldZ}`);
    }
    if (!skip.has('boat') && p().worldX < 2990) {
      log.push(await walk(bot, sdk, 2954, 3147, 3, 'Brimhaven->Musa Point dock'));
      log.push({ customs: await talk(bot, sdk, /customs officer/i, [/journey|port sarim/i, /search|ok|yes/i]) });
      log.push({ more: await clickAll([/yes|ok|search/i], 20_000) });
      for (let i = 0; i < 30 && p().worldX < 3000; i++) await sleep(500);
      const plank = (await sdk.scanNearbyLocs(6)).find((l: any) => /gangplank/i.test(l.name));
      if (plank && p().worldX > 3000) { await sdk.sendInteractLoc(plank.x, plank.z, plank.id, 1); await sleep(3000); }
      log.push(`Port Sarim ${p().worldX},${p().worldZ}`);
    }
    if (!skip.has('sacks')) {
      log.push(await walk(bot, sdk, 2960, 3509, 2, 'Port Sarim->Goblin Village sacks'));
      const sack = (await sdk.scanNearbyLocs(5)).find((l: any) => /sack/i.test(l.name) && l.x === 2960 && l.z === 3507) ?? (await sdk.scanNearbyLocs(5)).find((l: any) => /sack/i.test(l.name));
      log.push(`sack ${sack?.x},${sack?.z} [${sack?.options?.join('/')}]`);
      if (sack) {
        const op = sack.optionsWithIndex?.find((o: any) => /open|search/i.test(o.text))?.opIndex ?? 2;
        await sdk.sendInteractLoc(sack.x, sack.z, sack.id, op);
        await sleep(2000);
        log.push({ percival: await clickAll([/father wishes to speak/i], 40_000) });
      }
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], whistles: sdk.getInventory().filter((i: any) => /whistle/i.test(i.name)).length, coins: inv(/^coins$/i)?.count };
};
