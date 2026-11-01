// West leg, part 1: Draynor (start Vampire Slayer, garlic) and Port Sarim
// (earth runes from Betty, cheese and food, beer). Re-runnable: steps skip when done.
import { walk } from '../travel';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const count = (re: RegExp) => sdk.findInventoryItem(re)?.count ?? 0;
  const plane = () => sdk.getState().player.level;
  const waitPlane = async (from: number) => { for (let i = 0; i < 30 && plane() === from; i++) await sleep(400); };

  // Talk and pick options by preference; logs every choice.
  const talk = async (npc: RegExp, prefs: RegExp[]) => {
    const t = await bot.talkTo(npc);
    const seen: string[] = [];
    if (!t.success) return `${npc}: ${t.message}`;
    for (let i = 0; i < 40; i++) {
      const d = sdk.getState().dialog;
      if (!d.isOpen) { await sleep(600); if (!sdk.getState().dialog.isOpen) break; continue; }
      const opts = d.options.filter((o: any) => !/continue/i.test(o.text)).map((o: any) => o.text);
      if (opts.length) {
        let pick: string | undefined;
        for (const p of prefs) { pick = opts.find((o: string) => p.test(o)); if (pick) break; }
        pick ??= opts[0];
        seen.push('> ' + pick);
        await sdk.clickDialogByText(new RegExp('^' + esc(pick!) + '$', 'i'));
      } else {
        await sdk.sendClickDialog(0);
      }
      await sleep(350);
    }
    return seen;
  };
  const buy = async (npc: RegExp, item: RegExp, n: number) => {
    const o = await bot.openShop(npc);
    if (!o.success) return `openShop ${npc}: ${o.message}`;
    const r = await bot.buyFromShop(item, n);
    await bot.closeShop();
    return `buy ${item} x${n}: ${r.message}`;
  };

  // ---- Draynor: Vampire Slayer start + garlic ----
  if (!has(/^garlic$/i)) {
    log.push(await walk(bot, sdk, 3098, 3268, 2, 'to Morgan'));
    if (!args?.skipMorgan) log.push({ morgan: await talk(/^morgan$/i, [/vampire|help|yes|ok|accept/i]) });
    const stairs = (await sdk.scanNearbyLocs(8)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /up/i.test(o)));
    if (!stairs) throw new Error('no staircase up in Morgan\'s house');
    const p0 = plane();
    await bot.interactLoc(stairs, /climb.?up|up/i);
    await waitPlane(p0);
    let cup = (await sdk.scanNearbyLocs(6)).find((l: any) => /cupboard/i.test(l.name));
    if (!cup) throw new Error('no cupboard upstairs');
    if (cup.options.some((o: string) => /^open$/i.test(o))) {
      await bot.interactLoc(cup, 'Open');
      await sleep(1500);
      cup = (await sdk.scanNearbyLocs(6)).find((l: any) => /cupboard/i.test(l.name));
    }
    await bot.interactLoc(cup, /search/i);
    for (let i = 0; i < 15 && !has(/^garlic$/i); i++) await sleep(400);
    log.push(`garlic ${has(/^garlic$/i)}`);
    const down = (await sdk.scanNearbyLocs(8)).find((l: any) => /stair/i.test(l.name) && l.options.some((o: string) => /down/i.test(o)));
    const p1 = plane();
    if (down) { await bot.interactLoc(down, /climb.?down|down/i); await waitPlane(p1); }
  }

  // ---- Port Sarim ----
  if (count(/^earth rune$/i) < 6) {
    log.push(await walk(bot, sdk, 3013, 3258, 2, 'Draynor->Betty'));
    log.push(await buy(/^betty$/i, /^earth rune$/i, 6));
  }
  if (!has(/^beer$/i)) {
    log.push(await walk(bot, sdk, 3045, 3256, 2, 'Betty->Rusty Anchor'));
    const r = await buy(/bartender/i, /^beer$/i, 2);
    log.push(r);
    if (!has(/^beer$/i)) log.push({ bar: await talk(/bartender/i, [/beer|ale|drink|asgarnian/i]) });
  }
  if (!has(/^cheese$/i)) {
    log.push(await walk(bot, sdk, 3014, 3206, 2, 'Rusty Anchor->Wydin'));
    log.push(await buy(/wydin/i, /^cheese$/i, 2));
    log.push(await buy(/wydin/i, /^bread$/i, 4));
  }
  return { log, coins: count(/^coins$/i), inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
