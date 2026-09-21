"use strict";
const petSelect=document.getElementById("pet-select"),itemSelect=document.getElementById("item-select"),eggSelect=document.getElementById("egg-select"),seasonSelect=document.getElementById("season-select"),adminMessage=document.getElementById("admin-message");let adminMessageTimer;
MathTimer.PETS.forEach(p=>petSelect.add(new Option(`${p.name} (${p.rarity})`,p.id)));
MathTimer.SHOP_ITEMS.forEach(i=>itemSelect.add(new Option(`${i.name} (${i.type})`,i.id)));
MathTimer.EGGS.forEach(e=>eggSelect.add(new Option(e.name,e.id)));
function announce(text){clearTimeout(adminMessageTimer);adminMessage.textContent=text;adminMessage.className="shop-message is-visible success";adminMessageTimer=setTimeout(()=>adminMessage.classList.remove("is-visible"),3000);refresh()}
function mutate(fn){const state=MathTimer.loadState();fn(state);MathTimer.saveState(state);MathTimer.updateCoinDisplays()}
function ensurePet(state,id){let owned=state.ownedPets.find(p=>p.petId===id);if(!owned){owned={petId:id,level:1,xp:0};state.ownedPets.push(owned)}return owned}
function unlockAll(state){MathTimer.PETS.forEach(p=>ensurePet(state,p.id));state.ownedThemes=MathTimer.SHOP_ITEMS.filter(i=>i.type==="theme").map(i=>i.id);state.ownedCelebrations=MathTimer.SHOP_ITEMS.filter(i=>i.type==="celebration").map(i=>i.id)}
function refresh(){const state=MathTimer.loadState(),dev=MathTimer.getDevSettings(),owned=state.ownedPets.find(p=>p.petId===petSelect.value);document.getElementById("coin-value").value=state.coins;seasonSelect.value=dev.season||"";document.getElementById("rotation-status").textContent=`Shop offset: ${dev.shopOffset||0} day(s). Active egg: ${state.activeEgg?`${MathTimer.getEgg(state.activeEgg.eggId).name} (${state.activeEgg.progress} steps)`:"none"}.`;document.getElementById("pet-admin-status").textContent=owned?`${MathTimer.getPet(owned.petId).name}: level ${owned.level}, ${owned.xp} current XP${owned.level<10?` / ${MathTimer.xpForNextLevel(owned.level)} needed`:" (max level)"}`:`${MathTimer.getPet(petSelect.value).name} is locked. Editing it will unlock it.`;if(owned)document.getElementById("pet-level-value").value=owned.level}
petSelect.addEventListener("change",refresh);
document.querySelector(".admin-page").addEventListener("click",event=>{
  const button=event.target.closest("[data-admin]");if(!button)return;
  const coinValue=Math.max(0,Math.floor(Number(document.getElementById("coin-value").value)||0));
  const petXp=Math.max(0,Math.floor(Number(document.getElementById("pet-xp-value").value)||0));
  const petLevel=Math.max(1,Math.min(10,Math.floor(Number(document.getElementById("pet-level-value").value)||1)));
  switch(button.dataset.admin){
    case"set-coins":mutate(s=>s.coins=coinValue);announce("Coin balance set.");break;
    case"add-coins":mutate(s=>s.coins+=coinValue);announce("Coins added.");break;
    case"reset":if(confirm("Reset coins, scores, pets, eggs, and owned rewards in this browser?")){localStorage.clear();announce("All student progress was reset.")}break;
    case"unlock-pet":mutate(s=>ensurePet(s,petSelect.value));announce("Pet unlocked.");break;
    case"unlock-all-pets":mutate(s=>MathTimer.PETS.forEach(p=>ensurePet(s,p.id)));announce("All pets unlocked.");break;
    case"unlock-item":mutate(s=>{const item=MathTimer.getItem(itemSelect.value),list=item.type==="theme"?s.ownedThemes:s.ownedCelebrations;if(!list.includes(item.id))list.push(item.id)});announce("Reward unlocked.");break;
    case"unlock-all-items":mutate(s=>{s.ownedThemes=MathTimer.SHOP_ITEMS.filter(i=>i.type==="theme").map(i=>i.id);s.ownedCelebrations=MathTimer.SHOP_ITEMS.filter(i=>i.type==="celebration").map(i=>i.id)});announce("All themes and celebrations unlocked.");break;
    case"unlock-everything":mutate(unlockAll);announce("All pets, themes, and celebrations unlocked.");break;
    case"set-pet-level":mutate(s=>{const pet=ensurePet(s,petSelect.value);pet.level=petLevel;pet.xp=0});announce("Pet level set.");break;
    case"level-up-pet":mutate(s=>{const pet=ensurePet(s,petSelect.value);pet.level=Math.min(10,pet.level+1);pet.xp=0});announce("Pet leveled up.");break;
    case"set-pet-xp":mutate(s=>{const pet=ensurePet(s,petSelect.value);pet.xp=pet.level>=10?0:Math.min(petXp,MathTimer.xpForNextLevel(pet.level)-1)});announce("Current pet XP set.");break;
    case"add-pet-xp":mutate(s=>MathTimer.addPetXp(ensurePet(s,petSelect.value),petXp));announce("Pet XP added.");break;
    case"start-egg":mutate(s=>s.activeEgg={eggId:eggSelect.value,progress:0});announce("Egg started.");break;
    case"advance-egg":mutate(s=>{if(s.activeEgg){const egg=MathTimer.getEgg(s.activeEgg.eggId);s.activeEgg.progress=Math.min(egg.levelsRequired-1,s.activeEgg.progress+1)}});announce("Egg advanced.");break;
    case"hatch-egg":mutate(s=>{if(s.activeEgg)MathTimer.hatchActiveEgg(s)});announce("Active egg hatched.");break;
    case"clear-egg":mutate(s=>s.activeEgg=null);announce("Active egg cleared.");break;
    case"cycle-shop":{const dev=MathTimer.getDevSettings();dev.shopOffset=(Number(dev.shopOffset)||0)+1;MathTimer.setDevSettings(dev);announce("Shop moved forward one day.");break}
    case"reset-shop":{const dev=MathTimer.getDevSettings();dev.shopOffset=0;MathTimer.setDevSettings(dev);announce("Shop returned to today.");break}
    case"set-season":{const dev=MathTimer.getDevSettings();dev.season=seasonSelect.value;MathTimer.setDevSettings(dev);announce("Shop season preview updated.");break}
    case"reset-season":{const dev=MathTimer.getDevSettings();dev.season="";MathTimer.setDevSettings(dev);announce("Shop now uses the calendar season.");break}
    case"disable":sessionStorage.removeItem("mathTimerAdmin");sessionStorage.removeItem(MathTimer.DEV_KEY);location.replace("index.html");break;
  }
});
refresh();
