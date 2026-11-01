// Leave Al Kharid, restart Vampire Slayer with Morgan and take garlic, then Port Sarim:
// cheese (Wydin) and another try at earth runes (Betty).
import { walk } from '../travel';
import { talk, buy, sleep, startGuard, waitPlane } from '../lib';

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const count = (re: RegExp) => sdk.findInventoryItem(re)?.count ?? 0;
  const guard = startGuard(bot, sdk);
  try {
    // Toll gate on the way out (the guard dialog may ask to pay).
    if (p().worldX >= 3268 && p().worldZ < 3240) {
      log.push(await walk(bot, sdk, 3268, 3228, 1, 'Zeke->toll gate'));
      const gate = (await sdk.scanNearbyLocs(5)).find((l: any) => /gate/i.test(l.name));
      if (gate) {
        await sdk.sendInteractLoc(gate.x, gate.z, gate.id, 1);
        for (let i = 0; i < 20 && p().worldX >= 3268; i++) {
          await sleep(500);
          const d = sdk.getState().dialog;
          if (d.isOpen) {
            if (d.options.some((o: any) => /yes/i.test(o.text))) await sdk.clickDialogByText(/yes/i);
            else await sdk.sendClickDialog(0);
          }
        }
        await bot.dismissBlockingUI();
      }
      log.push(`out of Al Kharid: ${p().worldX},${p().worldZ}`);
    }

    if (!args?.skipMorgan) {
      log.push(await walk(bot, sdk, 3098, 3268, 2, 'gate->Morgan'));
      log.push({ morgan: await talk(bot, sdk, /^morgan$/i, [/yes|ok|accept|help|sure/i]) });
    }
    if (!has(/^garlic$/i)) {
      const stairs = (await sdk.scanNearbyLocs(8)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)));
      if (stairs) {
        const lv = p().level;
        await bot.interactLoc(stairs, /climb.?up|up/i);
        await waitPlane(sdk, lv);
        let cup = (await sdk.scanNearbyLocs(6)).find((l: any) => /cupboard/i.test(l.name));
        if (cup?.options.some((o: string) => /^open$/i.test(o))) { await bot.interactLoc(cup, 'Open'); await sleep(1500); cup = (await sdk.scanNearbyLocs(6)).find((l: any) => /cupboard/i.test(l.name)); }
        if (cup) await bot.interactLoc(cup, /search/i);
        for (let i = 0; i < 12 && !has(/^garlic$/i); i++) await sleep(400);
        const down = (await sdk.scanNearbyLocs(8)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /down/i.test(o)));
        const lv2 = p().level;
        if (down) { await bot.interactLoc(down, /climb.?down|down/i); await waitPlane(sdk, lv2); }
      }
      log.push(`garlic ${has(/^garlic$/i)}`);
    }
    if (count(/^earth rune$/i) < 6) {
      log.push(await walk(bot, sdk, 3013, 3258, 2, 'Draynor->Betty'));
      log.push(await buy(bot, /^betty$/i, /^earth rune$/i, 6));
    }
    if (count(/^cheese$/i) < 2 && sdk.getInventory().filter((i: any) => /^cheese$/i.test(i.name)).length < 2) {
      log.push(await walk(bot, sdk, 3014, 3206, 2, 'Betty->Wydin'));
      log.push(await buy(bot, /wydin/i, /^cheese$/i, 2));
    }
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], coins: count(/^coins$/i), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
