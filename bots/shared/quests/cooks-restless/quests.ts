// Cook's Assistant + The Restless Ghost, multiquested in one route.
// Re-runnable: each step skips itself when its result is already in the inventory.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default async ({ bot, sdk, args }: any) => {
  const log: string[] = [];
  const say = (m: string) => { log.push(m); console.log(m); };
  const has = (re: RegExp) => !!sdk.findInventoryItem(re);
  const pos = () => { const p = sdk.getState().player; return [p.worldX, p.worldZ]; };

  // Click through a conversation, picking the first option that matches `prefs` (in order).
  const chat = async (prefs: RegExp[] = []) => {
    const lines: string[] = [];
    let idle = 0;
    for (let i = 0; i < 40 && idle < 6; i++) {
      const d = sdk.getState()?.dialog;
      if (!d?.isOpen) { idle++; await sleep(250); continue; }
      idle = 0;
      let pick: any = null;
      if (d.options.length > 1 || (d.options[0] && !/continue/i.test(d.options[0].text))) {
        for (const p of prefs) { pick = d.options.find((o: any) => p.test(o.text)); if (pick) break; }
        if (!pick) pick = d.options[0];
        lines.push('> ' + pick.text);
        await sdk.clickDialogByText(new RegExp('^' + esc(pick.text) + '$', 'i'));
      } else {
        await sdk.sendClickDialog(0);
      }
      await sleep(250);
    }
    return lines;
  };
  const talk = async (npc: RegExp, prefs: RegExp[] = []) => {
    const r = await bot.talkTo(npc);
    if (!r.success) throw new Error(`talkTo ${npc}: ${r.message}`);
    const l = await chat(prefs);
    say(`talk ${npc}: ${l.join(' | ')}`);
  };
  const go = async (x: number, z: number, tol = 3) => {
    // Retry: a fight (e.g. swamp spiders) stalls the walk. Retry resumes from where we stand.
    let last = '';
    for (let i = 0; i < 4; i++) {
      const r = await bot.walkTo(x, z, tol);
      if (r.success) return;
      last = r.message;
      await eatIfLow();
    }
    throw new Error(`walkTo ${x},${z}: ${last}`);
  };
  const waitPlane = async (from: number) => { for (let i = 0; i < 25 && sdk.getState().player.level === from; i++) await sleep(400); };
  const eatIfLow = async () => {
    const p = sdk.getState().player;
    if (p.hp <= 4) { const f = sdk.findInventoryItem(/shrimps|bread/i); if (f) await bot.eatFood(f); }
  };

  const step = async (name: string, fn: () => Promise<void>) => {
    const t = Date.now();
    await fn();
    say(`[ok] ${name} (${Math.round((Date.now() - t) / 1000)}s) at ${pos()}`);
  };

  // ---------- Restless Ghost part 1 (chapel is next to the castle) ----------
  const wearsAmulet = () => sdk.getState().equipment.some((e: any) => /ghostspeak/i.test(e.name));
  if (!has(/ghostspeak/i) && !wearsAmulet() && !has(/skull/i)) {
    if (!args?.skipAereck) await step('Father Aerick', async () => { await go(3244, 3209, 4); await talk(/father aereck/i, [/quest|problem/i, /yes|help|ghost/i]); });
    await step('Father Urhney', async () => { await go(3235, 3154, 2); await talk(/father urhney/i, [/ghost/i, /ghostspeak|amulet/i, /yes|help/i]); });
  }
  if (!has(/ghostspeak/i) && !sdk.getState().equipment.some((e: any) => /ghostspeak/i.test(e.name))) throw new Error('no ghostspeak amulet after Urhney');
  if (has(/ghostspeak/i)) await bot.equipItem(/ghostspeak/i);

  // ---------- Graveyard: talk to the ghost (opens the coffin first) ----------
  const coffin = async () => {
    await go(3249, 3194, 3);
    const c = sdk.findNearbyLoc(/coffin/i);
    if (!c) throw new Error('no coffin nearby');
    if (c.options.some((o: string) => /^open$/i.test(o))) {
      const r = await bot.interactLoc(c, 'Open');
      say(`coffin: ${r.message}`);
      await sleep(1500);
    }
  };
  if (!has(/skull/i)) {
    if (!args?.skipGhost) await step('Ghost talk', async () => {
      await coffin();
      const ghost = sdk.findNearbyNpc(/restless ghost/i);
      if (!ghost) throw new Error('no ghost visible');
      await talk(/restless ghost/i, [/yes|help|why/i]);
    });

    // ---------- Wizard tower basement: skull ----------
    await step('Wizard Tower basement', async () => {
      await go(3104, 3162, 2);
      const lad = sdk.findNearbyLoc(/ladder/i);
      if (!lad) throw new Error('no ladder at wizard tower');
      const r = await bot.interactLoc(lad, /climb.?down|down/i);
      say(`ladder down: ${r.message}`);
      await sleep(1200);
    });
    await step('Take skull', async () => {
      await go(3120, 9567, 2);
      const altar = (await sdk.scanNearbyLocs(15)).find((l: any) => /altar/i.test(l.name));
      if (!altar) throw new Error('no altar in basement');
      await bot.interactLoc(altar, /search/i);
      for (let i = 0; i < 12 && !has(/skull/i); i++) { await sleep(400); await eatIfLow(); }
      if (!has(/skull/i)) throw new Error('skull not obtained');
    });
    await step('Leave basement', async () => {
      await go(3104, 9576, 1);
      const lad = sdk.findNearbyLoc(/ladder/i);
      if (!lad) throw new Error('no ladder up');
      await bot.interactLoc(lad, /climb.?up|up/i);
      await sleep(1200);
      await eatIfLow();
    });
  }

  // ---------- Flour ----------
  if (!has(/pot of flour/i)) {
    await step('Grain', async () => {
      await go(3162, 3292, 4);
      const wheat = sdk.findNearbyLoc(/^wheat$/i);
      if (!wheat) throw new Error('no wheat nearby');
      await bot.interactLoc(wheat, /pick/i);
      for (let i = 0; i < 12 && !has(/^grain$/i); i++) await sleep(400);
      if (!has(/^grain$/i)) throw new Error('no grain');
    });
    await step('Mill', async () => {
      await go(3166, 3306, 3);
      let lad = sdk.findNearbyLoc(/ladder/i);
      const lv0 = sdk.getState().player.level;
      await bot.interactLoc(lad, /climb.?up|up/i);
      await waitPlane(lv0);
      let hopper = (await sdk.scanNearbyLocs(10)).find((l: any) => /hopper/i.test(l.name) && !/control/i.test(l.name));
      if (!hopper) throw new Error('no hopper upstairs');
      await bot.useItemOnLoc(sdk.findInventoryItem(/^grain$/i), hopper);
      await sleep(800);
      const ctl = (await sdk.scanNearbyLocs(10)).find((l: any) => /control/i.test(l.name));
      if (!ctl) throw new Error('no controls');
      await bot.interactLoc(ctl, 1);
      await sleep(1500);
      lad = sdk.findNearbyLoc(/ladder/i);
      const lv1 = sdk.getState().player.level;
      await bot.interactLoc(lad, /climb.?down|down/i);
      await waitPlane(lv1);
      const bin = (await sdk.scanNearbyLocs(10)).find((l: any) => /flour bin|^bin$/i.test(l.name));
      if (!bin) throw new Error('no flour bin');
      await bot.useItemOnLoc(sdk.findInventoryItem(/^pot$/i), bin);
      for (let i = 0; i < 12 && !has(/pot of flour/i); i++) await sleep(400);
      if (!has(/pot of flour/i)) throw new Error('no flour');
    });
  }

  if (!has(/^egg$/i)) {
    await step('Egg', async () => {
      await go(3231, 3296, 3);
      const egg = sdk.findGroundItem(/^egg$/i);
      if (!egg) throw new Error('no egg on ground');
      await bot.pickupItem(egg);
      if (!has(/^egg$/i)) throw new Error('egg not picked up');
    });
  }

  if (!has(/bucket of milk/i)) {
    await step('Milk', async () => {
      await go(3253, 3270, 4);
      const cow = sdk.findNearbyLoc(/dairy cow/i);
      if (!cow) throw new Error('no dairy cow');
      const bucket = sdk.findInventoryItem(/^bucket$/i);
      await bot.useItemOnLoc(bucket, cow);
      for (let i = 0; i < 12 && !has(/bucket of milk/i); i++) await sleep(400);
      if (!has(/bucket of milk/i)) throw new Error('no milk');
    });
  }

  // ---------- Return skull to the coffin ----------
  // (Done before flour: graveyard is south, flour is north-west; cook is between them.)
  // Order chosen: flour last is wasteful, so do skull now since we are already heading south.
  if (has(/skull/i)) {
    await step('Return skull', async () => {
      await coffin();
      const c = sdk.findNearbyLoc(/coffin/i);
      await bot.useItemOnLoc(sdk.findInventoryItem(/skull/i), c);
      await chat([/./]);
      say(`skull gone: ${!has(/skull/i)}`);
    });
  }

  // ---------- Hand in ----------
  await step('Cook hand-in', async () => {
    await go(3209, 3214, 3);
    await talk(/^cook$/i, [/i have|yes|here/i]);
  });

  return { log, pos: pos(), inv: sdk.getInventory().map((i: any) => i.name) };
};
