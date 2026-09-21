const QUESTIONS_TOTAL = 30;
const TIME_LIMIT = 120;

let operation, level;
let testTitle = document.getElementById("test-title");
let startBtn = document.getElementById("start-btn");
let timerDisplay = document.getElementById("timer");
let questionCounter = document.getElementById("question-counter");
let questionBox = document.getElementById("question-box");
let answerInput = document.getElementById("answer-input");
let scoreSummary = document.getElementById("score-summary");
let missedQuestions = document.getElementById("missed-questions");
let currentTestName = null;
let endTestTitle = document.getElementById("end-test-title");
let coinReward = document.getElementById("coin-reward");

let questions = [], currentQuestionIndex = 0, correctCount = 0, timeLeft = TIME_LIMIT, timer;
let wrongAnswers = [];
let testFinished = false;
let sessionId = null;

const urlParams = new URLSearchParams(window.location.search);
const testId = urlParams.get("test");
const showTimer = urlParams.get("timer") !== "off";

let testSession = {
  startTime: new Date().toISOString(),
  testType: "",
  correct: 0,
  missed: 0,
  answered: 0
};

// Render a simple long-division HTML for strings like "10 / 2" or "24 / 6"
function renderLongDivisionFromString(qStr, showQuotient = false, quotientValue = "") {
  // Accept formats like "10 / 2" or "10/2" (spaces optional)
  const m = qStr.match(/^\s*(\d+)\s*\/\s*(\d+)\s*$/);
  if (!m) return null;
  const dividend = m[1];
  const divisor  = m[2];

  // optional quotient above the dividend
  const quotientSpan = showQuotient && quotientValue !== ""
    ? `<span class="quotient">${quotientValue}</span>`
    : "";

  // Build markup: divisor | overline(dividend)
  return `
    <span class="long-division" role="img" aria-label="long division">
      <span class="divisor">${divisor}</span>
      <span>
        ${quotientSpan}
        <span class="dividend">${dividend}</span>
      </span>
    </span>
  `;
}

async function loadTest() {
  if (!testId) {
    alert("No test selected");
    return;
  }

  try {
    const res = await fetch(`tests/${testId}.json`);
    const data = await res.json();

    testTitle.innerText = data.test_name;
    currentTestName = data.test_name;
    const testSubtitle = document.getElementById("test-subtitle");
    if (data.test_subtitle && data.test_subtitle.trim() !== "") {
      testSubtitle.textContent = data.test_subtitle;
      testSubtitle.style.display = "block";
    }

    const bank = data.questions.map(q => ({
      question: q.question,
      answer: parseInt(q.answer)
    }));
    
    questions = sampleQuestions(bank);
    document.getElementById("level-encouragement").textContent = MathTimer.getIntroLine(testId);

    parseURLFromTestId(testId);
  } catch (err) {
    console.error("Failed to load test:", err);
  }
}

function parseURLFromTestId(id) {
  [operation, level] = id.split("_");
  level = parseInt(level);
  const symbols = {
    addition: "+",
    subtraction: "-",
    multiplication: "x",
    division: "÷"
  };

  const symbol = symbols[operation] || "?";
  const levelLabel = (level === 13) ? "Mixed" : `${symbol}${level}`;

  document.body.classList.add(`${operation}-bg`);
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function sampleQuestions(bank) {
  const all = [];
  const total = Math.min(QUESTIONS_TOTAL, bank.length * Math.ceil(QUESTIONS_TOTAL / bank.length));

  while (all.length < QUESTIONS_TOTAL) {
    const pool = [...bank];
    shuffle(pool);
    for (let q of pool) {
      all.push(q);
      if (all.length === QUESTIONS_TOTAL) break;
    }
  }

  return all;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function renderMathQuestion(question, container) {
  const displayQuestion = question.replace(/\*/g, "\\times").replace(/\//g, "\\div");
  if (typeof katex !== "undefined") {
    katex.render(displayQuestion, container, { throwOnError: false });
    return;
  }

  container.textContent = question
    .replace(/\\frac\{1\}\{2\}/g, "½")
    .replace(/\\sqrt\{(\d+)\}/g, "√$1")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷");
}

function startTest() {
  sessionId = MathTimer.createSessionId();
  testSession = {
    startTime: new Date().toISOString(),
    testType: currentTestName,
    correct: 0,
    missed: 0,
    answered: 0,
    coinsEarned: 0,
    sessionId
  };
  document.getElementById("title-screen").classList.add("hidden");
  document.getElementById("test-screen").classList.remove("hidden");
  answerInput.focus();
  nextQuestion();
  timer = setInterval(() => {
    timeLeft--;

    if (showTimer) {
      timerDisplay.textContent = formatTime(timeLeft);
    }
    if (timeLeft <= 0) finishTest();
  }, 1000);

  if (!showTimer) {
    timerDisplay.textContent = "";
  }
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function nextQuestion() {
  if (currentQuestionIndex >= QUESTIONS_TOTAL) return finishTest();
  const q = questions[currentQuestionIndex];

  questionBox.innerHTML = "";

  // If this is a Division 2 test (your test ids use "division2_X"), render long division
  if (operation && operation.startsWith("division2")) {
    // Try to create the long-division HTML from the raw question string
    const longHTML = renderLongDivisionFromString(q.question);

    if (longHTML) {
      questionBox.innerHTML = longHTML;
    } else {
      renderMathQuestion(q.question, questionBox);
    }
  } else {
    renderMathQuestion(q.question, questionBox);
  }

  questionCounter.textContent = `Question ${currentQuestionIndex + 1}/${QUESTIONS_TOTAL}`;
  answerInput.value = "";
}

function formatQuestion(q) {
  return q.question.replace("*", "x").replace("/", "÷");
}

function evaluate(q) {
  return q.answer;
}

function handleAnswer(e) {
  if (e.key !== "Enter") return;
  const userAnswer = parseInt(answerInput.value);
  const currentQ = questions[currentQuestionIndex];
  const correct = evaluate(currentQ);
  
  if (userAnswer === "" || isNaN(userAnswer)) {
    return;
  }

  testSession.answered++;

  if (userAnswer === correct) {
    correctCount++;
    testSession.correct++;
  } 
  else {
    testSession.missed++;
    wrongAnswers.push({ q: currentQ, correct });
  }

  currentQuestionIndex++;
  nextQuestion();
}

function finishTest() {
  if (testFinished) return;
  testFinished = true;
  clearInterval(timer);
  document.getElementById("test-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.remove("hidden");

  endTestTitle.innerText = currentTestName;
  scoreSummary.innerText = `You got ${correctCount} out of 30 correct.`;
  
  const key = currentTestName;
  localStorage.setItem(key, correctCount);
  testSession.testType = currentTestName;
  const reward = MathTimer.awardCompletion(sessionId, correctCount, testId);
  testSession.coinsEarned = reward.coinsAwarded;
  coinReward.innerHTML = reward.coinsAwarded > 0
    ? `<span class="coin-icon" aria-hidden="true">●</span><strong>+${reward.coinsAwarded} coins</strong><span>Balance: ${reward.state.coins}</span>`
    : `<strong>No coins this round</strong><span>Keep practicing to earn coins next round.</span>`;

  const petReward = document.getElementById("pet-reward");
  const rewardLines = [];
  if (reward.bonusCoins > 0) rewardLines.push(`Your pet found ${reward.bonusCoins} bonus coin${reward.bonusCoins === 1 ? "" : "s"}!`);
  if (reward.state.equippedPet) rewardLines.push(`${MathTimer.getPet(reward.state.equippedPet).name} earned Pet XP.`);
  if (reward.sharedXp) rewardLines.push(`${MathTimer.getPet(reward.sharedXp).name} received ${reward.sharedXpAmount} Training Buddy XP.`);
  if (reward.eggProgress && !reward.hatchResult) {
    const active = reward.state.activeEgg;
    const egg = MathTimer.getEgg(active.eggId);
    rewardLines.push(`${egg.name}: ${active.progress} / ${egg.levelsRequired} levels completed${reward.eggBonus ? " — bonus progress!" : ""}`);
  }
  petReward.textContent = rewardLines.join(" ");
  if (reward.hatchResult) showHatchReveal(reward.hatchResult);

  if (correctCount === QUESTIONS_TOTAL) {
    const randomGif = MathTimer.getCelebrationGif();
    MathTimer.showThemeEffect();

    missedQuestions.innerHTML = `
      <div class="perfect-result">
        <p>Perfect score!</p>
        <img src="assets/gifs/${randomGif}" alt="Perfect score celebration" />
      </div>
    `;
  } else if (wrongAnswers.length > 0) {
    missedQuestions.innerHTML = `<h3>Questions Missed:</h3><ul>` +
    wrongAnswers.map(w => `<li>${formatQuestion(w.q)} = ${w.correct}</li>`).join('') +
      `</ul>`;
  } else {
    missedQuestions.innerHTML = `<p>You didn't answer all of the questions.</p>`;
  }

  let history = JSON.parse(localStorage.getItem("testHistory") || "[]");
  history.push(testSession);
  localStorage.setItem("testHistory", JSON.stringify(history));
}

function showHatchReveal(result) {
  const pet = MathTimer.getPet(result.petId);
  const owned = MathTimer.loadState().ownedPets.find(entry => entry.petId === pet.id);
  const ability = MathTimer.getAbilityInfo(pet.id, owned.level);
  const dialog = document.getElementById("hatch-dialog");
  document.getElementById("hatch-result").innerHTML = result.duplicate
    ? `<p class="reveal-kicker">You already have ${pet.name}!</p><div class="revealed-pet" aria-hidden="true">${pet.icon}</div><h2>${pet.name} gained ${result.duplicateXp} XP.</h2>${result.levelsGained ? `<p>Level up! Now level ${owned.level}.</p>` : ""}`
    : `<p class="reveal-kicker">You hatched...</p><div class="revealed-pet" aria-hidden="true">${pet.icon}</div><h2>${pet.name}</h2><span class="rarity-label rarity-${pet.rarity.toLowerCase()}">${pet.rarity}</span><h3>${ability ? ability.name : "Cheerful Companion"}</h3><p>${ability ? ability.description : pet.tagline}</p>${result.autoEquipped ? "<p><strong>Your first pet is now equipped!</strong></p>" : ""}`;
  dialog.showModal();
}

document.getElementById("hatch-continue").addEventListener("click", () => document.getElementById("hatch-dialog").close());

answerInput.addEventListener("input", () => {
  answerInput.value = answerInput.value.replace(/\D/g, ""); // Digits only
});

// Init
startBtn.addEventListener("click", startTest);
answerInput.addEventListener("keydown", handleAnswer);
loadTest();
