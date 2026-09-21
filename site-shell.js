(function () {
  "use strict";
  const params = new URLSearchParams(location.search);
  if (params.get("admin") === "1") sessionStorage.setItem("mathTimerAdmin", "1");
  if (params.get("admin") === "off") { sessionStorage.removeItem("mathTimerAdmin"); sessionStorage.removeItem(MathTimer.DEV_KEY); }

  const file = location.pathname.split("/").pop() || "index.html";
  const links = [["index.html", "Practice"], ["shop.html", "Shop"], ["collection.html", "Collection"], ["history.html", "My Scores"]];
  const header = document.createElement("header");
  header.className = "site-header unified-header";
  header.innerHTML = `<a class="brand" href="index.html" aria-label="Math Timings home"><span class="brand-mark symbol-logo" aria-hidden="true"><i>+</i><i>−</i><i>×</i><i>÷</i></span><span>Math Timings</span></a><button class="nav-toggle" aria-expanded="false" aria-controls="main-nav"><span aria-hidden="true">☰</span><span class="sr-only">Menu</span></button><nav id="main-nav" class="site-nav" aria-label="Main navigation">${links.map(([href, label]) => `<a href="${href}" ${file === href ? 'aria-current="page"' : ""}>${label}</a>`).join("")}<span class="coin-balance" aria-label="Coin balance"><span class="coin-icon" aria-hidden="true"></span><span data-coin-balance>0</span></span><button class="guide-button" data-open-guide aria-label="Open user guide">?</button>${MathTimer.isAdminEnabled() ? '<a class="admin-link" href="admin.html">Admin</a>' : ""}</nav>`;
  const old = document.querySelector(".site-header, .practice-utility, .history-nav");
  if (old) old.replaceWith(header); else document.body.prepend(header);

  const guide = document.createElement("dialog");
  guide.className = "guide-dialog";
  guide.innerHTML = `<div class="guide-top"><div><p class="section-label">How it works</p><h2>Math Timings Guide</h2></div><button class="dialog-close" data-close-guide aria-label="Close guide">×</button></div><div class="guide-steps"><article><span>1</span><div><h3>Choose practice</h3><p>Open <a href="index.html">Practice</a>, pick a skill, and answer 30 questions. Your teacher can choose whether the timer is shown.</p></div></article><article><span>2</span><div><h3>See results at the end</h3><p>The test does not show whether each answer is right or wrong while you work. Your score, missed questions, and coins appear after the round.</p></div></article><article><span>3</span><div><h3>Earn coins and get rewards</h3><p>Scores of 10 or more earn coins. The <a href="shop.html">Shop</a> changes each day. Everything uses practice coins—nothing costs real money.</p></div></article><article><span>4</span><div><h3>Hatch and level pets</h3><p>An egg grows after each practice round with 10 or more correct. Pets earn XP when they join you and can reach level 10. Some pets help with rewards, but pets never change questions, answers, time, or test difficulty.</p></div></article><article><span>5</span><div><h3>Choose your look</h3><p>Use the <a href="collection.html">Collection</a> to choose an owned pet, theme, or perfect-score celebration. Use <a href="history.html">My Scores</a> to review past practice.</p></div></article></div><div class="guide-note"><strong>For teachers:</strong> Progress is saved in this browser. Clearing browser storage resets the student’s collection and score history.</div>`;
  document.body.appendChild(guide);

  header.querySelector(".nav-toggle").addEventListener("click", e => { const open = e.currentTarget.getAttribute("aria-expanded") === "true"; e.currentTarget.setAttribute("aria-expanded", String(!open)); header.querySelector(".site-nav").classList.toggle("is-open", !open); });
  header.querySelector("[data-open-guide]").addEventListener("click", () => guide.showModal());
  guide.addEventListener("click", e => { if (e.target.closest("[data-close-guide]") || e.target === guide) guide.close(); });
  MathTimer.updateCoinDisplays();
})();
