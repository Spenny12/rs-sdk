// Priest in Peril finish: crypt (trapdoor 3405, 3507) -> gate (3405, 9895) -> gate (3431, 9897)
// -> Drezel; talk and hand over unnoted rune essence (repeat trips until 50).
import { walk } from '../../travel';
import { sleep, startGuard } from '../../lib';

export default async ({ bot, sdk }: any) => {
  const log: any[] = [];
  const p = () => sdk.getState().player;
  const ess = () => sdk.getInventory().filter((i: any) => /^rune essence$/i.test(i.name)).length;
  const guard = startGuard(bot, sdk);
  const rawGate = async (x: number, z: number, from: [number, number]) => {
    await bot.walkTo(from[0], from[1], 0, { timeout: 30_000 });
    const g = (await sdk.scanNearbyLocs(3)).find((l: any) => /gate|door/i.test(l.name) && l.x === x && l.z === z);
    if (!g) return `no gate at ${x},${z}`;
    const before = [p().worldX, p().worldZ];
    await sdk.sendInteractLoc(x, z, g.id, 1);
    for (let i = 0; i < 12 && p().worldX === before[0] && p().worldZ === before[1]; i++) await sleep(400);
    return `gate ${x},${z}: now ${p().worldX},${p().worldZ} ${sdk.getState().gameMessages?.slice(-1)[0]?.text}`;
  };
  try {
    if (p().worldZ < 9000) {
      log.push(await walk(bot, sdk, 3405, 3506, 1, 'Varrock->temple trapdoor'));
      let td = (await sdk.scanNearbyLocs(4)).find((l: any) => /trapdoor/i.test(l.name));
      if (td?.options.some((o: string) => /^open$/i.test(o))) { await bot.interactLoc(td, 'Open'); await sleep(1500); td = (await sdk.scanNearbyLocs(4)).find((l: any) => /trapdoor/i.test(l.name)); }
      await bot.interactLoc(td, /climb.?down/i);
      for (let i = 0; i < 25 && p().worldZ < 9000; i++) await sleep(400);
    }
    if (p().worldZ >= 9896) log.push(await rawGate(3405, 9895, [3405, 9896]));
    if (p().worldX < 3431) log.push(await rawGate(3431, 9897, [3430, 9897]));
    const dz = sdk.getState().nearbyNpcs.find((n: any) => /drezel/i.test(n.name));
    log.push(`drezel ${dz ? `${dz.x},${dz.z} reach ${dz.reachable}` : 'not visible'} pos ${p().worldX},${p().worldZ}`);
    if (dz) {
      const before = ess();
      await bot.talkTo(dz);
      const end = Date.now() + 60_000;
      let idle = 0;
      while (Date.now() < end && idle < 10) {
        const d = sdk.getState().dialog;
        if (!d.isOpen) { idle++; await sleep(500); continue; }
        idle = 0;
        const o = d.options.find((x: any) => !/continue/i.test(x.text) && !/^no\b/i.test(x.text));
        if (o && d.options.length > 1) await sdk.clickDialogByText(new RegExp('^' + o.text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'));
        else await sdk.sendClickDialog(0);
        await sleep(450);
      }
      log.push(`essence ${before} -> ${ess()}; msgs: ${sdk.getState().gameMessages?.slice(-3).map((m: any) => m.text).join(' | ')}`);
    }
  } catch (e: any) {
    log.push(`stopped: ${e.message}`);
  } finally {
    guard.stop();
  }
  return { log, pos: [p().worldX, p().worldZ], essence: ess() };
};
