// Game Constants and Variables
const player = document.getElementById("player");
const container = document.getElementById("container");
const scoreDisplay = document.getElementById("score");
const spawnTimeDisplay = document.getElementById("spawnTime");
const gameOverScreen = document.getElementById("gameOver");
const finalScoreDisplay = document.getElementById("finalScore");

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
    // Calculate movement step relative to screen width (e.g. 1.5% of width per interval)
    STEP = Math.max(container.clientWidth * 0.015, 5);
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
    gameOverScreen.style.display = "block";
    finalScoreDisplay.textContent = `Score: ${score}`;

    // Stop all movement
    clearInterval(movementInterval);
    movementInterval = null;
}

// Movement Logic
function movePlayer() {
    if (isGameOver) return;

    let x = parseFloat(player.style.left) || 0;
    let y = parseFloat(player.style.top) || 0;

    const maxX = container.clientWidth - player.offsetWidth;
    const maxY = container.clientHeight - player.offsetHeight;

    let moved = false;

    if (keysPressed.ArrowUp) {
        y -= STEP;
        moved = true;
    }
    if (keysPressed.ArrowDown) {
        y += STEP;
        moved = true;
    }
    if (keysPressed.ArrowLeft) {
        x -= STEP;
        moved = true;
    }
    if (keysPressed.ArrowRight) {
        x += STEP;
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

// Start Game Loop
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

// Event Listeners for Touch Controls
const addTouchListener = (btnId, key) => {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    btn.addEventListener("touchstart", (e) => {
        e.preventDefault(); // Prevent ghost clicks
        keysPressed[key] = true;
    });
    btn.addEventListener("touchend", (e) => {
        e.preventDefault();
        keysPressed[key] = false;
    });
    // Mouse fallback for testing on desktop with mouse
    btn.addEventListener("mousedown", () => keysPressed[key] = true);
    btn.addEventListener("mouseup", () => keysPressed[key] = false);
    btn.addEventListener("mouseleave", () => keysPressed[key] = false);
};

addTouchListener("up-btn", "ArrowUp");
addTouchListener("down-btn", "ArrowDown");
addTouchListener("left-btn", "ArrowLeft");
addTouchListener("right-btn", "ArrowRight");

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
window.onload = startGame;
window.addEventListener("resize", () => {
    centerPlayer();
    updateStepSize();
});
