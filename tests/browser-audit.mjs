"use strict";

import fs from "node:fs";

const endpoint = process.argv[2] || "http://127.0.0.1:9223";
const pages = await fetch(`${endpoint}/json/list`).then((response) => response.json());
const page = pages.find((target) => target.type === "page" && target.url.startsWith("http://127.0.0.1:8765/"))
  || pages.find((target) => target.type === "page");
if (!page?.webSocketDebuggerUrl) throw new Error("No browser page target was found.");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

let nextId = 0;
const pending = new Map();
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  if (message.error) reject(new Error(message.error.message));
  else resolve(message.result);
});

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function inspect(name, path, width, height, setupExpression = "") {
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await send("Page.navigate", { url: `http://127.0.0.1:8765/${path}` });
  await new Promise((resolve) => setTimeout(resolve, 750));
  if (setupExpression) {
    await send("Runtime.evaluate", { expression: setupExpression, awaitPromise: true });
    await new Promise((resolve) => setTimeout(resolve, 150));
  }
  const result = await send("Runtime.evaluate", {
    returnByValue: true,
    awaitPromise: true,
    expression: `(() => {
      const selectors = ".category, .category-heading, .levels, .levels a, .shop-item, .egg-card, .pet-card, .active-egg-card, .admin-card, .site-header, .hero, .screen, .coin-reward, #missed-questions, .result-actions";
      const overflowing = [...document.querySelectorAll(selectors)]
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => ({
          element: element.className || element.tagName,
          text: element.textContent.trim().slice(0, 35),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth
        }));
      const cardHeights = [...document.querySelectorAll(".category")].map((card) => Math.round(card.getBoundingClientRect().height));
      return {
        url: location.href,
        readyState: document.readyState,
        categoryCount: document.querySelectorAll(".category").length,
        gifPreviewCount: document.querySelectorAll(".celebration-preview img").length,
        effectPieceCount: document.querySelectorAll(".completion-effect i").length,
        eggCount: document.querySelectorAll(".egg-card").length,
        shopThemeCount: document.querySelectorAll("#theme-items .shop-item").length,
        shopCelebrationCount: document.querySelectorAll("#celebration-items .shop-item").length,
        starterGiftCount: document.querySelectorAll("[data-action=choose-starter]").length,
        symbolLogoCount: document.querySelectorAll(".symbol-logo i").length,
        petCardCount: document.querySelectorAll(".pet-card").length,
        activeEggCount: document.querySelectorAll(".active-egg-card:not([hidden])").length,
        adminCardCount: document.querySelectorAll(".admin-card").length,
        ownedPetCount: window.MathTimer ? MathTimer.loadState().ownedPets.length : 0,
        foxProgress: window.MathTimer ? MathTimer.loadState().ownedPets.find(p => p.petId === "fox") || null : null,
        devSeason: window.MathTimer ? MathTimer.getDevSettings().season || "" : "",
        toastVisible: document.getElementById("shop-message")?.classList.contains("is-visible") || false,
        toastTop: Math.round(document.getElementById("shop-message")?.getBoundingClientRect().top || 0),
        headerBottom: Math.round(document.querySelector(".site-header")?.getBoundingClientRect().bottom || 0),
        viewport: [innerWidth, innerHeight],
        documentWidth: document.documentElement.scrollWidth,
        overflowing,
        cardHeights
      };
    })()`
  });
  console.log(name, JSON.stringify(result.result.value));
  if (result.result.value.documentWidth > width || result.result.value.overflowing.length) process.exitCode = 1;
  if (name.startsWith("shop") && result.result.value.eggCount < 3) process.exitCode = 1;
  if (name === "shop desktop" && (result.result.value.eggCount !== 3 || result.result.value.shopThemeCount !== 3 || result.result.value.shopCelebrationCount !== 3 || result.result.value.starterGiftCount !== 1)) process.exitCode = 1;
  if (name === "starter claim" && result.result.value.ownedPetCount !== 1) process.exitCode = 1;
  if (name.startsWith("collection") && result.result.value.petCardCount !== 54) process.exitCode = 1;
  if (name === "admin actions" && (result.result.value.ownedPetCount !== 54 || result.result.value.foxProgress?.level !== 2 || result.result.value.foxProgress?.xp !== 5 || result.result.value.devSeason !== "winterWonder")) process.exitCode = 1;
  if (name === "admin toast dismisses" && result.result.value.toastVisible) process.exitCode = 1;
  if (name === "shop notice mobile" && (!result.result.value.toastVisible || result.result.value.toastTop < result.result.value.headerBottom)) process.exitCode = 1;
  if (name === "party result effect" && result.result.value.effectPieceCount !== 64) process.exitCode = 1;
  if (process.env.AUDIT_SCREENSHOTS === "1") {
    const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    fs.writeFileSync(`audit-${name.replaceAll(" ", "-")}.png`, Buffer.from(screenshot.data, "base64"));
  }
}

await send("Page.enable");
await inspect("home desktop", "index.html", 1440, 1000);
await inspect("home tablet", "index.html", 768, 900);
await inspect("home mobile", "index.html", 390, 844);
await inspect("active egg home mobile", "index.html", 390, 844, "(() => { const state = MathTimer.loadState(); state.activeEgg = { eggId: 'mystic-egg', progress: 2 }; MathTimer.saveState(state); MathTimer.renderPlayerWidgets(); })();");
await inspect("shop desktop", "shop.html", 1440, 1000, "MathTimer.saveState({ version: 1, coins: 0, ownedThemes: ['classic'], ownedCelebrations: ['starter'], equippedTheme: 'classic', equippedCelebration: 'starter', bestScores: {}, awardedSessions: [] }); renderShop();");
await inspect("shop celebrations desktop", "shop.html", 1440, 1000, "document.getElementById('celebrations-title').scrollIntoView();");
await inspect("shop mobile", "shop.html", 390, 844);
await inspect("starter claim", "shop.html", 390, 844, "(() => { document.querySelector('[data-action=choose-starter]').click(); document.querySelector('[data-claim-starter]').click(); })();");
await inspect("collection themes desktop", "collection.html", 1440, 1000, "(() => { const state = MathTimer.loadState(); state.ownedThemes = MathTimer.SHOP_ITEMS.filter(item => item.type === 'theme').map(item => item.id); MathTimer.saveState(state); render(); })();");
await inspect("collection desktop", "collection.html#pets", 1440, 1000, "document.querySelector('[data-tab=pets]').click()");
await inspect("collection mobile", "collection.html#pets", 390, 844, "document.querySelector('[data-tab=pets]').click()");
await inspect("shop notice mobile", "shop.html", 390, 844, "window.scrollTo(0, document.body.scrollHeight); document.querySelector('[data-action=get-item]').click();");
await inspect("test mobile", "test.html?test=addition_10", 390, 844);
await inspect("active practice mobile", "test.html?test=division_12", 390, 844, "startTest();");
await inspect("result mobile", "test.html?test=addition_10", 390, 844, "startTest(); correctCount = 30; finishTest();");
await inspect("history mobile", "history.html", 390, 844);
await inspect("admin desktop", "admin.html?admin=1", 1440, 1000);
await inspect("admin actions", "admin.html", 1440, 1000, "(() => { document.querySelector('[data-admin=unlock-everything]').click(); document.getElementById('pet-select').value = 'fox'; document.getElementById('pet-select').dispatchEvent(new Event('change')); document.getElementById('pet-xp-value').value = '35'; document.querySelector('[data-admin=add-pet-xp]').click(); document.getElementById('season-select').value = 'winterWonder'; document.querySelector('[data-admin=set-season]').click(); })();");
await inspect("admin toast dismisses", "admin.html", 1440, 1000, "(async () => { document.querySelector('[data-admin=reset-shop]').click(); await new Promise(resolve => setTimeout(resolve, 3200)); })();");
await inspect("party theme desktop", "index.html", 1440, 1000, "(() => { const state = MathTimer.loadState(); if (!state.ownedThemes.includes('party')) state.ownedThemes.push('party'); state.equippedTheme = 'party'; MathTimer.saveState(state); MathTimer.applyTheme('party'); })();");
await inspect("halloween theme desktop", "index.html", 1440, 1000, "(() => { const state = MathTimer.loadState(); if (!state.ownedThemes.includes('halloween')) state.ownedThemes.push('halloween'); state.equippedTheme = 'halloween'; MathTimer.saveState(state); MathTimer.applyTheme('halloween'); })();");
await inspect("space theme desktop", "index.html", 1440, 1000, "(() => { const auditState = MathTimer.loadState(); if (!auditState.ownedThemes.includes('space')) auditState.ownedThemes.push('space'); auditState.equippedTheme = 'space'; MathTimer.saveState(auditState); MathTimer.applyTheme('space'); })();");
await inspect("party result effect", "test.html?test=addition_10", 1440, 1000, "(() => { const state = MathTimer.loadState(); if (!state.ownedThemes.includes('party')) state.ownedThemes.push('party'); state.equippedTheme = 'party'; MathTimer.saveState(state); MathTimer.applyTheme('party'); startTest(); correctCount = 30; finishTest(); })();");
socket.close();
