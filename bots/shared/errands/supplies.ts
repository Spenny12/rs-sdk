// West trip supplies: kebabs (Al Kharid, 1 gp each, toll 10 gp each way), then the Draynor
// bank: withdraw the Merlin ritual + Waterfall items, deposit surplus.
import { walk } from '../travel';
import { talk, sleep, startGuard } from '../lib';

const tollGate = async (bot: any, sdk: any) => {
  const p = () => sdk.getState().player;
  const inside = p().worldX >= 3268;
  await bot.walkTo(inside ? 3268 : 3267, 3228, 1, { timeout: 60_000 });
  const gate = (await sdk.scanNearbyLocs(5)).find((l: any) => /gate/i.test(l.name));
  if (!gate) return 'no gate';
  await sdk.sendInteractLoc(gate.x, gate.z, gate.id, 1);
  for (let i = 0; i < 20 && (p().worldX >= 3268) === inside; i++) {
    await sleep(500);
    const d = sdk.getState().dialog;
    if (d.isOpen) {
      if (d.options.some((o: any) => /yes/i.test(o.text))) await sdk.clickDialogByText(/yes/i);
      else await sdk.sendClickDialog(0);
    }
  }
  await bot.dismissBlockingUI();
  return `gate: now ${p().worldX},${p().worldZ}`;
};

export default async ({ bot, sdk, args }: any) => {
  const log: any[] = [];
  const kebabs = () => sdk.getInventory().filter((i: any) => /kebab/i.test(i.name)).length;
  const guard = startGuard(bot, sdk);
  try {
    const want = args?.kebabs ?? 18;
    if (kebabs() < want) {
      log.push(await tollGate(bot, sdk));
      log.push(await walk(bot, sdk, 3273, 3181, 2, 'gate->kebab seller'));
      for (let i = 0; i < want + 6 && kebabs() < want; i++) await talk(bot, sdk, /kebab seller/i, [/yes please/i]);
      log.push(`kebabs ${kebabs()}`);
      log.push(await tollGate(bot, sdk));
    }
    log.push(await walk(bot, sdk, 3092, 3244, 2, 'Al Kharid->Draynor bank'));
    const o = await bot.openBank();
    log.push(o.message);
    // Deposit surplus earth runes (keep 6) and quest junk.
    const earth = sdk.findInventoryItem(/^earth rune$/i)?.count ?? 0;
    if (earth > 6) log.push((await bot.depositItem(/^earth rune$/i, earth - 6)).message);
    for (const re of [/^excalibur$/i, /^black candle$/i, /^bat bones$/i, /^tinderbox$/i, /glarial's amulet/i, /glarial's urn/i, /^rope$/i, /^air rune$/i, /^coins$/i]) {
      const b = sdk.findBankItem(re);
      if (b && !sdk.findInventoryItem(re)) log.push((await bot.withdrawItem(re, /coins|rune$/i.test(b.name) ? b.count : 1)).message);
    }
    await bot.closeBank();
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, inv: sdk.getInventory().map((i: any) => `${i.name} x${i.count}`) };
};
