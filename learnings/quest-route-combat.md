# Combat-by-questing route (for Spencebot2 and later bots)

Optimised order for **Vampire Slayer, Priest in Peril, Waterfall Quest, Merlin's Crystal, Holy Grail**
(plus the money and supplies they need), built from Spencebot's first run on 2026-10-31 / 11-01.
Exact coordinates, dialog lines and object ids for every step are in `learnings/quests-early.md`.
This file is the **order and the plan**; that file is the **detail**.
Runnable leg scripts for every phase are in `bots/shared/` (index: `bots/shared/README.md`).

## Why this route

Quest XP on the shared server is **25x**. Five quests take a fresh account to roughly:

| Skill | From | Source |
|---|---|---|
| Attack | 88 | Vampire Slayer 120,625 + Waterfall 343,750 |
| Strength | 89 | Waterfall 343,750 (+ training) |
| Defence | 86 | Holy Grail 382,500 |
| Prayer | 83 | Priest in Peril 35,150 + Holy Grail 275,000 |
| Hitpoints | ~60 | combat training only |

Spencebot needed about two play days, roughly half of it discovery and recovery (a death, wrong NPC spots,
empty shops, a missed dialog branch). A bot that follows this file should need **~4-5 hours**.

## Ground rules (read first)

1. **Use the lite client**, not the browser: `cd server/webclient && bun install && bun src/lite/runner.ts <bot>`.
2. **Every script runs `startGuard`** (bots/shared/lib.ts): eat below 60%, stop below 35% with no food.
   In multi-combat, **leave when food gets low, not HP** (`train.ts` `minFood`).
3. **Combat style policy:** Defence until 30, then Strength (`pickMeleeSkill` / `setMeleeStyle`).
   Re-check the style every fight; a script that set it once overshot Defence to 47.
4. **Bank before** Entrana (no weapons/armour), Glarial's tomb (no weapons, armour, runes, arrows, axe,
   pickaxe, logs) and the Wilderness (PvP). All bank booths share one bank.
5. **Never wrap sdk methods through the MCP proxy** (`sdk.x = orig` parks every later call forever).
6. Shops that bots drain are usually **empty**: Aubury/Betty earth and water runes, Zeke's single mithril
   scimitar, Port Sarim bread. Plan drops or the GE instead.
7. **Quests that need raw interactions** (the SDK helper picks the wrong target or refuses to path):
   key on a specific door (`sendUseItemOnLoc(slot, x, z, id)`), NPCs behind furniture (`sendTalkToNpc`),
   rope over water, swimming. Target monsters by **NPC id** when variants share a name.

## Phase 1 - Lumbridge start (~25 min)

| Step | Where | Result |
|---|---|---|
| Skip tutorial | - | spawn Lumbridge |
| Pickpocket Men | Lumbridge castle (3222, 3218) | Thieving 1 -> 43 in ~8 min, ~300 gp |
| Cows, **Defence style** | pen (3253, 3275) | Defence ~30, HP ~35, ~26 hides |
| Goblins | (3252, 3232) | 6 **water runes** (drop 6 at a time; took 5 kills) |

Do not enter the Tree Gnome dungeon, Al Kharid warriors or anything multi-combat before Defence 30.
Spencebot died at Defence 1 (hobgoblins) and nearly died a second time (Al Kharid warriors).

## Phase 2 - Varrock / Draynor / Port Sarim (~45 min)

| Step | Where | Note |
|---|---|---|
| Sell hides | GE table (3180, 3443) | ~55 gp each; general stores pay 0 |
| Earth runes | Dark Wizards, stone circle S of Varrock (3226, 3368) | ~1 drop per kill; need 6 |
| Leather gloves | Thessalia (3204, 3417) | (Witch's House later) |
| Beer | Blue Moon bartender (3226, 3399), **dialog** | no Trade option |
| Hammer, bucket, tinderbox | Varrock general store (3216, 3415) | VS, PiP, Merlin |
| **Priest in Peril** to the essence step | King Roald -> temple (3408, 3488) | golden key = monk **id 1046** only |
| **Vampire Slayer** | Morgan (3098, 3268), Harlow (3277, 3492), Count in manor crypt | Harlow 2nd talk = stake |
| Cheese x2 | Wydin, Port Sarim (3014, 3206) | Witch's House later |

Vampire Slayer gives +120k Attack: do it here, it makes everything after faster.
Leave Priest in Peril at "bring 50 essence" until there is money (Phase 3).

## Phase 3 - Money in Ardougne (~20 min)

Walk west via Falador/Taverley (start nothing yet). In the East Ardougne market:
Guards 43 -> 55 (`^guard$`), then **Knights of Ardougne** 55 -> ~78: **~500 gp/min**, ~5,000 gp in 9 min.
Bring ~20 food per 10 minutes (one stun per success). The bakery sells cake/chocolate slice/bread.

## Phase 4 - West: Merlin's start + Waterfall (~60 min)

| Step | Where | Note |
|---|---|---|
| Arthur, Gawain, Lancelot | Camelot; Lancelot upstairs via (2750, 3510) | order matters |
| Rope | Arhein, Catherby (2803, 3430) | |
| Insect repellent | ground spawn (2807, 3450) | |
| **Keep Le Faye** | crate (2801, 3442) `Hide-in` | spare Mordred: "Tell me how to untrap Merlin..." |
| Wax, black candle | beehive (2755, 3443), candle maker (2800, 3439) | candle only after Keep |
| Bat bones | **Giant bats** (2570-2590, 3470-3485) | name is "Giant bat" |
| **Waterfall**: Almera, raft, swim off, Hadley book | (2522, 3498) ... (2520, 3426, L1) | raft costs ~10 HP |
| Golrie pebble | ladder (2533, 3155), crate key, gate | hobgoblins; Defence 30 + food |
| Glarial's tomb | bank weapons first; (2558, 3444) | amulet + urn |
| Waterfall dungeon | raft, rope rock from (2512, 3476), tree, ledge door | 6 air/water/earth; **Statue of Glarial** |

Waterfall: +343,750 Attack and Strength. The dungeon exit is the barrel (loc 2022, (2512, 3463)) from the ledge.

## Phase 5 - East again: Excalibur, essence, Chaos altar (~45 min)

The Chaos altar flag only counts **after** the Keep Le Faye stage, so this trip cannot be merged into Phase 2.

| Step | Where | Note |
|---|---|---|
| Lady of the Lake | (2924, 3405) | "I seek the sword Excalibur." |
| Excalibur | Port Sarim jeweller door (3016, 3246) | beggar wants **bread**: guard `keep: /^bread$/` |
| 50 essence | GE ~60 gp; collect as notes, bank, withdraw unnoted | Drezel takes ~26 per trip |
| **Finish Priest in Peril** | crypt via trapdoor (3405, 3507), 2 gates, Drezel | 2nd talk / use essence on him |
| Chaos Temple altar | Wilderness (3239, 3608), option `Check` | bank coins first |

## Phase 6 - Free Merlin, start Holy Grail (~15 min)

Magic symbol (2780, 3515): tinderbox on candle, drop bat bones, "Snarthon Candtrick Termanto".
Excalibur on the crystal (2767, 3493, L2). King Arthur twice (complete, then "I'd enjoy trying that.").
Merlin's workshop is in the same castle (door (2764, 3503, L1)): talk to him now.

## Phase 7 - Holy Grail (~60 min)

1. Bank weapons/armour, Port Sarim monks -> **Entrana**, cross the gangplank, High Priest -> Crone.
2. **Galahad** (2612, 3474): "I seek an item from the realm of the Fisher King." -> napkin.
3. **Draynor Manor** level 2 whistle door (3106, 3361): have **2 free slots**; grab whistles fast.
4. Withdraw Excalibur, recharge prayer at the Lumbridge altar, boat to Karamja.
5. Whistle at (2740-2743, 3234-3237). Titan: Excalibur worn + Protect from Melee (no damage taken).
6. Fisherman bell -> ring with a maiden within 4 tiles -> castle west stairs -> Fisher King:
   **"You don't look too well."** (the only branch that advances; Spencebot needed an extra trip).
7. Goblin Village sack (2960, 3507) from (2959, 3507) -> Percival "Your father wishes to speak to you."
8. Whistle -> restored realm -> Holy Grail (2649, 4684, L2) -> King Arthur.

Boats: Port Sarim seamen (3029, 3217) or Ardougne Captain Barnaby (2679, 3275), 30 gp each; return via the
Customs officer. A "do I need a boat?" check on x alone walked the bot overland to Ardougne twice.

## Phase 8 - Witch's House (not done yet)

Needs Witch's Potion first (Magic), then **safe-spot the shapeshifter with Magic**. Steps and the witch's
reset behaviour are in `quests-early.md`. Do the shed key, fight and ball in **one visit**.

## Biggest time savers vs Spencebot's run

| Lost time on the first run | Fix in this route |
|---|---|
| Death in the gnome dungeon (lost everything) | Defence 30 + food + guard first |
| No money for essence/runes, three extra trips | Thieving to Knights in Phase 3 |
| Empty rune shops, 30 Wizard kills for nothing | Goblins (water), Dark Wizards (earth) |
| Wiki coordinates wrong (Urhney, dairy cow, skull) | use `quests-early.md` / map data |
| Wrong dialog branch (Fisher King, Morgan) | exact lines listed above |
| Proxy-wrapper hangs ("stale link") | ground rule 5 |
| Re-walks for forgotten items | phase item checklists above |

## Measured movement

138 traced walks: 101 minutes, path-efficiency 0.48 versus straight-line (mostly real route detours).
21 failed walks cost 14 minutes, nearly all wrong coordinates or doors. Long legs to expect:
Varrock -> Draynor ~2-5 min, Port Sarim -> Galahad ~2.5 min, Galahad -> Draynor Manor ~4 min.
