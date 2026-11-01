> Route/order for the combat quests: see `learnings/quest-route-combat.md`. This file holds the step detail.

# Early quests: Cook's Assistant + The Restless Ghost (verified 2026-10-31)

Both done together in one route with `bots/shared/quests/cooks-restless/quests.ts`. XP on the shared server is boosted
(about 25x), so one quest gave Cooking level 30 and Prayer level 47.

## Facts that differ from the wiki
- The priest is **Father Aereck**. Open with "I'm looking for a quest!". Afterwards he says "Have you got rid of the ghost yet?".
- **Father Urhney** is at (3235, 3154), in the swamp south of the castle. Opening line is "Go away!". Choose
  "Father Aereck sent me to talk to you.", then "He's got a ghost haunting his graveyard." He gives the Ghostspeak amulet. Equip it.
- **Coffin** (3249, 3192) is inside a small hut. Use option `Open` (not `Search`). The ghost appears at (3249, 3194).
  Talk to it: "Yep, now tell me what the problem is." Re-find the coffin after it opens: the object id changes (use fresh `findNearbyLoc`).
- **Wizard Tower ladder** (3104, 3162) is in a small room. A closed door at (3111, 3163) can make `walkTo` fail with
  "unreachable". Open it by hand with `interactLoc(door, 'Open')`. The ladder down is `Climb-down`, to (3104, 9576).
- **The skull is a ground item** at (3120, 9567) in the basement, not an altar search. Taking it spawns a level 13 skeleton at
  (3120, 9565). Pick up, run to the ladder (3103, 9576), `Climb-up`. It cost 2 HP at 10 max HP.
- Put the skull in with `useItemOnLoc(skull, coffin)` on the **open** coffin.
- **Lumbridge mill** has three floors. Ladder at (3164, 3307). Hopper (3166, 3307) and `Hopper controls` are on level 2.
  Use grain on the hopper, `Operate` the controls, climb down twice, then `Empty` the `Flour bin` with a pot in the inventory.
  After a ladder, wait for `player.level` to change before the next action. State lags 1-3 s.
- Wheat is at (3160, 3301-3305). Eggs lie in the chicken pen near (3231, 3296).
- **Milk:** there is no dairy cow object. Use an empty bucket on any `Cow` NPC (`bot.useItemOnNpc`). Cows are near (3253, 3262).

## Efficient order (about 15 min on the shared server)
Aereck, Urhney, graveyard ghost, Wizard Tower skull, windmill flour, eggs, milk, graveyard skull, Cook.

# Witch's House (server version, partly done 2026-11-01)
- Boy at (2928, 3456). Key: `Look-under` the Potted plant at (2900, 3474).
- The key door (loc 2861) is at (2901, 3473), entered from the pot corridor on its west side.
  `bot.useItemOnLoc` picked the nearest ordinary "Door" (loc 1531) instead. Use
  `sdk.sendUseItemOnLoc(keySlot, 2901, 3473, 2861)` and wait for the position to change.
- Basement: ladder (2907, 3476). Iron gate (2902, 9874) shocks without **worn** leather gloves; open it
  by hand (`interactLoc(gate, 'Open')`) both ways - `walkTo` reports "Stuck" inside the cell.
  Cupboard (2898, 9873): `Open`, then `Search` = magnet.
- Cheese on the mouse hole (2903, 3466), then magnet on the mouse, unlocks the back door (2901, 3465).
- Fountain (2909, 3470) option `Check` gives the shed key directly (no combination). Shed door (2934, 3463).
- **The witch (Nora T. Hagg) patrols the garden.** If she sees you within 3 tiles (line of sight; hedges block it),
  she re-locks the back door (quest stage back to started), deletes the shed key and ball, and teleports you to (2929, 3456).
  The magnet is consumed, so redo: new magnet from the basement cupboard, cheese on the hole, magnet on the mouse.
  The back door (loc 2862) teleports you through and closes. From its south side the garden route is
  (2901,3460) -> (2933,3460) -> (2933,3466) -> fountain; `walkTo` prefers going back through the door, so use explicit waypoints.
  Do the shed key, fight and ball in ONE visit so she cannot take the key in between.
- Fight: shapeshifter with 4 forms (up to level 53). Plan: **safe-spot it with Magic**; do Witch's Potion first for Magic XP.
- Money: cowhides sell on the GE (Varrock west bank table, 3180,3443) at ~55 gp; general stores pay 0.
  GE has no sellers of rope, earth runes or leather gloves. Gloves: Thessalia (3204, 3417).
  Beer: Rusty Anchor bartender (3045, 3257) via dialog "Could I buy a beer please?". Cheese: Wydin, Port Sarim.

# Waterfall Quest (server version, partly done 2026-11-01)
Coordinates (from server/content/maps): Almera (2522, 3498); log raft (2509, 3493); Hudon (2511, 3484) on the island
(the raft drops you at (2512, 3481) and the stage advances by itself: "Hudon is refusing to leave the waterfall").
Off the island without a rope: raw `sdk.sendInteractLoc(2512, 3468, 1996, 1)` ("Swim to" the rock) - you wash up at
(2527, 3413), next to Hadley's house. Bookcase upstairs (2520, 3426, level 1) gives the book only after the raft stage;
read it. Golrie: ladder down at (2533, 3155) in the Tree Gnome Village -> (2533, 9555); crate (2548, 9565) = large key;
gate (2515, 9575); Golrie (2515, 9581). Glarial's tombstone (2558, 3444): use the pebble, no weapons/armour/gloves/
runes/arrows/axe/pickaxe/logs allowed. Tomb chest (2530, 9844) = amulet, coffin (2542, 9811) = urn. Rock (2512, 3468),
overhanging tree (2512, 3465), ledge door (2511, 3464, needs Glarial's amulet). Dungeon crate key (2589, 9888),
locked doors (2566, 9901), statue (2565, 9916), chalice (2565, 9911), 6 pillars need 1 air + 1 water + 1 earth each.
The raft crash costs ~10 HP.

**DANGER - Tree Gnome Village dungeon:** ~9 hobgoblins (level 28) and 3 zombies around the ladder, crate and gate.
Spencebot (Attack 7, Defence 1, 14/23 HP, 1 food) died there and lost everything but 3 items. Go in with full HP,
plenty of food and a running HP guard (`startGuard` in bots/shared/lib.ts), or wait for better combat stats.

# Vampire Slayer (done 2026-11-01)
Morgan (3098, 3268): "Ok, I'm up for an adventure." Garlic: cupboard upstairs (3096, 3268, level 1).
Dr Harlow (3277, 3492, Jolly Boar Inn): 1st talk "Morgan needs your help" sets the stage; 2nd talk takes a beer
and gives the stake. A HAMMER is also required (Varrock general store, 3216, 3415; buyFromShop reported failure
but the hammer arrived). Count's coffin: Draynor Manor crypt (3077, 9775) via stairs (3115, 3357); enter the manor by
the front door (3108, 3353) from the north side. Count dies when low with garlic + stake + hammer in the inventory.
Reward: 120,625 Attack XP (25x).
Lady of the Lake (2924, 3405) shows "I seek the sword Excalibur" only after Keep Le Faye.

# Priest in Peril (server version, done up to the essence step 2026-11-01)
Temple doors (3408, 3488/3489): `Knock-at` (op2) -> "Roald sent me to check on Drezel." -> "Sure."
Crypt trapdoor (3405, 3507) - `Open` it first if closed, then `Climb-down` -> (3405, 9906). Kill the guardian dog there.
Report to King Roald (no choices needed). Then the temple doors open (op1).
GOLDEN KEY: only Monk of Zamorak **id 1046** drops it (all three variants share the name), and only for the player it
fights. Spawns (3411, 3489) and (3415, 3485) ground floor, (3416, 3491) level 1. Target by `npc.id === 1046`.
Drezel: temple level 2, cell door (3415, 3489) `Talk-through` -> "Tell me anyway." -> "Yes.".
Crypt gate (3405, 9895) opens by hand once the stage allows. 7 monuments: use the golden key on each until
"You swap the Golden key for the Iron key." (it was (3428, 9890) for Spencebot; the layout is per player).
Well (3423, 9890): bucket on it = "Bucket of water" (the murky water). Iron key on the cell door, open it, use the water on
Drezel ("The priest blesses the water") - the blessed bucket is ALSO named "Bucket of water". Leave the cell and use it
on the coffin (3413, 3486). Last step: meet Drezel in the crypt and bring 50 unnoted rune essence.

# Merlin's Crystal (server version, 2026-11-01)
Camelot: King Arthur (2764, 3515) "I want to become a Knight of the Round Table!"; Sir Gawain (2763, 3506)
"Do you know how Merlin got trapped?" then "Any idea how to get into Morgan Le Faye's stronghold?"; Sir Lancelot is
upstairs: staircase (2750, 3510) -> (2761, 3514, level 1), "Any ideas on how to get into Morgan Le Faye's stronghold?".
Crate (2801, 3442) Catherby: `Hide-in` -> Keep Le Faye (2778, 3401). Staircase (2769, 3404) twice to level 2: Sir Mordred
(39) + Renegade Knights (37, aggressive). Fight Mordred; Morgan Le Faye stops it: "Tell me how to untrap Merlin and I
might." then "OK I will go do all that." The keep is walkable back to Catherby/Camelot (no crate needed).
Insect repellent: ground spawn (2807, 3450) in a Catherby house. Beehive (2755, 3443): repellent on it, then `Take-from`
with an empty bucket = wax. Candle maker (2800, 3439): "Have you got any black candles?" then talk again with the wax.
Bat bones: Giant bats (level 27) around (2570-2590, 3470-3485). A tinderbox is needed to light the candle.
Lady of the Lake offers Excalibur only after the Morgan stage.

## Waterfall finale (done 2026-11-01)
Raft -> island (2512, 3481), walk to the south edge (2512, 3476) first, then rope on the rock: raw
`sdk.sendUseItemOnLoc(ropeSlot, 2512, 3468, 1996)` ("unrouted - ap-range attempt" works; from (2512, 3481) it says
"I can't reach that!"). Rope on the dead tree (2512, 3465, loc 2020) -> ledge (2511, 3463). The ledge door is a loc named
"Ledge" (2010 at 2511, 3464), option Open, with Glarial's amulet WORN -> dungeon (2575, 9861).
Crate (2589, 9888) = "A key". Puzzle door is (2566, 9901, loc 2002) - not the nearer door at (2568, 9893). Fire giants (86)
roam the corridor. Pillars at x 2562/2569, z 9910/9912/9914: one air, water, earth rune each (18 total).
Use the amulet on the "Statue of Glarial" (2565, 9916), not "Statue of Baxtorian" next to it; ~4 s later you are
raised to (2603, 9914). Urn on the chalice (2603, 9910) = quest complete: 343,750 Attack + Strength XP (25x).

# Holy Grail (done 2026-11-01)
Order that works: King Arthur ("Tell me of this quest." / "I'd enjoy trying that.") -> Merlin: Camelot level 1, workshop
door (2764, 3503) via staircase (2750, 3510) -> Entrana (NO weapons/armour; `unequipItem(regex)`, a name string silently
failed): Port Sarim ship monk (3045, 3236) "Yes, okay, I'm ready to go.", cross the Gangplank (2834, 3333), High Priest
(2851, 3349) spawns the Crone ("Ok, I will go searching."); back via monk (2835, 3336) "Yes, I'm ready to go." ->
Brother Galahad (2612, 3474): "I seek an item from the realm of the Fisher King." = napkin (only after the Crone) ->
Draynor Manor level 2 whistle door (3106, 3361, loc 22): going through it with the napkin drops whistles on the table
(3107, 3359); they despawn fast and need free inventory slots. Manor exit route: doors (3107,3367), (3106,3368), then
(3119,3356), (3123,3360) to the courtyard.
Karamja: Port Sarim seamen (3029, 3217) "Yes please." 30 gp, or Ardougne Captain Barnaby (2679, 3275); back via the Customs
officer ("Can I journey on this ship?", "Search away, I have nothing to hide.", "Ok."). Blow a whistle at (2740-2743,
3234-3237) -> realm (2806, 4715). Black Knight Titan (2791, 4722) with Excalibur WORN + Protect from Melee: took no damage.
It RESPAWNS on each visit. Fisherman (2802, 4706) "Any idea how to get into the castle?" drops a bell at (2762, 4694).
Ring it with a maiden within 4 tiles (they wander; wait at (2762, 4694)). Castle west staircase (2761, 4680) -> "The
Fisher King" (2764, 4685): raw `sendTalkToNpc` (unroutable), choose **"You don't look too well."** (the stage setter;
"I seek the Holy Grail" alone does nothing). Goblin Village sack (2960, 3507) is inside a hut: walk to (2959, 3507)
through door (2958, 3506), op Open -> Sir Percival "Your father wishes to speak to you." (takes a whistle).
Whistle again -> restored realm (2678, 4715), walk into the castle, staircases up to level 2, Holy Grail ground item
(2649, 4684). Whistle out, King Arthur = complete: 382,500 Defence + 275,000 Prayer XP (25x).
Script bug to avoid: "do I need a boat?" checks on x alone sent the bot overland from Goblin Village to Ardougne twice.
