"use strict";

class LocalStorageMock {
  constructor() { this.values = new Map(); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  clear() { this.values.clear(); }
}

global.localStorage = new LocalStorageMock();
const MathTimer = require("../app-data.js");

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

const rarityRank = { Common: 0, Rare: 1, Epic: 2, Legendary: 3 };
const eggPlan = ["starter-egg", "pond-egg", "backyard-egg", "explorer-egg", "robot-egg", "candy-egg", "volcano-egg", "mystic-egg", "deep-sea-egg"];
const cosmeticPlan = ["adventure", "party", "builders", "ocean", "superheroes", "jungle", "dance", "arcade", "space", "candy"];

function simulate({ rounds, startScore, endScore, seed, shopping }) {
  global.localStorage.clear();
  const rng = seededRandom(seed);
  MathTimer.claimStarterPet("mouse", "starter-egg");
  let eggIndex = 0, cosmeticIndex = 0, eggsHatched = 0, spent = 0, mixedGoal = "egg";

  for (let round = 0; round < rounds; round++) {
    let state = MathTimer.loadState();
    if (!state.activeEgg && shopping === "mixed" && mixedGoal === "cosmetic" && cosmeticIndex < cosmeticPlan.length) {
      const item = MathTimer.getItem(cosmeticPlan[cosmeticIndex]);
      if (state.coins >= item.price) {
        MathTimer.purchase(item.id);
        spent += item.price;
        cosmeticIndex++;
        mixedGoal = "egg";
        state = MathTimer.loadState();
      }
    }
    if (!state.activeEgg && (shopping === "pets" || mixedGoal === "egg")) {
      const egg = MathTimer.getEgg(eggPlan[eggIndex % eggPlan.length]);
      if (state.coins >= egg.price) {
        MathTimer.purchaseEgg(egg.id);
        spent += egg.price;
        eggIndex++;
        if (shopping === "mixed") mixedGoal = "cosmetic";
      }
    }

    state = MathTimer.loadState();
    const currentPet = state.ownedPets.find((pet) => pet.petId === state.equippedPet);
    if (currentPet?.level === MathTimer.MAX_PET_LEVEL) {
      const nextPet = state.ownedPets
        .filter((pet) => pet.level < MathTimer.MAX_PET_LEVEL)
        .map((owned) => ({ owned, pet: MathTimer.getPet(owned.petId) }))
        .sort((a, b) => rarityRank[b.pet.rarity] - rarityRank[a.pet.rarity] || b.owned.level - a.owned.level)[0];
      if (nextPet) MathTimer.equipPet(nextPet.pet.id);
    }

    const progress = rounds === 1 ? 1 : round / (rounds - 1);
    const expected = startScore + (endScore - startScore) * progress;
    const score = Math.max(0, Math.min(30, Math.round(expected + (rng() - 0.5) * 6)));
    const result = MathTimer.awardCompletion(`sim-${seed}-${round}`, score, `level-${round % 77}`, rng);
    if (result.hatchResult) {
      eggsHatched++;
    }
  }

  const state = MathTimer.loadState();
  const grossCoins = state.coins + spent;
  return {
    grossCoins,
    balance: state.coins,
    spent,
    eggsHatched,
    uniquePets: state.ownedPets.length,
    cosmetics: state.ownedThemes.length + state.ownedCelebrations.length - 2,
    topPetLevel: Math.max(...state.ownedPets.map((pet) => pet.level)),
    maxedPets: state.ownedPets.filter((pet) => pet.level === MathTimer.MAX_PET_LEVEL).length
  };
}

function averageProfile(profile, shopping) {
  const runs = Array.from({ length: 300 }, (_, index) => simulate({ ...profile, shopping, seed: index + 1 }));
  const average = (key) => (runs.reduce((sum, run) => sum + run[key], 0) / runs.length).toFixed(1);
  return {
    learner: profile.name,
    shopping,
    rounds: profile.rounds,
    coinsEarned: average("grossCoins"),
    coinsLeft: average("balance"),
    eggsHatched: average("eggsHatched"),
    uniquePets: average("uniquePets"),
    cosmetics: average("cosmetics"),
    topPetLevel: average("topPetLevel"),
    maxedPets: average("maxedPets")
  };
}

const profiles = [
  { name: "Developing", rounds: 80, startScore: 6, endScore: 18 },
  { name: "Typical", rounds: 90, startScore: 15, endScore: 25 },
  { name: "Frequent", rounds: 120, startScore: 22, endScore: 29 }
];

console.table(profiles.flatMap((profile) => [averageProfile(profile, "pets"), averageProfile(profile, "mixed")]));
