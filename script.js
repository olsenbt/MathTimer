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

/**
 * Parses the URL to determine the operation and level of the quiz.
 * Sets the global `operation` and `level` variables and updates the test title.
 */
function parseURL() {
  const path = window.location.pathname;
  const file = path.split("/").pop().replace(".html", "");
  [operation, level] = file.split("_");
  level = parseInt(level);
  const symbols = {
    addition: "+",
    subtraction: "-",
    multiplication: "×",
    division: "÷"
  };

  const isMixed = (level === 10);
  const symbol = symbols[operation];
  testSession.testType = level === 10 ? `${symbol}Mixed` : `${symbol}${level}`;
  const levelLabel = isMixed ? "Mixed" : `${symbol}${level}`;
  testTitle.innerText = `${capitalize(operation)} ${levelLabel}`;

  document.body.classList.add(`${operation}-bg`);

  
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function generateBank() {
  let bank = new Set();

  let levelsToGenerate = [];
  // Handle Mixed Level
  if (level == 10) {
    // Add levels 2 through 9
    for (let l = 2; l <= 9; l++) {
      levelsToGenerate.push(l);
    }
  } else {
    // Only generate one level
    levelsToGenerate.push(level)
  }


  for(let level of levelsToGenerate) {
    if(operation == "addition") {
      for (let i = 0; i < 10; i++) {
          bank.add(`${level}+${i}`);
          bank.add(`${i}+${level}`);
          console.log(`${level}+${i}`);
          console.log(`${i}+${level}`);
      }
    } else if (operation == "multiplication") {
      for (let i = 0; i < 10; i++) {
          bank.add(`${level}*${i}`);
          console.log(`${level}*${i}`);
          if(i != level) {
              bank.add(`${i}*${level}`);
              console.log(`${i}*${level}`);
          }
      }
    } else if (operation == "subtraction") {
      for (let i = level + 9; i >= level; i--) {
          bank.add(`${i}-${level}`);
          console.log(`${i}-${level}`);
      }
    } else if (operation == "division") {
      for (let i = 1; i <= 9; i++) {
          let dividend = i * level;
          let divisor = level;
          bank.add(`${dividend}/${divisor}`);
          console.log(`${dividend}/${divisor}`);
      }
    } else {
      console.log("unknown type " + operation)
    }
  }
  return Array.from(bank);
}

function sampleQuestions(bank) {
  const all = [];

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
  return q.replace("*", "×").replace("/", "÷");
}

function evaluate(q) {
  const [a, op, b] = q.match(/(\d+)([+\-*/])(\d+)/).slice(1);
  switch (op) {
    case "+": return parseInt(a) + parseInt(b);
    case "-": return parseInt(a) - parseInt(b);
    case "*": return parseInt(a) * parseInt(b);
    case "/": return parseInt(a) / parseInt(b);
  }
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
parseURL();
const bank = generateBank();
questions = sampleQuestions(bank);
startBtn.addEventListener("click", startTest);
answerInput.addEventListener("keydown", handleAnswer);