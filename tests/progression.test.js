"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

class LocalStorageMock {
  constructor() {
    this.values = new Map();
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  clear() {
    this.values.clear();
  }
}

global.localStorage = new LocalStorageMock();
const MathTimer = require("../app-data.js");

function test(name, run) {
  global.localStorage.clear();
  run();
  console.log(`PASS ${name}`);
}

test("reward curve covers low, medium, high, and perfect scores", () => {
  assert.equal(MathTimer.calculateCoins(0), 0);
  assert.equal(MathTimer.calculateCoins(9), 0);
  assert.equal(MathTimer.calculateCoins(10), 2);
  assert.equal(MathTimer.calculateCoins(20), 6);
  assert.equal(MathTimer.calculateCoins(28), 10);
  assert.equal(MathTimer.calculateCoins(29), 12);
  assert.equal(MathTimer.calculateCoins(30), 16);
});

test("a completion session can only award coins once", () => {
  const first = MathTimer.awardCompletion("session-1", 30, "addition_2");
  const duplicate = MathTimer.awardCompletion("session-1", 30, "addition_2");
  assert.equal(first.ok, true);
  assert.equal(first.coinsAwarded, 16);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "duplicate");
  assert.equal(MathTimer.loadState().coins, 16);
  assert.equal(MathTimer.loadState().bestScores.addition_2, 30);
});

test("a zero score never increases the balance", () => {
  const result = MathTimer.awardCompletion("session-zero", 0, "addition_3");
  assert.equal(result.coinsAwarded, 0);
  assert.equal(MathTimer.loadState().coins, 0);
});

test("a purchase deducts its price exactly once", () => {
  const state = MathTimer.loadState();
  state.coins = 100;
  MathTimer.saveState(state);
  const first = MathTimer.purchase("party");
  const duplicate = MathTimer.purchase("party");
  assert.equal(first.ok, true);
  assert.equal(first.state.coins, 35);
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.reason, "already-owned");
  assert.equal(MathTimer.loadState().coins, 35);
});

test("insufficient funds do not change ownership or balance", () => {
  const state = MathTimer.loadState();
  state.coins = 25;
  MathTimer.saveState(state);
  const result = MathTimer.purchase("space");
  const saved = MathTimer.loadState();
  assert.equal(result.ok, false);
  assert.equal(result.reason, "insufficient-coins");
  assert.equal(result.needed, 65);
  assert.equal(saved.coins, 25);
  assert.equal(saved.ownedThemes.includes("space"), false);
});

test("owned themes and celebration packs remain equipped", () => {
  const state = MathTimer.loadState();
  state.coins = 300;
  MathTimer.saveState(state);
  assert.equal(MathTimer.purchase("ocean").ok, true);
  assert.equal(MathTimer.equip("ocean").ok, true);
  assert.equal(MathTimer.purchase("adventure").ok, true);
  assert.equal(MathTimer.equip("adventure").ok, true);
  const saved = MathTimer.loadState();
  assert.equal(saved.equippedTheme, "ocean");
  assert.equal(saved.equippedCelebration, "adventure");
});

test("seasonal purchase windows are enforced", () => {
  const winter = MathTimer.getItem("winter");
  const spooky = MathTimer.getItem("halloween");
  assert.equal(MathTimer.SEASON_DEFINITIONS.winterWonder.startDate, "11-16");
  assert.equal(MathTimer.SEASON_DEFINITIONS.winterWonder.endDate, "02-28");
  assert.equal(MathTimer.isAvailable(winter, new Date("2026-09-12")), false);
  assert.equal(MathTimer.isAvailable(winter, new Date("2027-01-12")), true);
  assert.equal(MathTimer.isAvailable(spooky, new Date("2026-09-12")), false);
  assert.equal(MathTimer.isAvailable(spooky, new Date("2026-10-12")), true);
});

test("old saves migrate without losing existing progress", () => {
  MathTimer.saveState({ coins: 123, ownedThemes: ["classic", "ocean"], ownedCelebrations: ["starter"], equippedTheme: "ocean", equippedCelebration: "starter", bestScores: { addition_2: 29 }, awardedSessions: [] });
  const state = MathTimer.loadState();
  assert.equal(state.version, 3);
  assert.equal(state.coins, 123);
  assert.equal(state.bestScores.addition_2, 29);
  assert.deepEqual(state.ownedPets, []);
  assert.equal(state.equippedPet, null);
  assert.equal(state.activeEgg, null);
});

test("only one egg hatches at a time and refresh keeps progress", () => {
  const state = MathTimer.loadState(); state.coins = 500; MathTimer.saveState(state);
  assert.equal(MathTimer.purchaseEgg("starter-egg").ok, true);
  assert.equal(MathTimer.purchaseEgg("explorer-egg").reason, "egg-active");
  MathTimer.awardCompletion("egg-1", 10, "addition_2", () => 0);
  assert.equal(MathTimer.loadState().activeEgg.progress, 1);
});

test("first hatch auto-equips and a duplicate becomes XP", () => {
  const state = MathTimer.loadState(); state.coins = 500; MathTimer.saveState(state);
  MathTimer.purchaseEgg("starter-egg");
  let result;
  for (let i = 0; i < 3; i++) result = MathTimer.awardCompletion(`first-${i}`, 10, "addition_2", () => 0);
  assert.equal(result.hatchResult.petId, "mouse");
  assert.equal(result.hatchResult.autoEquipped, true);
  assert.equal(MathTimer.loadState().equippedPet, "mouse");
  MathTimer.purchaseEgg("starter-egg");
  for (let i = 0; i < 3; i++) result = MathTimer.awardCompletion(`dupe-${i}`, 10, "addition_2", () => 0);
  assert.equal(result.hatchResult.duplicate, true);
  assert.equal(result.hatchResult.duplicateXp, 15);
  assert.equal(MathTimer.loadState().ownedPets.length, 1);
});

test("pet XP stops safely at level 10", () => {
  const pet = { petId: "fox", level: 9, xp: MathTimer.xpForNextLevel(9) - 1 };
  MathTimer.addPetXp(pet, 500);
  assert.equal(pet.level, 10);
  assert.equal(pet.xp, 0);
  assert.equal(MathTimer.addPetXp(pet, 50).gained, 0);
});

test("owned seasonal items can still be equipped outside their purchase season", () => {
  const winter = MathTimer.getItem("winter");
  assert.equal(MathTimer.isAvailable(winter, new Date("2026-07-01")), false);
  const state = MathTimer.loadState();
  state.ownedThemes.push("winter");
  MathTimer.saveState(state);
  assert.equal(MathTimer.equip("winter").ok, true);
  assert.equal(MathTimer.loadState().equippedTheme, "winter");
});

test("all current levels receive unique encouragement lines", () => {
  const indexHtml = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
  const ids = [...indexHtml.matchAll(/test\.html\?test=([^"&]+)/g)].map((match) => match[1]);
  const lines = ids.map((id) => MathTimer.getIntroLine(id));
  assert.equal(ids.length, 77);
  assert.equal(new Set(lines).size, ids.length);
  assert.equal(lines.some((line) => line.includes("—")), false);
});

test("the catalog has year-long theme depth and six celebration packs", () => {
  assert.equal(MathTimer.SHOP_ITEMS.filter((item) => item.type === "theme").length, 11);
  assert.equal(MathTimer.SHOP_ITEMS.filter((item) => item.type === "celebration").length, 6);
});

test("daily shop rotations are stable for a date and change the next day", () => {
  const dayOne = MathTimer.getVisibleShopItems(new Date(2026, 9, 1, 8)).map(item => item.id);
  const sameDay = MathTimer.getVisibleShopItems(new Date(2026, 9, 1, 20)).map(item => item.id);
  const dayTwo = MathTimer.getVisibleShopItems(new Date(2026, 9, 2, 8)).map(item => item.id);
  assert.deepEqual(dayOne, sameDay);
  assert.notDeepEqual(dayOne, dayTwo);
  assert.equal(dayOne.filter(id => MathTimer.getItem(id).type === "theme").length, 3);
  assert.equal(dayOne.filter(id => MathTimer.getItem(id).type === "celebration").length, 3);
  assert.equal(dayOne.includes("classic"), false);
  assert.equal(dayOne.includes("starter"), false);
});

test("expanded egg catalog provides meaningful daily variety", () => {
  assert.equal(MathTimer.EGGS.length, 13);
  assert.equal(MathTimer.PETS.length, 54);
  const dayOne = MathTimer.getVisibleEggs(new Date(2026, 9, 1, 8)).map(egg => egg.id);
  const dayTwo = MathTimer.getVisibleEggs(new Date(2026, 9, 2, 8)).map(egg => egg.id);
  assert.equal(dayOne.length, 3);
  assert.equal(MathTimer.getEgg(dayOne[0]).tier, "common");
  assert.equal(dayOne.slice(1).every(id => MathTimer.getEgg(id).tier !== "common"), true);
  assert.ok(dayOne.filter(id => dayTwo.includes(id)).length <= 1);
});

test("a new player can claim exactly one free starter pet", () => {
  const egg = MathTimer.getVisibleEggs(new Date(2026, 9, 1, 8))[0];
  const petId = egg.pools.Common[0];
  const first = MathTimer.claimStarterPet(petId, egg.id);
  const second = MathTimer.claimStarterPet(egg.pools.Common[1], egg.id);
  assert.equal(first.ok, true);
  assert.equal(first.state.ownedPets.length, 1);
  assert.equal(first.state.equippedPet, petId);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "already-claimed");
});

test("active seasonal eggs are favored but not guaranteed", () => {
  let autumn = 0;
  let robot = 0;
  const sampleSize = 15 * 31;
  for (let year = 2020; year < 2035; year++) {
    for (let day = 1; day <= 31; day++) {
      const ids = MathTimer.getVisibleEggs(new Date(year, 9, day, 8)).map(egg => egg.id);
      if (ids.includes("haunted-harvest-egg")) autumn++;
      if (ids.includes("robot-egg")) robot++;
    }
  }
  assert.ok(autumn > robot);
  assert.ok(autumn < sampleSize);
});

test("rarity makes the same pet perk stronger", () => {
  const rareCoinFinder = MathTimer.getAbilityInfo("fox", 5);
  const epicCoinFinder = MathTimer.getAbilityInfo("octopus", 5);
  assert.equal(rareCoinFinder.kind, epicCoinFinder.kind);
  assert.ok(epicCoinFinder.value > rareCoinFinder.value);
});

test("seasonal pets retain their collection identity", () => {
  assert.equal(MathTimer.getSeasonForPet("snowy-owl").label, "Winter");
  assert.equal(MathTimer.getSeasonForPet("flower-fawn").label, "Spring");
  assert.equal(MathTimer.getSeasonForPet("fox"), null);
});

test("every celebration pack references existing project assets", () => {
  const packs = MathTimer.SHOP_ITEMS.filter((item) => item.type === "celebration");
  for (const pack of packs) {
    assert.ok(pack.gifs.length > 0, `${pack.id} should include at least one GIF`);
    assert.ok(pack.gifs.includes(pack.previewGif), `${pack.id} preview should come from its pack`);
    assert.equal(fs.existsSync(path.join(__dirname, "..", "assets", "gifs", pack.previewGif)), true, pack.previewGif);
    for (const gif of pack.gifs) {
      assert.equal(fs.existsSync(path.join(__dirname, "..", "assets", "gifs", gif)), true, gif);
    }
  }
});
