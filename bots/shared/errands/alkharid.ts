// Al Kharid: pay the toll, buy a mithril scimitar from Zeke, and kebabs from Karim.
import { walk } from '../travel';
import { talk, buy, sleep, startGuard } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const coins = () => sdk.findInventoryItem(/^coins$/i)?.count ?? 0;
  const guard = startGuard(bot, sdk);
  try {
    if (p().worldX < 3268) {
      log.push(await walk(bot, sdk, 3267, 3228, 1, 'Varrock->toll gate'));
      const gate = (await sdk.scanNearbyLocs(5)).find((l: any) => /gate/i.test(l.name));
      if (!gate) throw new Error('no toll gate');
      await sdk.sendInteractLoc(gate.x, gate.z, gate.id, 1);
      for (let i = 0; i < 20; i++) {
        await sleep(500);
        const d = sdk.getState().dialog;
        if (!d.isOpen) continue;
        const yes = d.options.find((o: any) => /yes/i.test(o.text));
        if (yes) { await sdk.clickDialogByText(/yes/i); break; }
        await sdk.sendClickDialog(0);
      }
      for (let i = 0; i < 20 && p().worldX < 3268; i++) await sleep(500);
      await bot.dismissBlockingUI();
      log.push(`through gate ${p().worldX},${p().worldZ} coins ${coins()}`);
    }
    if (!sdk.findInventoryItem(/mithril scimitar/i)) {
      log.push(await walk(bot, sdk, 3287, 3187, 2, 'gate->Zeke'));
      log.push(await buy(bot, /zeke/i, /^mithril scimitar$/i, 1));
    }
    const kebabs = () => sdk.getInventory().filter((i: any) => /kebab/i.test(i.name)).length;
    const want = args?.kebabs ?? 12;
    if (kebabs() < want) {
      log.push(await walk(bot, sdk, 3273, 3181, 2, 'Zeke->Karim'));
      for (let i = 0; i < want + 4 && kebabs() < want; i++) {
        await talk(bot, sdk, /karim/i, [/yes/i]);
      }
      log.push(`kebabs ${kebabs()}`);
    }
  } finally {
    guard.stop();
  }
  return { log, coins: coins(), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
