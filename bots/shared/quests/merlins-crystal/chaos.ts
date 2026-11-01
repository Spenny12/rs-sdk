// Merlin's Crystal: read the wilderness Chaos Temple altar (3239, 3608, loc 61, op2) for the
// incantation flag. Banks coins/valuables at Varrock west first (Wilderness = PvP).
import { walk } from '../../travel';
import { sleep, startGuard } from '../../lib';

export default async ({ bot, sdk }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const guard = startGuard(bot, sdk);
  const rawGate = async (x: number, z: number, from: [number, number]) => {
    await bot.walkTo(from[0], from[1], 0, { timeout: 30_000 });
    const g = (await sdk.scanNearbyLocs(3)).find((l: any) => /gate|door/i.test(l.name) && l.x === x && l.z === z);
    if (!g) return;
    const before = [p().worldX, p().worldZ];
    await sdk.sendInteractLoc(x, z, g.id, 1);
    for (let i = 0; i < 12 && p().worldX === before[0] && p().worldZ === before[1]; i++) await sleep(400);
  };
  try {
    if (p().worldZ > 9000) {
      if (p().worldX >= 3431) await rawGate(3431, 9897, [3432, 9897]);
      if (p().worldZ <= 9895) await rawGate(3405, 9895, [3405, 9894]);
      await bot.walkTo(3405, 9906, 1);
      const lad = (await sdk.scanNearbyLocs(5)).find((l: any) => /ladder/i.test(l.name));
      if (lad) { await bot.interactLoc(lad, /up/i); for (let i = 0; i < 25 && p().worldZ > 9000; i++) await sleep(400); }
    }
    log.push(await walk(bot, sdk, 3185, 3438, 2, 'temple->Varrock bank'));
    await bot.openBank();
    for (const re of [/^coins$/i, /wolfbane/i]) if (sdk.findInventoryItem(re)) log.push((await bot.depositItem(re, -1)).message);
    if (sdk.findBankItem(/chocolate slice/i)) log.push((await bot.withdrawItem(/chocolate slice/i, 6)).message);
    await bot.closeBank();

    log.push(await walk(bot, sdk, 3239, 3606, 2, 'Varrock->Chaos Temple'));
    const altar = (await sdk.scanNearbyLocs(6)).find((l: any) => l.id === 61 || /altar/i.test(l.name));
    log.push(`altar ${altar?.name} ${altar?.x},${altar?.z} [${altar?.options?.join('/')}]`);
    if (altar) {
      const opt = altar.optionsWithIndex?.[1] ?? altar.optionsWithIndex?.find((o: any) => /search|check|read/i.test(o.text));
      await sdk.sendInteractLoc(altar.x, altar.z, altar.id, opt?.opIndex ?? 2);
      await sleep(3000);
      await bot.dismissBlockingUI();
      log.push(`msgs: ${sdk.getState().gameMessages?.slice(-2).map((m: any) => m.text).join(' | ')}`);
    }
    log.push(await walk(bot, sdk, 3185, 3438, 2, 'Chaos Temple->Varrock bank'));
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], hp: `${p().hp}/${p().maxHp}` };
};
