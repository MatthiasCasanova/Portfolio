// Fonction d'arrondi sur grille
function snapToGrid(value, gridSize) {
  return Math.round(value / gridSize) * gridSize;
}

// Pour éviter d'ouvrir plusieurs instances de la même application
const openApps = {};

// Système de fichiers simplifié réorganisé
const fileSystem = {
  "Jeu du démineur": { type: "file" },
  "Projets": {
    type: "folder",
    children: {
      "MMI": {
        type: "folder",
        children: {
          "ChatCPT.exe": { type: "file" },
          "Hide N Sick": { type: "file" },
          "Les 17 odd": { type: "file" },
          "Wallid": { type: "file" },
          "Wallid 2": { type: "file" }
        }
      },
      "Perso": { type: "folder", children: {} }
    }
  },
  "Documents": {
    type: "folder",
    children: {
      "Boîte mail": { type: "folder", children: {} }
    }
  },
  "Multimédia": {
    type: "folder",
    children: {
      "Images": { type: "folder", children: {} },
      "Films": { type: "folder", children: {} },
      "Séries": { type: "folder", children: {} },
      "Musique": { type: "folder", children: {} }
    }
  },
  "Jeux": {
    type: "folder",
    children: {
      "Autres jeux": { type: "folder", children: {} }
    }
  },
  "Game": {
    type: "folder",
    children: {}
  }
};

// Gestion du menu Démarrer et de l'horloge
const startButton = document.getElementById("start-button");
const startMenu = document.getElementById("start-menu");

startButton.addEventListener("click", (event) => {
  event.stopPropagation();
  startMenu.style.display = startMenu.style.display === "block" ? "none" : "block";
});

document.addEventListener("mousedown", (event) => {
  if (!startButton.contains(event.target) && !startMenu.contains(event.target)) {
    startMenu.style.display = "none";
  }
});

function updateClock() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  document.getElementById("clock").textContent = hours + ":" + minutes;
}
updateClock();
setInterval(updateClock, 1000);

// Organisation des icônes du bureau sur une grille alignée aux positions par défaut
function arrangeDesktopIcons() {
  const desktop = document.getElementById("desktop");
  const icons = Array.from(document.querySelectorAll(".desktop-icon"));
  const cellWidth = 120, cellHeight = 120, offsetLeft = 20, offsetTop = 20;
  const desktopWidth = desktop.clientWidth;
  const columns = Math.floor((desktopWidth - offsetLeft * 2) / cellWidth) || 1;
  icons.forEach((icon, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    icon.style.left = (offsetLeft + col * cellWidth) + "px";
    icon.style.top = (offsetTop + row * cellHeight) + "px";
  });
}
arrangeDesktopIcons();
window.addEventListener("resize", arrangeDesktopIcons);

// Permettre le déplacement des icônes du bureau avec snap sur grille
function enableDesktopIconsDrag() {
  const desktop = document.getElementById("desktop");
  const offsetLeft = 20, offsetTop = 20, gridW = 120, gridH = 120;
  let currentDragIcon = null, offsetX = 0, offsetY = 0;
  document.querySelectorAll(".desktop-icon").forEach((icon) => {
    icon.addEventListener("dblclick", () => {
      const appName = icon.dataset.app;
      const iconSrc = icon.querySelector("img").getAttribute("src");
      if (openApps[appName]) {
        bringWindowToFront(openApps[appName]);
        if (openApps[appName].dataset.minimized === "true") {
          restoreWindow(openApps[appName]);
        }
        return;
      }
      let newWin;
      if (appName === "Jeu du démineur") {
        newWin = createDemineurWindow(appName, iconSrc);
      } else if (appName === "Liste") {
        newWin = createListeWindow(appName, iconSrc);
      } else if (fileSystem[appName]?.type === "folder") {
        newWin = createExplorerWindow(appName, iconSrc, fileSystem[appName]);
      } else {
        newWin = createGenericWindow(appName, iconSrc);
      }
      openApps[appName] = newWin;
    });
    icon.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      currentDragIcon = icon;
      offsetX = event.clientX - icon.offsetLeft;
      offsetY = event.clientY - icon.offsetTop;
      icon.style.zIndex = "9999";
      event.preventDefault();
    });
  });
  document.addEventListener("mousemove", (event) => {
    if (!currentDragIcon) return;
    event.preventDefault();
    const desktopRect = desktop.getBoundingClientRect();
    let newX = event.clientX - offsetX;
    let newY = event.clientY - offsetY;
    newX = Math.max(0, Math.min(newX, desktopRect.width - currentDragIcon.offsetWidth));
    newY = Math.max(0, Math.min(newY, desktopRect.height - currentDragIcon.offsetHeight));
    currentDragIcon.style.left = newX + "px";
    currentDragIcon.style.top = newY + "px";
  });
  document.addEventListener("mouseup", () => {
    if (currentDragIcon) {
      let left = parseInt(currentDragIcon.style.left, 10);
      let top = parseInt(currentDragIcon.style.top, 10);
      let snappedLeft = offsetLeft + snapToGrid(left - offsetLeft, gridW);
      let snappedTop = offsetTop + snapToGrid(top - offsetTop, gridH);
      currentDragIcon.style.left = snappedLeft + "px";
      currentDragIcon.style.top = snappedTop + "px";
      currentDragIcon.style.zIndex = "1";
      currentDragIcon = null;
    }
  });
}
enableDesktopIconsDrag();

// Fonctions pour organiser les icônes dans les explorateurs sur une grille
function arrangeExplorerItems(container) {
  const items = container.querySelectorAll(".explorer-item");
  const offset = 10, gridStep = 90;
  const maxIconsPerRow = Math.floor((container.clientWidth - offset) / gridStep) || 1;
  let posX = offset, posY = offset, count = 0;
  items.forEach((item) => {
    item.style.left = posX + "px";
    item.style.top = posY + "px";
    count++;
    if (count % maxIconsPerRow === 0) {
      posX = offset;
      posY += gridStep;
    } else {
      posX += gridStep;
    }
  });
}

// Permettre le déplacement avec snap sur grille dans les explorateurs
const explorerDragState = {
  item: null,
  container: null,
  offsetX: 0,
  offsetY: 0
};

document.addEventListener("mousemove", (event) => {
  if (!explorerDragState.item) return;
  event.preventDefault();
  const { item, container, offsetX, offsetY } = explorerDragState;
  const containerRect = container.getBoundingClientRect();
  let newLeft = event.clientX - containerRect.left - offsetX;
  let newTop = event.clientY - containerRect.top - offsetY;
  newLeft = Math.max(0, Math.min(newLeft, containerRect.width - item.offsetWidth));
  newTop = Math.max(0, Math.min(newTop, containerRect.height - item.offsetHeight));
  item.style.left = newLeft + "px";
  item.style.top = newTop + "px";
});

document.addEventListener("mouseup", () => {
  if (!explorerDragState.item) return;
  const { item, container } = explorerDragState;
  const offset = 10;
  const gridStep = 90;
  const left = parseInt(item.style.left, 10);
  const top = parseInt(item.style.top, 10);
  const snappedLeft = offset + snapToGrid(left - offset, gridStep);
  const snappedTop = offset + snapToGrid(top - offset, gridStep);
  item.style.left = snappedLeft + "px";
  item.style.top = snappedTop + "px";
  item.style.zIndex = "1";
  explorerDragState.item = null;
  explorerDragState.container = null;
  explorerDragState.offsetX = 0;
  explorerDragState.offsetY = 0;
});

function enableExplorerItemDrag(container) {
  if (container.dataset.dragInit === "true") return;
  container.dataset.dragInit = "true";
  container.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const item = event.target.closest(".explorer-item");
    if (!item || !container.contains(item)) return;
    const containerRect = container.getBoundingClientRect();
    explorerDragState.item = item;
    explorerDragState.container = container;
    explorerDragState.offsetX = event.clientX - containerRect.left - item.offsetLeft;
    explorerDragState.offsetY = event.clientY - containerRect.top - item.offsetTop;
    item.style.zIndex = "9999";
    event.preventDefault();
    event.stopPropagation();
  });
}

// Gestion des fenêtres (explorateur, démineur, etc.)
let globalZIndex = 100;
function bringWindowToFront(windowElement) {
  globalZIndex++;
  windowElement.style.zIndex = globalZIndex;
}

function centerWindow(winEl) {
  winEl.style.display = "block";
  const desktopRect = document.getElementById("desktop").getBoundingClientRect();
  const winWidth = winEl.offsetWidth;
  const winHeight = winEl.offsetHeight;
  winEl.style.left = ((desktopRect.width - winWidth) / 2) + "px";
  winEl.style.top = ((desktopRect.height - winHeight) / 2) + "px";
}

// Réparation de l'affichage des applications dans la barre des tâches
// Les boutons auront le même format que le bouton Démarrer (110px x 35px, même style)
function createTaskbarButton(winEl, title, iconSrc) {
  const taskbarContainer = document.getElementById("taskbar-opened");
  const taskButton = document.createElement("button");
  taskButton.classList.add("taskbar-btn");
  // Appliquer le style du bouton Démarrer
  taskButton.style.width = "110px";
  taskButton.style.height = "35px";
  taskButton.style.marginLeft = "4px";
  taskButton.style.padding = "0";
  taskButton.style.backgroundColor = "#c0c0c0";
  taskButton.style.border = "2px solid #fff";
  taskButton.style.borderRightColor = "#808080";
  taskButton.style.borderBottomColor = "#808080";
  taskButton.style.display = "flex";
  taskButton.style.alignItems = "center";
  taskButton.style.cursor = "pointer";
  taskButton.innerHTML = `<img src="${iconSrc}" alt="${title}" style="width:20px;height:20px;margin:0 4px 0 6px;"><span>${title}</span>`;
  const uid = Math.random().toString(36).slice(2);
  winEl.dataset.taskbarBtnId = uid;
  taskButton.dataset.windowId = uid;
  taskbarContainer.appendChild(taskButton);
  taskButton.addEventListener("click", () => {
    if (winEl.dataset.minimized === "true") {
      restoreWindow(winEl);
    } else {
      minimizeWindow(winEl);
    }
    bringWindowToFront(winEl);
  });
}

function removeTaskbarButton(winEl) {
  const uid = winEl.dataset.taskbarBtnId;
  if (!uid) return;
  const taskbarContainer = document.getElementById("taskbar-opened");
  taskbarContainer.querySelectorAll(".taskbar-btn").forEach((button) => {
    if (button.dataset.windowId === uid) button.remove();
  });
}

function minimizeWindow(winEl) {
  if (winEl.dataset.minimized === "true") return;
  winEl.style.display = "none";
  winEl.dataset.minimized = "true";
}

function restoreWindow(winEl) {
  if (winEl.dataset.minimized === "false") return;
  winEl.style.display = "block";
  winEl.dataset.minimized = "false";
  bringWindowToFront(winEl);
}

function maximizeRestoreWindow(winEl) {
  if (winEl.dataset.maximized === "true") {
    winEl.style.left = winEl.dataset.oldLeft;
    winEl.style.top = winEl.dataset.oldTop;
    winEl.style.width = winEl.dataset.oldWidth;
    winEl.style.height = winEl.dataset.oldHeight;
    winEl.dataset.maximized = "false";
  } else {
    winEl.dataset.oldLeft = winEl.style.left;
    winEl.dataset.oldTop = winEl.style.top;
    winEl.dataset.oldWidth = winEl.style.width;
    winEl.dataset.oldHeight = winEl.style.height;
    const desktopRect = document.getElementById("desktop").getBoundingClientRect();
    winEl.style.left = "0px";
    winEl.style.top = "0px";
    winEl.style.width = desktopRect.width + "px";
    winEl.style.height = (desktopRect.height - 40) + "px";
    winEl.dataset.maximized = "true";
  }
  bringWindowToFront(winEl);
}

function enableWindowDrag(winEl, titleBar) {
  let isDragging = false, startOffsetX = 0, startOffsetY = 0;
  function onMouseMove(event) {
    if (!isDragging) return;
    event.preventDefault();
    const desktopRect = document.getElementById("desktop").getBoundingClientRect();
    let newLeft = event.clientX - startOffsetX;
    let newTop = event.clientY - startOffsetY;
    newLeft = Math.max(0, Math.min(newLeft, desktopRect.width - winEl.offsetWidth));
    newTop = Math.max(0, Math.min(newTop, desktopRect.height - winEl.offsetHeight));
    winEl.style.left = newLeft + "px";
    winEl.style.top = newTop + "px";
  }
  function onMouseUp() {
    if (isDragging) {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }
  titleBar.addEventListener("mousedown", (event) => {
    if (event.target.classList.contains("window-min-btn") ||
        event.target.classList.contains("window-max-btn") ||
        event.target.classList.contains("window-close-btn")) {
      return;
    }
    event.preventDefault();
    isDragging = true;
    bringWindowToFront(winEl);
    startOffsetX = event.clientX - winEl.offsetLeft;
    startOffsetY = event.clientY - winEl.offsetTop;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

function enableWindowResize(winEl, resizeHandle) {
  let isResizing = false, startX, startY, startWidth, startHeight;
  const minWidth = 130, minHeight = 130;
  function onMouseMove(event) {
    if (!isResizing) return;
    event.preventDefault();
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const desktop = document.getElementById("desktop");
    const maxWidth = desktop.clientWidth;
    const maxHeight = desktop.clientHeight - 40;
    const newWidth = Math.max(minWidth, Math.min(startWidth + dx, maxWidth));
    const newHeight = Math.max(minHeight, Math.min(startHeight + dy, maxHeight));
    winEl.style.width = newWidth + "px";
    winEl.style.height = newHeight + "px";
  }
  function onMouseUp() {
    if (isResizing) {
      isResizing = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      const explorerBody = winEl.querySelector(".explorer-body");
      if (explorerBody) {
        arrangeExplorerItems(explorerBody);
      }
    }
  }
  resizeHandle.addEventListener("mousedown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    isResizing = true;
    startX = event.clientX;
    startY = event.clientY;
    startWidth = parseInt(window.getComputedStyle(winEl).width, 10);
    startHeight = parseInt(window.getComputedStyle(winEl).height, 10);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

// Création de fenêtres

function createStandardWindow(title, iconSrc, contentHTML) {
  const defaultWidth = "700px";
  const defaultHeight = "500px";
  
  const windowElement = document.createElement("div");
  windowElement.classList.add("explorer-window");
  windowElement.style.width = defaultWidth;
  windowElement.style.height = defaultHeight;
  windowElement.style.backgroundColor = "#c0c0c0";
  windowElement.style.border = "2px solid #fff";
  windowElement.style.boxShadow = "inset -2px -2px 0 #808080, inset 2px 2px 0 #fff";
  
  windowElement.dataset.minimized = "false";
  windowElement.dataset.maximized = "false";
  bringWindowToFront(windowElement);
  
  const titleBar = document.createElement("div");
  titleBar.classList.add("explorer-title-bar");
  titleBar.innerHTML = `
    <span>${title}</span>
    <div class="window-buttons">
      <div class="window-min-btn">-</div>
      <div class="window-max-btn">□</div>
      <div class="window-close-btn">X</div>
    </div>
  `;
  titleBar.style.backgroundColor = "#000080";
  titleBar.style.color = "#fff";
  titleBar.style.fontFamily = "Tahoma, sans-serif";
  titleBar.style.fontSize = "0.9rem";
  titleBar.style.padding = "0 5px";
  
  const menuBar = document.createElement("div");
  menuBar.classList.add("explorer-menu-bar");
  menuBar.innerHTML = `<span>File</span><span>Edit</span><span>View</span><span>Help</span>`;
  
  const contentArea = document.createElement("div");
  contentArea.classList.add("explorer-body");
  contentArea.innerHTML = contentHTML;
  
  const statusBar = document.createElement("div");
  statusBar.classList.add("explorer-status-bar");
  statusBar.innerHTML = `<span></span><span></span>`;
  
  const resizeHandle = document.createElement("div");
  resizeHandle.classList.add("explorer-resize-handle");
  
  windowElement.appendChild(titleBar);
  windowElement.appendChild(menuBar);
  windowElement.appendChild(contentArea);
  windowElement.appendChild(statusBar);
  windowElement.appendChild(resizeHandle);
  document.getElementById("desktop").appendChild(windowElement);
  
  centerWindow(windowElement);
  createTaskbarButton(windowElement, title, iconSrc);
  
  titleBar.querySelector(".window-close-btn").addEventListener("click", () => {
    windowElement.remove();
    removeTaskbarButton(windowElement);
    delete openApps[title];
  });
  titleBar.querySelector(".window-min-btn").addEventListener("click", () => minimizeWindow(windowElement));
  titleBar.querySelector(".window-max-btn").addEventListener("click", () => maximizeRestoreWindow(windowElement));
  titleBar.addEventListener("mousedown", () => bringWindowToFront(windowElement));
  
  enableWindowDrag(windowElement, titleBar);
  enableWindowResize(windowElement, resizeHandle);
  
  return windowElement;
}

function createGenericWindow(title, iconSrc) {
  const contentHTML = `<p>Fenêtre générique : <strong>${title}</strong>.</p>`;
  return createStandardWindow(title, iconSrc, contentHTML);
}

function createNotepadWindow(title, iconSrc) {
  const contentHTML = `
    <div style="background: #fff; border: 1px solid #000; padding: 10px; height: 100%; overflow: auto;">
      <h3 style="margin:0 0 10px 0; font-size:1.1rem;">Notepad - Windows 95</h3>
      <p>Ce document est un exemple de texte affiché dans Notepad.</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.</p>
      <p>Ceci est une simulation de l'application Notepad sur Windows 95.</p>
    </div>
  `;
  return createStandardWindow(title, iconSrc, contentHTML);
}

function createListeWindow(title, iconSrc) {
  const contentHTML = `
    <div style="background: #fff; border: 1px solid #000; padding: 10px; height: 100%; overflow: auto;">
      <h3 style="margin:0 0 10px 0; font-size:1.1rem;">Games - List</h3>
      <p>[■......................................10%] Get Tilted!</p>
      <p>[■■■■■■■■■■100%] Fortnite</p>
      <p>[■■■■..........................40%] Fall Guys</p>
      <p>[............................................0%] Game 0h 0min 0s </p>
      <p>[■......................................10%] Game 0h 0min 0s </p>
      <p>[■■..................................20%] Game 0h 0min 0s </p>
      <p>[■■■..............................30%] Game 0h 0min 0s </p>
      <p>[■■■■..........................40%] Game 0h 0min 0s </p>
      <p>[■■■■■......................50%] Game 0h 0min 0s </p>
      <p>[■■■■■■..................60%] Game 0h 0min 0s </p>
      <p>[■■■■■■■..............70%] Game 0h 0min 0s </p>
      <p>[■■■■■■■■..........80%] Game 0h 0min 0s </p>
      <p>[■■■■■■■■■......90%] Game 0h 0min 0s </p>
      <p>[■■■■■■■■■■100%] Game 4136h 51min 08s </p>
    </div>
  `;
  return createStandardWindow(title, iconSrc, contentHTML);
}

function resizeDemineurWindow(winEl, container) {
  if (!winEl || !container || !winEl.isConnected) return;
  const body = winEl.querySelector(".explorer-body");
  const titleBar = winEl.querySelector(".explorer-title-bar");
  if (!body || !titleBar) return;
  const rect = container.getBoundingClientRect();
  const styles = window.getComputedStyle(body);
  const toNumber = (value) => Number.parseFloat(value) || 0;
  const width = Math.ceil(
    rect.width +
      toNumber(styles.paddingLeft) +
      toNumber(styles.paddingRight) +
      toNumber(styles.borderLeftWidth) +
      toNumber(styles.borderRightWidth)
  );
  const height = Math.ceil(
    rect.height +
      toNumber(styles.paddingTop) +
      toNumber(styles.paddingBottom) +
      toNumber(styles.borderTopWidth) +
      toNumber(styles.borderBottomWidth)
  );
  winEl.style.width = `${width}px`;
  winEl.style.height = `${height + titleBar.offsetHeight}px`;
  centerWindow(winEl);
}

// Fenêtre du démineur : seuls la barre de titre et le conteneur du jeu sont affichés
function createDemineurWindow(title, iconSrc) {
  const contentHTML = `<div id="demineur-container"></div>`;
  const winEl = createStandardWindow(title, iconSrc, contentHTML);
  winEl.classList.add("demineur-window");
  winEl.style.width = "360px";
  winEl.style.height = "420px";
  centerWindow(winEl);
  const menuBar = winEl.querySelector(".explorer-menu-bar");
  if (menuBar) { menuBar.parentNode.removeChild(menuBar); }
  const statusBar = winEl.querySelector(".explorer-status-bar");
  if (statusBar) { statusBar.parentNode.removeChild(statusBar); }
  const resizeHandle = winEl.querySelector(".explorer-resize-handle");
  if (resizeHandle) { resizeHandle.parentNode.removeChild(resizeHandle); }
  const container = winEl.querySelector("#demineur-container");
  if (container) {
    const layoutHandler = () => resizeDemineurWindow(winEl, container);
    container.addEventListener("demineur:layout", layoutHandler);
    if (window.initDemineur) {
      window.initDemineur(container);
      layoutHandler();
    }
  }
  return winEl;
}

function createExplorerWindow(folderName, iconSrc, folderObj) {
  const contentHTML = buildExplorerItems(folderObj);
  const winEl = createStandardWindow(folderName, iconSrc, contentHTML);
  winEl.folderObj = folderObj;
  winEl.dataset.folder = folderName;
  const explorerBody = winEl.querySelector(".explorer-body");
  arrangeExplorerItems(explorerBody);
  enableExplorerItemDrag(explorerBody);
  initExplorerItemDblClick(explorerBody);
  return winEl;
}

function buildExplorerItems(folder) {
  if (!folder || folder.type !== "folder") {
    return `<p>(Dossier introuvable ou invalide)</p>`;
  }
  const children = folder.children || {};
  let htmlContent = "";
  for (let itemName in children) {
    const item = children[itemName];
    let iconPath;
    if (itemName === "ChatCPT.exe") {
      iconPath = "Images/Icons/ChatCPT.ico";
    } else if (itemName === "Hide N Sick") {
      iconPath = "Images/Icons/HideNSick.ico";
    } else if (itemName === "Les 17 odd") {
      iconPath = "Images/Icons/17odd.ico";
    } else if (itemName === "Wallid" || itemName === "Wallid 2") {
      iconPath = "Images/Icons/Wallid.ico";
    } else if (item.type === "folder") {
      iconPath = "Images/Icons/Folder.ico";
    } else {
      iconPath = (folder === fileSystem["Corbeille"])
        ? "Images/Icons/DocumentLocked.ico"
        : "Images/Icons/TextFile.ico";
    }
    htmlContent += `
      <div class="explorer-item" data-type="${item.type}" data-name="${itemName}" style="position:absolute;">
        <img src="${iconPath}" alt="${itemName}">
        <div class="explorer-item-label">${itemName}</div>
      </div>
    `;
  }
  return htmlContent;
}

function initExplorerItemDblClick(container) {
  container.querySelectorAll(".explorer-item").forEach((item) => {
    item.addEventListener("dblclick", () => {
      const itemName = item.dataset.name;
      const itemType = item.dataset.type;
      if (itemType === "file" && itemName === "ChatCPT.exe") {
        window.open("https://chatcpt.netlify.app/", "_blank");
        return;
      }
      if (itemType === "file" && itemName === "Hide N Sick") {
        window.open("https://www.youtube.com/watch?v=AIYfGKqKRnc", "_blank");
        return;
      }
      if (itemType === "file" && itemName === "Les 17 odd") {
        window.open("https://www.instagram.com/les17odd/", "_blank");
        return;
      }
      if (itemType === "file" && itemName === "Wallid") {
        window.open("https://scrum-matgab.itch.io/wallid", "_blank");
        return;
      }
      if (itemType === "file" && itemName === "Wallid 2") {
        window.open("https://sakuships.itch.io/wallid-20", "_blank");
        return;
      }
      const explorerWindow = container.closest(".explorer-window");
      const currentFolderObj = explorerWindow.folderObj || fileSystem[explorerWindow.dataset.folder];
      let itemObj = currentFolderObj && currentFolderObj.children && currentFolderObj.children[itemName];
      if (itemType === "folder") {
        if (itemObj && itemObj.type === "folder") {
          if (openApps[itemName]) {
            bringWindowToFront(openApps[itemName]);
            if (openApps[itemName].dataset.minimized === "true") {
              restoreWindow(openApps[itemName]);
            }
          } else {
            openApps[itemName] = createExplorerWindow(itemName, "Images/Icons/Folder.ico", itemObj);
          }
        } else {
          alert(`Sous-dossier "${itemName}" introuvable.`);
        }
      } else if (itemType === "file") {
        if (openApps[itemName]) {
          bringWindowToFront(openApps[itemName]);
          if (openApps[itemName].dataset.minimized === "true") {
            restoreWindow(openApps[itemName]);
          }
          return;
        }
        if (explorerWindow.dataset.folder === "Corbeille") {
          requestPassword(itemName, (success) => {
            if (success) {
              openApps[itemName] = createTextFileWindow(itemName, "Images/Icons/DocumentLocked.ico");
            }
          });
        } else {
          openApps[itemName] = createTextFileWindow(itemName, "Images/Icons/TextFile.ico");
        }
      }
    });
  });
}

function createTextFileWindow(title, iconSrc) {
  const contentHTML = `
    <div style="background: #fff; border: 1px solid #000; padding: 10px; height: 100%; overflow: auto;">
      <h3 style="margin:0 0 10px 0; font-size:1.1rem;">${title}</h3>
      <p>Ceci est le contenu du fichier texte "${title}".</p>
      <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus.</p>
    </div>
  `;
  return createStandardWindow(title, iconSrc, contentHTML);
}

function requestPassword(itemName, onSuccess) {
  if (openApps["pwd_" + itemName]) {
    bringWindowToFront(openApps["pwd_" + itemName]);
    return;
  }
  const contentHTML = `
    <div style="background: #fff; border: 1px solid #000; padding: 10px;">
      <h3 style="margin:0 0 10px 0; font-size:1.1rem;">Mot de passe requis</h3>
      <p>Entrez le mot de passe pour ouvrir "${itemName}"</p>
      <input type="password" id="password-input" style="width: 100%; margin-bottom: 10px;">
      <button id="password-ok">OK</button>
      <div id="password-error" style="color: red; display: none; margin-top: 5px;">Mot de passe incorrect</div>
    </div>
  `;
  const passWin = createPasswordWindow("Mot de passe", "Images/Icons/DocumentLocked.ico", contentHTML);
  openApps["pwd_" + itemName] = passWin;
  passWin.querySelector(".window-close-btn").addEventListener("click", () => {
    delete openApps["pwd_" + itemName];
  });
  passWin.querySelector("#password-ok").addEventListener("click", () => {
    const pwd = passWin.querySelector("#password-input").value;
    if (pwd === "1234") {
      removeTaskbarButton(passWin);
      passWin.remove();
      delete openApps["pwd_" + itemName];
      onSuccess(true);
    } else {
      const errorDiv = passWin.querySelector("#password-error");
      errorDiv.style.display = "block";
    }
  });
}

function createPasswordWindow(title, iconSrc, contentHTML) {
  const win = createStandardWindow(title, iconSrc, contentHTML);
  win.style.height = "220px";
  centerWindow(win);
  return win;
}
