function initDemineur(container) {
    // Configuration du jeu
    const rows = 10, cols = 10, minesCount = 10;
    let revealedCount = 0;
    const totalCells = rows * cols;
    let board = [];
    
    // Initialisation du plateau
    for (let i = 0; i < rows; i++) {
      board[i] = [];
      for (let j = 0; j < cols; j++) {
        board[i][j] = { mine: false, revealed: false, flagged: false, adjacent: 0 };
      }
    }
    
    // Placement aléatoire des mines
    let placed = 0;
    while (placed < minesCount) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (!board[r][c].mine) {
        board[r][c].mine = true;
        placed++;
      }
    }
    
    // Calcul des mines adjacentes pour chaque cellule
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        if (board[i][j].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = i + dr, c = j + dc;
            if (r >= 0 && r < rows && c >= 0 && c < cols && board[r][c].mine) {
              count++;
            }
          }
        }
        board[i][j].adjacent = count;
      }
    }
    
    // Réinitialisation et configuration du conteneur du jeu
    container.innerHTML = "";
    // Ajustement des dimensions pour 10 cellules de 35px
    container.style.width = "385px";
    container.style.height = "430px";
    container.style.position = "relative";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    
    // Zone de message
    const messageDiv = document.createElement("div");
    messageDiv.style.textAlign = "center";
    messageDiv.style.margin = "10px";
    messageDiv.style.fontWeight = "bold";
    container.appendChild(messageDiv);
    
    // Création de la grille avec table-layout fixed pour des cellules carrées
    const grid = document.createElement("table");
    grid.style.borderCollapse = "collapse";
    grid.style.margin = "0 auto";
    grid.style.tableLayout = "fixed";
    grid.style.width = `${cols * 35}px`;
    container.appendChild(grid);
    
    // Génération de la grille avec des cellules de 35x35 pixels
    for (let i = 0; i < rows; i++) {
      const tr = document.createElement("tr");
      for (let j = 0; j < cols; j++) {
        const td = document.createElement("td");
        td.style.width = "35px";
        td.style.height = "35px";
        td.style.border = "1px solid #000";
        td.style.textAlign = "center";
        td.style.verticalAlign = "middle";
        td.style.backgroundColor = "#c0c0c0";
        td.dataset.row = i;
        td.dataset.col = j;
        
        // Clic gauche pour révéler la case
        td.addEventListener("click", function(e) {
          revealCell(i, j);
          checkWin();
        });
        
        // Clic droit pour marquer/démarquer la case
        td.addEventListener("contextmenu", function(e) {
          e.preventDefault(); // Empêche le menu contextuel du navigateur
          toggleFlag(i, j);
        });
        
        tr.appendChild(td);
      }
      grid.appendChild(tr);
    }
    
    // Fonction pour révéler une cellule
    function revealCell(i, j) {
      if (i < 0 || i >= rows || j < 0 || j >= cols) return;
      const cell = board[i][j];
      const td = grid.rows[i].cells[j];
      if (cell.revealed || cell.flagged) return;
      cell.revealed = true;
      revealedCount++;
      td.style.backgroundColor = "#fff";
      if (cell.mine) {
        td.innerHTML = `<img src="Images/Other/Bomb.png" alt="" style="width:33px; height:33px; display:block; margin:auto;">`;
        gameOver(false);
        return;
      } else if (cell.adjacent > 0) {
        td.textContent = cell.adjacent;
      } else {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            revealCell(i + dr, j + dc);
          }
        }
      }
    }
    
    // Fonction pour marquer/démarquer une cellule via clic droit
    function toggleFlag(i, j) {
      const cell = board[i][j];
      const td = grid.rows[i].cells[j];
      if (cell.revealed) return;
      cell.flagged = !cell.flagged;
      if (cell.flagged) {
        td.innerHTML = `<img src="Images/Other/Drapeau.png" alt="" style="width:33px; height:33px; display:block; margin:auto;">`;
      } else {
        td.innerHTML = "";
      }
    }
    
    // Vérifie si le joueur a gagné
    function checkWin() {
      if (revealedCount === totalCells - minesCount) {
        gameOver(true);
      }
    }
    
    // Fin de partie : affiche un message et un bouton de réinitialisation
    function gameOver(won) {
      grid.style.pointerEvents = "none";
      messageDiv.innerHTML = "";
      const resultMsg = document.createElement("div");
      resultMsg.textContent = won ? "Félicitations ! Vous avez gagné !" : "Dommage, vous avez perdu.";
      resultMsg.style.marginBottom = "10px";
      messageDiv.appendChild(resultMsg);
      
      const resetBtn = document.createElement("button");
      resetBtn.textContent = "Recommencer";
      resetBtn.style.padding = "5px 10px";
      resetBtn.style.cursor = "pointer";
      resetBtn.addEventListener("click", () => {
        initDemineur(container);
      });
      messageDiv.appendChild(resetBtn);
    }
  }
  
  window.initDemineur = initDemineur;
  