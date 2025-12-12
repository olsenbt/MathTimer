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

let questions = [], currentQuestionIndex = 0, correctCount = 0, timeLeft = TIME_LIMIT, timer;
let wrongAnswers = [];

const urlParams = new URLSearchParams(window.location.search);
const testId = urlParams.get("test");
const showTimer = urlParams.get("timer") !== "off";

const perfectGifs = [
  "arthur_celebrate.gif",
  "bluey_bluey.gif",
  "bluey_celebrate.gif",
  "bluey_dad.gif",
  "bluey_twirl.gif",
  "cars_race.gif",
  "dinosaur_dance.gif",
  "dinosaur_rex.gif",
  "elmo_celebrate.gif",
  "elmo_dance.gif",
  "httyd_smile.gif",
  "httyd_toothless.gif",
  "hulk_dance.gif",
  "lego_batman.gif",
  "lego_dance.gif",
  "lego_shocked.gif",
  "looneytunes_bugs.gif",
  "looneytunes_daffy.gif",
  "looneytunes_sam.gif",
  "mario_bowser.gif",
  "mario_cappy.gif",
  "mario_dance.gif",
  "mario_luigi.gif",
  "minecraft_creeper.gif",
  "minecraft_steve.gif",
  "minions_dance.gif",
  "minions_happy.gif",
  "minions_king.gif",
  "minions_purple.gif",
  "minions_tracksuit.gif",
  "monstersinc_sully.gif",
  "paw_patrol.gif",
  "peppa_family.gif",
  "peppa_george.gif",
  "peppa_peppa.gif",
  "pokemon_pikachu.gif",
  "roblox_dance1.gif",
  "sonic_run.gif",
  "spiderman_dance.gif",
  "spongebob_ukelele.gif",
  "starwars_grogu.gif",
  "stitch_elvis.gif",
  "teentitans_robin.gif",
  "toystory_bullseye.gif",
  "toystory_dance.gif",
  "toystory_flight.gif",
  "trolls_baby.gif",
  "trolls_poppy.gif"
]

const holidayGifs = [
  "holiday/frosty_bday.gif",
  "holiday/mickey_skate.gif",
  "holiday/frozen_sven.gif",
  "holiday/frozen_olaf.gif",
  "holiday/snoopy_tree.gif",
  "holiday/snoopy_snowman.gif",
  "holiday/bluey_penguin.gif",
  "holiday/minecraft_snowman.gif",
  "holiday/minions_snow.gif",
  "holiday/peppa_snowman.gif",
  "holiday/pokemon_snow.gif",
  "holiday/grogu_snow.gif",
  "holiday/looneytunes_snowman.gif"
]

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
  const levelLabel = (level === 10) ? "Mixed" : `${symbol}${level}`;

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

function startTest() {
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
      // fallback to KaTeX (in case question isn't a plain "a / b")
      const displayQ = q.question.replace(/\*/g, "\\times").replace(/\//g, "\\div");
      katex.render(displayQ, questionBox, { throwOnError: false });
    }
  } else {
    // Normal path: render with KaTeX (as before)
    const displayQ = q.question.replace(/\*/g, "\\times").replace(/\//g, "\\div");
    katex.render(displayQ, questionBox, { throwOnError: false });
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
  clearInterval(timer);
  document.getElementById("test-screen").classList.add("hidden");
  document.getElementById("end-screen").classList.remove("hidden");

  endTestTitle.innerText = currentTestName;
  scoreSummary.innerText = `You got ${correctCount} out of 30 correct.`;
  
  const key = currentTestName;
  localStorage.setItem(key, correctCount);
  testSession.testType = currentTestName;

  if (correctCount === QUESTIONS_TOTAL) {
    const month = new Date().getMonth();
    let randomGif;

    if (month === 11 || month === 0) {
      randomGif = holidayGifs[Math.floor(Math.random() * holidayGifs.length)];
    } else {
      randomGif = perfectGifs[Math.floor(Math.random() * perfectGifs.length)];
    }

    missedQuestions.innerHTML = `
      <div style="text-align: center;">
        <p style="font-size: 1.2em;">Perfect score! 🎉</p>
        <img src="assets/gifs/${randomGif}" alt="Celebration Gif" style="max-width: 300px; margin-top: 10px;" />
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

answerInput.addEventListener("input", () => {
  answerInput.value = answerInput.value.replace(/\D/g, ""); // Digits only
});

// Init
startBtn.addEventListener("click", startTest);
answerInput.addEventListener("keydown", handleAnswer);
loadTest();