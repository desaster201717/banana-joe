// Game Constants and Variables
const player = document.getElementById("player");
const container = document.getElementById("container");
const scoreDisplay = document.getElementById("score");
const spawnTimeDisplay = document.getElementById("spawnTime");
const gameOverScreen = document.getElementById("gameOver");
const finalScoreDisplay = document.getElementById("finalScore");

// Highscore UI
const startScreen = document.getElementById("startScreen");
const playerNameInput = document.getElementById("playerNameInput");
const startBtn = document.getElementById("start-btn");
const highscoreListElement = document.getElementById("highscoreList");

let playerName = "";

// JSONBin.io Config (Nutzer muss dies ausfüllen!)
const JSONBIN_BIN_ID = "69c5041db7ec241ddca5830d";
const JSONBIN_API_KEY = "$2a$10$tnWV4DXh8YcdttorcyL4nun1J83HLikAD0OU8R41xkeDPklNyVoMS";

let score = 0;
let targets = []; // Array of active target elements
let isGameOver = false;
let spawnTime = 3000;
let lastSpawnTime = 0;
let targetsHit = 0; // Fixed initialization to 0
let movementInterval = null;

// Movement speed/step (dynamically calculated)
let STEP = 10;
const MOVE_INTERVAL_MS = 30; // Smoother movement

function updateStepSize() {
    // Make the step size consistent: feels fast enough on mobile, not too fast on PC
    // Minimum 15px per interval, gently scales up on very wide screens, max 22px
    STEP = Math.max(15, Math.min(container.clientWidth * 0.012, 22));
}

// Input State
const keysPressed = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// Initialize Player Position
function centerPlayer() {
    const containerRect = container.getBoundingClientRect();
    // Position relative to container
    const x = (container.clientWidth / 2) - (player.offsetWidth / 2);
    const y = (container.clientHeight / 2) - (player.offsetHeight / 2);
    player.style.left = `${x}px`;
    player.style.top = `${y}px`;
}

// Spawning Logic
function spawnTarget() {
    if (isGameOver) return;

    // Check Loss Condition: Too many uncollected bananas
    // Original logic: targets.length - score >= 10. 
    // Since we remove collected targets from 'targets' array, 'targets.length' IS the uncollected count.
    if (targets.length >= 10) {
        triggerGameOver();
        return;
    }

    const newTarget = document.createElement("div");
    newTarget.classList.add("target");

    // Spawn within container bounds
    container.appendChild(newTarget); // Append first to calculate dynamic sizes

    // Target dimensions (dynamic)
    const tWidth = newTarget.offsetWidth;
    const tHeight = newTarget.offsetHeight;

    // container dimensions
    const cWidth = container.clientWidth;
    const cHeight = container.clientHeight;

    // Random position within container (padding 5px)
    const maxLeft = Math.max(0, cWidth - tWidth - 10);
    const maxTop = Math.max(0, cHeight - tHeight - 10);

    const randomLeft = Math.floor(Math.random() * maxLeft) + 5;
    const randomTop = Math.floor(Math.random() * maxTop) + 5;

    newTarget.style.left = `${randomLeft}px`;
    newTarget.style.top = `${randomTop}px`;

    targets.push(newTarget);

    // Schedule next spawn with variable time
    setTimeout(spawnTarget, spawnTime);
}

// Collision Detection
function checkCollisions() {
    if (isGameOver) return;

    const playerRect = player.getBoundingClientRect();

    // Iterate backwards to allow removal
    for (let i = targets.length - 1; i >= 0; i--) {
        const target = targets[i];
        const targetRect = target.getBoundingClientRect();

        if (
            playerRect.left < targetRect.right &&
            playerRect.right > targetRect.left &&
            playerRect.top < targetRect.bottom &&
            playerRect.bottom > targetRect.top
        ) {
            // Collision detected
            collectTarget(target, i);
        }
    }
}

function collectTarget(targetElement, index) {
    // Remove from DOM and Array
    targetElement.remove();
    targets.splice(index, 1);

    score++;
    targetsHit++;
    updateUI();

    // Difficulty Increase
    if (targetsHit > 0 && targetsHit % 5 === 0 && spawnTime > 1000) {
        spawnTime -= 500;
        updateUI(); // Update spawn time display
    }
}

function updateUI() {
    scoreDisplay.textContent = `Score: ${score}`;
    spawnTimeDisplay.innerHTML = `Spawn Time: ${spawnTime / 1000}s <br> Active Bananas: ${targets.length}/10`;

    // Color code danger
    if (targets.length >= 7) {
        spawnTimeDisplay.style.color = "red";
    } else {
        spawnTimeDisplay.style.color = "white";
    }
}

function triggerGameOver() {
    isGameOver = true;

    // Stop all movement
    clearInterval(movementInterval);
    movementInterval = null;

    gameOverScreen.style.display = "block";
    finalScoreDisplay.textContent = `Score: ${score}`;
    highscoreListElement.innerHTML = "<li>Speichere & Lade Highscores...</li>";

    saveAndLoadHighscores(playerName, score);
}

async function saveAndLoadHighscores(name, newScore) {
    if (JSONBIN_BIN_ID === "YOUR_BIN_ID") {
        highscoreListElement.innerHTML = "<li>Bitte konfiguriere JSONBin API Keys in game.js!</li>";
        return;
    }

    try {
        // 1. Fetch current highscores
        let response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_API_KEY }
        });

        let data = await response.json();
        let highscores = data.record.highscores || [];

        // 2. Add new score and sort
        highscores.push({ name: name, score: newScore });
        highscores.sort((a, b) => b.score - a.score);

        // Keep only top 10
        highscores = highscores.slice(0, 10);

        // 3. Save back to API
        await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': JSONBIN_API_KEY
            },
            body: JSON.stringify({ highscores: highscores })
        });

        // 4. Render the list
        highscoreListElement.innerHTML = "";
        highscores.forEach((entry, index) => {
            const li = document.createElement("li");
            const rank = (index + 1) + ".";

            const spanLeft = document.createElement("span");
            spanLeft.textContent = `${rank} ${entry.name}`;

            const spanRight = document.createElement("span");
            spanRight.textContent = `${entry.score} Pkt`;
            spanRight.style.color = "yellow";
            spanRight.style.fontWeight = "bold";

            li.appendChild(spanLeft);
            li.appendChild(spanRight);
            highscoreListElement.appendChild(li);
        });

    } catch (error) {
        console.error("Fehler beim Laden/Speichern der Highscores:", error);
        highscoreListElement.innerHTML = "<li>Fehler beim Verbinden zur Datenbank.</li>";
    }
}

// Movement Logic
function movePlayer() {
    if (isGameOver) return;

    let x = parseFloat(player.style.left) || 0;
    let y = parseFloat(player.style.top) || 0;

    const maxX = container.clientWidth - player.offsetWidth;
    const maxY = container.clientHeight - player.offsetHeight;

    let moved = false;

    // Keyboard Movement
    if (keysPressed.ArrowUp) { y -= STEP; moved = true; }
    if (keysPressed.ArrowDown) { y += STEP; moved = true; }
    if (keysPressed.ArrowLeft) { x -= STEP; moved = true; }
    if (keysPressed.ArrowRight) { x += STEP; moved = true; }

    // Joystick Movement
    if (typeof joystickDeltaX !== 'undefined' && (joystickDeltaX !== 0 || joystickDeltaY !== 0)) {
        x += joystickDeltaX * STEP;
        y += joystickDeltaY * STEP;
        moved = true;
    }

    // Clamp values
    x = Math.max(0, Math.min(x, maxX));
    y = Math.max(0, Math.min(y, maxY));

    player.style.left = `${x}px`;
    player.style.top = `${y}px`;

    if (moved) {
        checkCollisions();
    }
}

// Start Game Loop (nun init nur setup)
function startGame() {
    updateStepSize();
    centerPlayer();
    updateUI();
    // Start Spawning
    spawnTarget();

    // Start Movement Interval
    if (!movementInterval) {
        movementInterval = setInterval(movePlayer, MOVE_INTERVAL_MS);
    }
}

// Event Listeners for Keyboard
document.addEventListener("keydown", (e) => {
    if (keysPressed.hasOwnProperty(e.code)) {
        keysPressed[e.code] = true;
    }
    // Mapping for older generic keys if needed (ArrowUp is standard now)
});

document.addEventListener("keyup", (e) => {
    if (keysPressed.hasOwnProperty(e.code)) {
        keysPressed[e.code] = false;
    }
});

// Joystick State and Implementation
let isDragging = false;
let joystickDeltaX = 0;
let joystickDeltaY = 0;
let activeTouchId = null;

const joystickZone = document.getElementById("joystick-zone");
const joystickBase = document.getElementById("joystick-base");
const joystickStick = document.getElementById("joystick-stick");

function showJoystickIfTouch() {
    if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
        joystickZone.style.display = "block";
    }
}

function updateJoystick(clientX, clientY) {
    if(!joystickBase || !joystickStick) return;
    const rect = joystickBase.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    
    const maxDist = rect.width / 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance > maxDist) {
        dx = (dx / distance) * maxDist;
        dy = (dy / distance) * maxDist;
    }
    
    joystickStick.style.transform = `translate(${dx}px, ${dy}px)`;
    
    joystickDeltaX = dx / maxDist; // range -1 to 1
    joystickDeltaY = dy / maxDist; // range -1 to 1
}

function resetJoystick() {
    if(joystickStick) {
        joystickStick.style.transform = `translate(0px, 0px)`;
    }
    joystickDeltaX = 0;
    joystickDeltaY = 0;
}

if(joystickZone) {
    joystickZone.addEventListener("touchstart", (e) => {
        e.preventDefault();
        if (activeTouchId !== null) return;
        const touch = e.changedTouches[0];
        activeTouchId = touch.identifier;
        isDragging = true;
        updateJoystick(touch.clientX, touch.clientY);
    }, { passive: false });

    joystickZone.addEventListener("touchmove", (e) => {
        e.preventDefault();
        if (!isDragging) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === activeTouchId) {
                updateJoystick(touch.clientX, touch.clientY);
                break;
            }
        }
    }, { passive: false });

    const handleTouchEnd = (e) => {
        e.preventDefault();
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === activeTouchId) {
                isDragging = false;
                activeTouchId = null;
                resetJoystick();
                break;
            }
        }
    };

    joystickZone.addEventListener("touchend", handleTouchEnd, { passive: false });
    joystickZone.addEventListener("touchcancel", handleTouchEnd, { passive: false });

    // Mouse fallback for desktop testing
    joystickZone.addEventListener("mousedown", (e) => {
        isDragging = true;
        updateJoystick(e.clientX, e.clientY);
    });
    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            updateJoystick(e.clientX, e.clientY);
        }
    });
    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            resetJoystick();
        }
    });
}

// Fullscreen Button
document.getElementById("fullscreen-btn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Init
window.onload = () => {
    if (typeof showJoystickIfTouch === 'function') { showJoystickIfTouch(); }
    updateStepSize();
    centerPlayer();
    updateUI();
    startScreen.style.display = "block"; // Zeige Name-Eingabe Screen
};

// Button Listener für StartScreen
startBtn.addEventListener("click", () => {
    const name = playerNameInput.value.trim();
    if (name.length > 0) {
        playerName = name;
        startScreen.style.display = "none";
        startGame(); // Startet das eigentliche Level
    } else {
        alert("Bitte gib deinen Namen ein!");
    }
});

window.addEventListener("resize", () => {
    centerPlayer();
    updateStepSize();
});
