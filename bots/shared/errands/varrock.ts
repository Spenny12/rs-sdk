// Varrock errands before heading west: leather gloves (Thessalia), earth runes
// (Aubury), beer (Blue Moon Inn), and start Priest in Peril (King Roald).
import { walk } from '../travel';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async ({ bot, sdk }: any) => {
  const log: any[] = [];
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const coins = () => sdk.getInventory().find((i: any) => /^coins$/i.test(i.name))?.count ?? 0;

  const buy = async (npc: RegExp, item: RegExp, n: number) => {
    const o = await bot.openShop(npc);
    if (!o.success) { log.push(`openShop ${npc}: ${o.message}`); return; }
    const r = await bot.buyFromShop(item, n);
    log.push(`buy ${item} x${n}: ${r.message}`);
    await bot.closeShop();
  };

  if (sdk.getGEState?.()) await bot.closeInterface();
  log.push(`coins ${coins()}`);

  if (!has(/leather gloves/i)) {
    log.push(await walk(bot, sdk, 3204, 3416, 3, 'GE->Thessalia'));
    await buy(/thessalia/i, /^leather gloves$/i, 1);
  }
  if ((sdk.findInventoryItem(/^earth rune$/i)?.count ?? 0) < 10) {
    log.push(await walk(bot, sdk, 3252, 3401, 3, 'Thessalia->Aubury'));
    await buy(/aubury/i, /^earth rune$/i, 6);
  }
  if (!has(/^beer$/i)) {
    log.push(await walk(bot, sdk, 3226, 3399, 3, 'Aubury->Blue Moon'));
    await buy(/bartender/i, /^beer$/i, 2);
  }

  // Priest in Peril start.
  log.push(await walk(bot, sdk, 3222, 3473, 3, 'Blue Moon->King Roald'));
  const t = await bot.talkTo(/king roald/i);
  const seen: string[] = [];
  if (t.success) {
    for (let i = 0; i < 25; i++) {
      const d = sdk.getState().dialog;
      if (!d.isOpen) { await sleep(600); if (!sdk.getState().dialog.isOpen) break; continue; }
      const opts = d.options.filter((o: any) => !/continue/i.test(o.text)).map((o: any) => o.text);
      if (opts.length) {
        const pick = opts.find((o: string) => /quest|sure|yes/i.test(o)) ?? opts[0];
        seen.push('> ' + pick);
        await sdk.clickDialogByText(new RegExp('^' + esc(pick) + '$', 'i'));
      } else {
        await sdk.sendClickDialog(0);
      }
      await sleep(350);
    }
  }
  log.push({ roald: t.message, seen });
  log.push(`coins left ${coins()}`);
  return { log, inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
