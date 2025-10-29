(function () {
  const numberColors = {
    1: "#1c7ed6",
    2: "#37b24d",
    3: "#f03e3e",
    4: "#7048e8",
    5: "#d9480f",
    6: "#099268",
    7: "#343a40",
    8: "#495057"
  };

  function formatCounter(value) {
    const clamped = Math.max(-99, Math.min(999, value));
    if (clamped < 0) {
      return "-" + Math.abs(clamped).toString().padStart(2, "0");
    }
    return clamped.toString().padStart(3, "0");
  }

  function initDemineur(container) {
    const rows = 10;
    const cols = 10;
    const minesCount = 10;

    const state = {
      rows,
      cols,
      minesCount,
      board: [],
      firstClick: true,
      revealedSafeCells: 0,
      flagsPlaced: 0,
      gameOver: false,
      timerId: null,
      startTime: null
    };

    container.innerHTML = "";
    container.classList.add("demineur-root");
    container.setAttribute("role", "application");
    container.setAttribute("aria-label", "Jeu du démineur");

    const header = document.createElement("div");
    header.className = "demineur-header";

    const mineCounter = document.createElement("div");
    mineCounter.className = "demineur-counter";
    mineCounter.textContent = formatCounter(minesCount);
    mineCounter.setAttribute("aria-live", "polite");

    const faceButton = document.createElement("button");
    faceButton.type = "button";
    faceButton.className = "demineur-face";
    faceButton.setAttribute("aria-label", "Recommencer une partie");

    const faceEmoji = document.createElement("span");
    faceEmoji.className = "demineur-face-emoji";
    faceEmoji.setAttribute("aria-hidden", "true");
    faceEmoji.textContent = "😊";
    faceButton.appendChild(faceEmoji);

    const timeCounter = document.createElement("div");
    timeCounter.className = "demineur-counter";
    timeCounter.textContent = formatCounter(0);

    header.appendChild(mineCounter);
    header.appendChild(faceButton);
    header.appendChild(timeCounter);

    const grid = document.createElement("div");
    grid.className = "demineur-grid";
    grid.style.setProperty("--cols", cols);
    grid.style.setProperty("--rows", rows);

    const messageDiv = document.createElement("div");
    messageDiv.className = "demineur-message";
    messageDiv.setAttribute("aria-live", "polite");
    messageDiv.textContent = "Cliquez sur une case pour commencer.";

    container.appendChild(header);
    container.appendChild(grid);
    container.appendChild(messageDiv);

    const detachFacePress = addFacePressListeners(faceButton);

    faceButton.addEventListener("click", () => {
      faceButton.classList.add("is-pressed");
      setTimeout(() => faceButton.classList.remove("is-pressed"), 120);
      stopTimer();
      detachFacePress();
      initDemineur(container);
    });

    function setFace(emoji) {
      faceEmoji.textContent = emoji;
      faceEmoji.classList.remove("is-pop");
      void faceEmoji.offsetWidth;
      faceEmoji.classList.add("is-pop");
    }

    function startTimer() {
      state.startTime = Date.now();
      timeCounter.textContent = formatCounter(0);
      state.timerId = setInterval(() => {
        if (state.gameOver) return;
        const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
        timeCounter.textContent = formatCounter(elapsed);
      }, 1000);
    }

    function stopTimer() {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
    }

    function updateMineCounter() {
      const remaining = state.minesCount - state.flagsPlaced;
      mineCounter.textContent = formatCounter(remaining);
    }

    function updateMessage(text) {
      messageDiv.textContent = text;
      messageDiv.classList.remove("is-active");
      void messageDiv.offsetWidth;
      messageDiv.classList.add("is-active");
    }

    function getNeighbors(row, col) {
      const neighbors = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < rows && c >= 0 && c < cols) {
            neighbors.push(state.board[r][c]);
          }
        }
      }
      return neighbors;
    }

    function placeMines(excludeCell) {
      const positions = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (r === excludeCell.row && c === excludeCell.col) continue;
          positions.push({ r, c });
        }
      }
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }
      for (let i = 0; i < minesCount; i++) {
        const pos = positions[i];
        state.board[pos.r][pos.c].mine = true;
      }
      state.board.forEach((row) => {
        row.forEach((cell) => {
          if (cell.mine) {
            cell.adjacent = 0;
            return;
          }
          const neighbors = getNeighbors(cell.row, cell.col);
          let count = 0;
          neighbors.forEach((neighbor) => {
            if (neighbor.mine) count++;
          });
          cell.adjacent = count;
        });
      });
    }

    function revealCell(startCell) {
      const queue = [{ cell: startCell, depth: 0 }];
      while (queue.length) {
        const { cell, depth } = queue.shift();
        if (cell.revealed || cell.flagged) continue;
        cell.revealed = true;
        const el = cell.element;
        el.classList.add("is-revealed");
        el.style.setProperty("--reveal-delay", `${Math.min(depth, 12) * 35}ms`);
        el.setAttribute("aria-pressed", "true");
        el.setAttribute("tabindex", "-1");
        if (cell.mine) {
          el.classList.add("is-mine", "is-exploded");
          el.setAttribute("aria-label", "Bombe déclenchée");
          endGame(false);
          return;
        }
        state.revealedSafeCells++;
        if (cell.adjacent > 0) {
          el.dataset.value = cell.adjacent;
          el.textContent = cell.adjacent;
          el.classList.add("has-number");
          el.style.color = numberColors[cell.adjacent] || "#212529";
          el.setAttribute(
            "aria-label",
            `Case révélée avec ${cell.adjacent} mine${cell.adjacent > 1 ? "s" : ""} adjacente${cell.adjacent > 1 ? "s" : ""}`
          );
        } else {
          el.classList.add("is-empty");
          el.setAttribute("aria-label", "Case vide révélée");
          getNeighbors(cell.row, cell.col).forEach((neighbor) => {
            if (!neighbor.revealed && !neighbor.mine) {
              queue.push({ cell: neighbor, depth: depth + 1 });
            }
          });
        }
      }
      if (state.revealedSafeCells === rows * cols - minesCount) {
        endGame(true);
      }
    }

    function toggleFlag(cell) {
      if (state.gameOver || cell.revealed) return;
      cell.flagged = !cell.flagged;
      const el = cell.element;
      if (cell.flagged) {
        state.flagsPlaced++;
        el.classList.add("is-flagged");
        el.setAttribute("aria-label", "Case marquée avec un drapeau");
      } else {
        state.flagsPlaced--;
        el.classList.remove("is-flagged");
        el.setAttribute("aria-label", "Case non révélée");
      }
      updateMineCounter();
    }

    function endGame(victory) {
      if (state.gameOver) return;
      state.gameOver = true;
      stopTimer();
      grid.classList.add("is-complete");
      if (victory) {
        setFace("😎");
        updateMessage("Bravo ! Toutes les bombes ont été neutralisées.");
        mineCounter.textContent = formatCounter(0);
      } else {
        setFace("😵");
        updateMessage("Boom ! La partie est terminée.");
      }
      revealAll(victory);
    }

    function revealAll(victory) {
      state.board.forEach((row) => {
        row.forEach((cell) => {
          const el = cell.element;
          el.setAttribute("tabindex", "-1");
          el.setAttribute("aria-disabled", "true");
          el.disabled = true;
          if (cell.mine) {
            if (victory) {
              el.classList.add("is-flagged", "is-revealed");
              el.setAttribute("aria-label", "Bombe correctement signalée");
            } else {
              el.classList.add("is-mine");
              if (!el.classList.contains("is-revealed")) {
                el.classList.add("is-revealed");
                el.style.setProperty("--reveal-delay", `0ms`);
              }
              if (!el.classList.contains("is-exploded")) {
                el.classList.add("is-mine-visible");
              }
              el.setAttribute("aria-label", "Bombe");
            }
          } else if (cell.flagged && !victory) {
            el.classList.add("is-wrong-flag");
          }
        });
      });
    }

    function handleReveal(cell) {
      if (state.gameOver || cell.revealed || cell.flagged) return;
      if (state.firstClick) {
        state.firstClick = false;
        placeMines(cell);
        startTimer();
        updateMessage("Bonne chance !");
      }
      setFace("😮");
      setTimeout(() => {
        if (!state.gameOver) setFace("😊");
      }, 220);
      revealCell(cell);
    }

    function createCell(row, col) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "demineur-cell";
      button.setAttribute("data-row", row);
      button.setAttribute("data-col", col);
      button.setAttribute("aria-label", "Case non révélée");
      button.setAttribute("aria-pressed", "false");
      button.addEventListener("click", () => handleReveal(state.board[row][col]));
      button.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        toggleFlag(state.board[row][col]);
      });
      button.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleReveal(state.board[row][col]);
        } else if (event.key.toLowerCase() === "f") {
          event.preventDefault();
          toggleFlag(state.board[row][col]);
        }
      });
      return button;
    }

    for (let r = 0; r < rows; r++) {
      state.board[r] = [];
      for (let c = 0; c < cols; c++) {
        const cell = {
          row: r,
          col: c,
          mine: false,
          revealed: false,
          flagged: false,
          adjacent: 0,
          element: null
        };
        const button = createCell(r, c);
        cell.element = button;
        grid.appendChild(button);
        state.board[r][c] = cell;
      }
    }

    function addFacePressListeners(btn) {
      const onMouseDown = () => btn.classList.add("is-pressed");
      const onMouseUp = () => btn.classList.remove("is-pressed");
      btn.addEventListener("mousedown", onMouseDown);
      btn.addEventListener("mouseup", onMouseUp);
      btn.addEventListener("mouseleave", onMouseUp);
      return () => {
        btn.removeEventListener("mousedown", onMouseDown);
        btn.removeEventListener("mouseup", onMouseUp);
        btn.removeEventListener("mouseleave", onMouseUp);
      };
    }

    updateMessage("Cliquez sur une case pour commencer.");
  }

  window.initDemineur = initDemineur;
})();
