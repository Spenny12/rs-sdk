// East leg part 1: Ardougne bank (scimitar, beer, garlic) + bread, Lady of the Lake,
// Port Sarim: Betty (water/earth runes), jeweller's door -> beggar (bread) -> Excalibur.
import { walk } from '../travel';
import { talk, buy, sleep, startGuard, setMeleeStyle } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const skip = new Set<string>(args?.skip ?? []);
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const count = (re: RegExp) => sdk.findInventoryItem(re)?.count ?? 0;
  const guard = startGuard(bot, sdk);
  try {
    if (!skip.has('bank') && !has(/steel scimitar/i) && !sdk.getState().equipment.some((e: any) => /scimitar/i.test(e.name))) {
      log.push(await walk(bot, sdk, 2616, 3333, 3, 'tombstone->Ardougne bank'));
      const o = await bot.openBank();
      log.push(o.message);
      for (const re of [/^steel scimitar$/i, /^beer$/i, /^garlic$/i]) {
        if (sdk.findBankItem(re)) log.push((await bot.withdrawItem(re, 1)).message);
      }
      await bot.closeBank();
      await bot.equipItem(/steel scimitar/i);
      await sleep(1000);
      log.push(`style -> ${await setMeleeStyle(sdk)}`);
    }
    if (!skip.has('bread') && count(/^bread$/i) < 1 && sdk.getInventory().filter((i: any) => /^bread$/i.test(i.name)).length < 1) {
      log.push(await walk(bot, sdk, 2668, 3311, 3, 'bank->baker'));
      log.push(await buy(bot, /baker/i, /^bread$/i, 2));
    }
    if (!skip.has('lady')) {
      log.push(await walk(bot, sdk, 2924, 3404, 2, 'Ardougne->Lady of the Lake'));
      log.push({ lady: await talk(bot, sdk, /lady of the lake/i, [/excalibur/i]) });
    }
    if (count(/^water rune$/i) < 6 || count(/^earth rune$/i) < 6) {
      log.push(await walk(bot, sdk, 3013, 3258, 2, 'Taverley->Betty'));
      if (count(/^water rune$/i) < 6) log.push(await buy(bot, /^betty$/i, /^water rune$/i, 6 - count(/^water rune$/i)));
      if (count(/^earth rune$/i) < 6) log.push(await buy(bot, /^betty$/i, /^earth rune$/i, 6 - count(/^earth rune$/i)));
      if (count(/^air rune$/i) < 6) log.push(await buy(bot, /^betty$/i, /^air rune$/i, 6 - count(/^air rune$/i)));
    }
    if (!skip.has('beggar') && !has(/excalibur/i)) {
      log.push(await walk(bot, sdk, 3016, 3245, 1, 'Betty->jeweller door'));
      await sdk.sendInteractLoc(3016, 3246, 59, 1);
      const end = Date.now() + 40_000;
      const seen: string[] = [];
      while (Date.now() < end && !has(/excalibur/i)) {
        const d = sdk.getState().dialog;
        if (d.isOpen) {
          const opt = d.options.find((o: any) => /yes/i.test(o.text));
          if (opt) { seen.push('> ' + opt.text); await sdk.clickDialogByText(new RegExp('^' + opt.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')); }
          else await sdk.sendClickDialog(0);
        }
        await sleep(450);
      }
      await bot.dismissBlockingUI();
      log.push({ beggar: seen, excalibur: has(/excalibur/i) });
    }
  } finally {
    guard.stop();
  }
  return { log, coins: count(/^coins$/i), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`), equip: sdk.getState().equipment.map((e: any) => e.name) };
};
