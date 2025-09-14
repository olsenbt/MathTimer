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
  "elmo_celebrate.gif",
  "elmo_dance.gif",
  "hulk_dance.gif",
  "lego_batman.gif",
  "lego_dance.gif",
  "lego_shocked.gif",
  "mario_dance.gif",
  "mario_luigi.gif",
  "minecraft_creeper.gif",
  "minecraft_steve.gif",
  "minions_dance.gif",
  "minions_purple.gif",
  "minions_tracksuit.gif",
  "monstersinc_sully.gif",
  "paw_patrol.gif",
  "peppa_famil.gif",
  "peppa_george.gif",
  "pokemon_pikachu.gif",
  "roblox_dance1.gif",
  "sonic_run.gif",
  "spiderman_dance.gif",
  "spongebob_ukelele.gif",
  "starwars_grogu.gif",
  "teentitans_robin.gif",
  "toystory_bullseye.gif",
  "toystory_dance.gif",
  "trolls_baby.gif",
  "trolls_poppy.gif"
]

let testSession = {
  startTime: new Date().toISOString(),
  testType: "",
  correct: 0,
  missed: 0,
  answered: 0
};

async function loadTest() {
  if (!testId) {
    alert("No test selected");
    return;
  }

  try {
    const res = await fetch(`../tests/${testId}.json`);
    const data = await res.json();

    testTitle.innerText = data.test_name;
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
  testSession.testType = levelLabel;

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
  questionBox.textContent = formatQuestion(q);
  questionCounter.textContent = `Question ${currentQuestionIndex + 1}/30`;
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
  scoreSummary.innerText = `You got ${correctCount} out of 30 correct.`;
  
  const key = `${operation}_${level}`;
  const previousScore = parseInt(localStorage.getItem(key)) || 0;

  if(correctCount > previousScore) {
    localStorage.setItem(key, correctCount);
  }

  localStorage.setItem(`${operation}_${level}`, correctCount);

  if (correctCount === QUESTIONS_TOTAL) {
    const randomGif = perfectGifs[Math.floor(Math.random() * perfectGifs.length)];
    missedQuestions.innerHTML = `
      <div style="text-align: center;">
        <p style="font-size: 1.2em;">Perfect score! 🎉</p>
        <img src="../assets/gifs/${randomGif}" alt="Celebration Gif" style="max-width: 300px; margin-top: 10px;" />
      </div>
    `;
  } else if (wrongAnswers.length > 0) {
    missedQuestions.innerHTML = `<h3>Questions Missed:</h3><ul>` +
    wrongAnswers.map(w => `<li>${formatQuestion(w.q)} = ${w.correct}</li>`).join('') +
      `</ul>`;
  } else {
    missedQuestions.innerHTML = `<p>You didn't answer any questions.</p>`;
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