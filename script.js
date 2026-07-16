const puzzle = {
  number: 4,
  startNumber: 46,
  targetNumber: 69,
  maxMoves: 10
};

const allowedNumbers = [6, 9, 69];
const operations = ["add", "subtract", "multiply", "divide"];

const solverMaxStates = 20000;
const solverMaxAbsValue = 10000;
const epsilon = 0.0001;

let currentNumber = puzzle.startNumber;
let moveCount = 0;
let gameOver = false;

let selectedOperation = null;
let selectedNumber = null;

let historyEntries = [];
let originalOptimalMoves = null;
let countdownTimer = null;

function formatNumber(number) {
  return Math.round(Number(number));
}

function createsDecimal(number) {
  return Math.abs(number - Math.round(number)) > epsilon;
}

function isTarget(number) {
  return Math.abs(formatNumber(number) - puzzle.targetNumber) < epsilon;
}

function operationSymbol(operation) {
  if (operation === "add") {
    return "+";
  }

  if (operation === "subtract") {
    return "-";
  }

  if (operation === "multiply") {
    return "×";
  }

  if (operation === "divide") {
    return "÷";
  }

  return "?";
}

function applyOperation(number, operation, value) {
  if (operation === "add") {
    return number + value;
  }

  if (operation === "subtract") {
    return number - value;
  }

  if (operation === "multiply") {
    return number * value;
  }

  if (operation === "divide") {
    return number / value;
  }

  return number;
}

function solverKey(number) {
  return String(formatNumber(number));
}

function fewestMovesToSolve(startNumber, movesLeft) {
  let cleanStart = formatNumber(startNumber);

  if (isTarget(cleanStart)) {
    return 0;
  }

  let queue = [
    {
      number: cleanStart,
      movesUsed: 0
    }
  ];

  let visited = new Set();
  visited.add(solverKey(cleanStart));

  let index = 0;
  let statesChecked = 0;

  while (index < queue.length && statesChecked < solverMaxStates) {
    let state = queue[index];
    index = index + 1;
    statesChecked = statesChecked + 1;

    if (state.movesUsed >= movesLeft) {
      continue;
    }

    for (let i = 0; i < operations.length; i++) {
      let operation = operations[i];

      for (let j = 0; j < allowedNumbers.length; j++) {
        let value = allowedNumbers[j];

        let rawNewNumber = applyOperation(state.number, operation, value);

        if (!Number.isFinite(rawNewNumber)) {
          continue;
        }

        if (createsDecimal(rawNewNumber)) {
          continue;
        }

        let newNumber = formatNumber(rawNewNumber);

        if (Math.abs(newNumber) > solverMaxAbsValue) {
          continue;
        }

        if (isTarget(newNumber)) {
          return state.movesUsed + 1;
        }

        let key = solverKey(newNumber);

        if (!visited.has(key)) {
          visited.add(key);

          queue.push({
            number: newNumber,
            movesUsed: state.movesUsed + 1
          });
        }
      }
    }
  }

  return null;
}

function getFeedbackForCurrentState() {
  if (isTarget(currentNumber)) {
    return "green";
  }

  let movesRemaining = puzzle.maxMoves - moveCount;
  let remainingOptimalMoves = fewestMovesToSolve(currentNumber, movesRemaining);

  if (remainingOptimalMoves === null) {
    return "red";
  }

  if (originalOptimalMoves !== null && moveCount + remainingOptimalMoves === originalOptimalMoves) {
    return "green";
  }

  return "yellow";
}

function feedbackLabel(feedback, solved) {
  if (solved) {
    return "Solved!";
  }

  if (feedback === "green") {
    return "Optimal path";
  }

  if (feedback === "yellow") {
    return "Still solvable";
  }

  return "Dead path";
}

function feedbackSymbol(feedback) {
  if (feedback === "green") {
    return "🟩";
  }

  if (feedback === "yellow") {
    return "🟨";
  }

  return "🟥";
}

function updatePage() {
  document.getElementById("puzzle-label").textContent = "Nice!le #" + puzzle.number;
  document.getElementById("instructions").textContent =
    "Reach 69 in " + puzzle.maxMoves + " moves or less. Daily mode uses whole numbers only.";

  document.getElementById("current-number").textContent = formatNumber(currentNumber);
  document.getElementById("move-count").textContent = moveCount;
  document.getElementById("max-moves").textContent = puzzle.maxMoves;

  if (selectedOperation === null || selectedNumber === null) {
    document.getElementById("selected-move").textContent = "none";
  } else {
    document.getElementById("selected-move").textContent =
      operationSymbol(selectedOperation) + " " + selectedNumber;
  }

  updateSelectedButtons();
  updateButtons();

  if (isTarget(currentNumber)) {
    showWinScreen();
    return;
  }

  if (moveCount >= puzzle.maxMoves) {
    showLossScreen();
    return;
  }
}

function updateSelectedButtons() {
  let operationButtons = document.querySelectorAll("[data-operation]");

  operationButtons.forEach(function(button) {
    button.classList.toggle("selected", button.dataset.operation === selectedOperation);
  });

  let numberButtons = document.querySelectorAll("[data-number]");

  numberButtons.forEach(function(button) {
    button.classList.toggle("selected", Number(button.dataset.number) === selectedNumber);
  });
}

function updateButtons() {
  let moveButtons = document.querySelectorAll(".move-button");

  moveButtons.forEach(function(button) {
    button.disabled = gameOver;
  });

  document.getElementById("apply-button").disabled =
    gameOver || selectedOperation === null || selectedNumber === null;
}

function chooseOperation(operation) {
  if (gameOver) {
    return;
  }

  selectedOperation = operation;
  document.getElementById("message").textContent = "";
  updatePage();
}

function chooseNumber(number) {
  if (gameOver) {
    return;
  }

  selectedNumber = number;
  document.getElementById("message").textContent = "";
  updatePage();
}

function addToHistory(oldNumber, operation, numberUsed, newNumber, feedback) {
  let solved = isTarget(newNumber);

  let entry = {
    moveNumber: moveCount,
    oldNumber: formatNumber(oldNumber),
    operation: operation,
    numberUsed: numberUsed,
    newNumber: formatNumber(newNumber),
    feedback: feedback,
    solved: solved,
    label: feedbackLabel(feedback, solved)
  };

  historyEntries.push(entry);

  let historyList = document.getElementById("history");
  let newHistoryItem = document.createElement("li");

  newHistoryItem.classList.add("history-item");
  newHistoryItem.classList.add("feedback-" + feedback);

  newHistoryItem.innerHTML =
    "<div class='history-top-line'>" +
      "<strong>Move " + entry.moveNumber + "</strong>" +
      "<span class='feedback-pill'>" + entry.label + "</span>" +
    "</div>" +
    "<div>" +
      entry.oldNumber + " " +
      operationSymbol(entry.operation) + " " +
      entry.numberUsed + " = " +
      entry.newNumber +
    "</div>";

  historyList.appendChild(newHistoryItem);
}

function applyMove() {
  if (gameOver) {
    return;
  }

  if (selectedOperation === null || selectedNumber === null) {
    return;
  }

  let oldNumber = currentNumber;
  let numberUsed = selectedNumber;
  let operationUsed = selectedOperation;

  let rawNewNumber = applyOperation(currentNumber, operationUsed, numberUsed);

  if (!Number.isFinite(rawNewNumber)) {
    document.getElementById("message").textContent = "That move does not work.";
    return;
  }

  if (createsDecimal(rawNewNumber)) {
    document.getElementById("message").textContent =
      "That move creates a decimal. Daily mode uses whole numbers only.";
    return;
  }

  currentNumber = formatNumber(rawNewNumber);
  moveCount = moveCount + 1;

  let feedback = getFeedbackForCurrentState();

  addToHistory(oldNumber, operationUsed, numberUsed, currentNumber, feedback);

  selectedOperation = null;
  selectedNumber = null;

  document.getElementById("message").textContent = "";

  updatePage();
}

function showWinScreen() {
  gameOver = true;

  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("loss-screen").classList.add("hidden");
  document.getElementById("win-screen").classList.remove("hidden");

  document.getElementById("win-summary").textContent =
    "You solved Nice!le #" + puzzle.number + " in " + moveCount + "/" + puzzle.maxMoves + " moves.";

  document.getElementById("win-grid").textContent = buildResultGrid();
}

function showLossScreen() {
  gameOver = true;

  document.getElementById("game-screen").classList.add("hidden");
  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("loss-screen").classList.remove("hidden");

  startCountdown();
}

function buildResultGrid() {
  let grid = "";

  for (let i = 0; i < historyEntries.length; i++) {
    grid = grid + feedbackSymbol(historyEntries[i].feedback);
  }

  return grid;
}

function buildShareText() {
  return (
    "Nice!le #" + puzzle.number + "\n" +
    "Solved in " + moveCount + "/" + puzzle.maxMoves + " moves " + buildResultGrid() + "\n\n" +
    "Play today’s puzzle:\n" +
    "https://Playnicele.com"
  );
}

function shareResults() {
  let textToShare = buildShareText();

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(textToShare).then(function() {
      document.getElementById("share-status").textContent = "Copied!";
    }).catch(function() {
      fallbackCopy(textToShare);
    });
  } else {
    fallbackCopy(textToShare);
  }
}

function fallbackCopy(textToShare) {
  let textArea = document.createElement("textarea");
  textArea.value = textToShare;
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);

  document.getElementById("share-status").textContent = "Copied!";
}

function updateCountdown() {
  let now = new Date();
  let tomorrow = new Date();

  tomorrow.setHours(24, 0, 0, 0);

  let difference = tomorrow - now;

  let hours = Math.floor(difference / 1000 / 60 / 60);
  let minutes = Math.floor((difference / 1000 / 60) % 60);
  let seconds = Math.floor((difference / 1000) % 60);

  document.getElementById("countdown").textContent =
    String(hours).padStart(2, "0") + ":" +
    String(minutes).padStart(2, "0") + ":" +
    String(seconds).padStart(2, "0");
}

function startCountdown() {
  clearInterval(countdownTimer);
  updateCountdown();
  countdownTimer = setInterval(updateCountdown, 1000);
}

function resetGame() {
  clearInterval(countdownTimer);

  currentNumber = puzzle.startNumber;
  moveCount = 0;
  gameOver = false;

  selectedOperation = null;
  selectedNumber = null;

  historyEntries = [];

  document.getElementById("history").innerHTML = "";
  document.getElementById("message").textContent = "";
  document.getElementById("share-status").textContent = "";

  document.getElementById("win-screen").classList.add("hidden");
  document.getElementById("loss-screen").classList.add("hidden");
  document.getElementById("game-screen").classList.remove("hidden");

  originalOptimalMoves = fewestMovesToSolve(currentNumber, puzzle.maxMoves);

  updatePage();
}

resetGame();
