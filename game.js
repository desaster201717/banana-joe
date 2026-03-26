/**
 * BananaJoe - Optimized Game Engine
 */

class BananaJoe {
    constructor() {
        // DOM Elements
        this.playerElem = document.getElementById("player");
        this.containerElem = document.getElementById("container");
        this.scoreDisplay = document.getElementById("score");
        this.spawnTimeDisplay = document.getElementById("spawnTime");
        this.gameOverScreen = document.getElementById("gameOver");
        this.startScreen = document.getElementById("startScreen");
        this.finalScoreDisplay = document.getElementById("finalScore");
        this.playerNameInput = document.getElementById("playerNameInput");
        this.highscoreListElement = document.getElementById("highscoreList");
        this.startHighscoreList = document.getElementById("startHighscoreList");

        // Game Config
        this.JSONBIN_BIN_ID = "69c5041db7ec241ddca5830d";
        this.JSONBIN_API_KEY = "$2a$10$tnWV4DXh8YcdttorcyL4nun1J83HLikAD0OU8R41xkeDPklNyVoMS";
        
        // Game State
        this.playerName = "";
        this.score = 0;
        this.targets = []; 
        this.isGameOver = false;
        this.isStarted = false;
        
        // Logic Vars
        this.playerX = 0;
        this.playerY = 0;
        this.playerW = 0;
        this.playerH = 0;
        this.containerW = 0;
        this.containerH = 0;
        
        this.spawnTimer = 0;
        this.currentSpawnRate = 2500; // ms
        this.targetsHit = 0;
        
        this.stepSize = 0;
        this.baseSpeed = 0.5; // pixel per ms base
        
        // Input
        this.keys = {};
        this.joystickDeltaX = 0;
        this.joystickDeltaY = 0;
        
        // Loop
        this.lastTime = 0;
        this.animationId = null;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateDimensions();
        this.centerPlayer();
        this.showJoystickIfTouch();
        
        // Show start screen
        this.startScreen.classList.add("visible");
    }

    updateDimensions() {
        this.containerW = this.containerElem.clientWidth;
        this.containerH = this.containerElem.clientHeight;
        this.playerW = this.playerElem.offsetWidth;
        this.playerH = this.playerElem.offsetHeight;
        
        // Dynamic step size (speed)
        this.stepSize = Math.max(0.2, Math.min(this.containerW * 0.0006, 0.5));
    }

    centerPlayer() {
        this.playerX = (this.containerW / 2) - (this.playerW / 2);
        this.playerY = (this.containerH / 2) - (this.playerH / 2);
        this.syncPlayerDOM();
    }

    setupEventListeners() {
        window.addEventListener("resize", () => {
            this.updateDimensions();
            if (!this.isStarted) this.centerPlayer();
        });

        document.addEventListener("keydown", (e) => this.keys[e.code] = true);
        document.addEventListener("keyup", (e) => this.keys[e.code] = false);

        document.getElementById("start-btn").addEventListener("click", () => this.handleStart());
        document.getElementById("show-highscores-btn").addEventListener("click", () => this.handleShowHighscores());
        
        // Fullscreen
        document.getElementById("fullscreen-btn").addEventListener("click", () => this.toggleFullscreen());

        // Joystick
        this.setupJoystick();
    }

    handleStart() {
        const name = this.playerNameInput.value.trim();
        if (name.length > 0) {
            this.playerName = name;
            this.startScreen.classList.remove("visible");
            this.startGame();
        } else {
            alert("Bitte gib deinen Namen ein!");
        }
    }

    startGame() {
        this.isStarted = true;
        this.isGameOver = false;
        this.score = 0;
        this.targetsHit = 0;
        this.currentSpawnRate = 2500;
        this.targets = [];
        this.spawnTimer = 0;
        
        // Clear targets from DOM if any left
        document.querySelectorAll(".target").forEach(t => t.remove());
        
        this.updateUI();
        this.lastTime = performance.now();
        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    gameLoop(currentTime) {
        if (this.isGameOver) return;

        const dt = currentTime - this.lastTime;
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        // 1. Handle Movement
        let dx = 0;
        let dy = 0;

        if (this.keys["ArrowUp"]) dy -= 1;
        if (this.keys["ArrowDown"]) dy += 1;
        if (this.keys["ArrowLeft"]) dx -= 1;
        if (this.keys["ArrowRight"]) dx += 1;

        // Joystick adds to movement
        dx += this.joystickDeltaX;
        dy += this.joystickDeltaY;

        // Normalize vector if moving diagonally
        const mag = Math.sqrt(dx * dx + dy * dy);
        if (mag > 0) {
            dx /= mag;
            dy /= mag;
            
            this.playerX += dx * this.stepSize * dt;
            this.playerY += dy * this.stepSize * dt;
        }

        // Clamp
        this.playerX = Math.max(0, Math.min(this.playerX, this.containerW - this.playerW));
        this.playerY = Math.max(0, Math.min(this.playerY, this.containerH - this.playerH));

        // 2. Handle Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.currentSpawnRate) {
            this.spawnTimer = 0;
            this.spawnTarget();
        }

        // 3. Collision Detection
        this.checkCollisions();
    }

    draw() {
        this.syncPlayerDOM();
    }

    syncPlayerDOM() {
        this.playerElem.style.transform = `translate(${this.playerX}px, ${this.playerY}px)`;
    }

    spawnTarget() {
        if (this.targets.length >= 10) {
            this.triggerGameOver();
            return;
        }

        const target = {
            id: Date.now() + Math.random(),
            x: 0,
            y: 0,
            w: 48, // Base size, updated on append
            h: 48,
            elem: document.createElement("div")
        };

        target.elem.classList.add("target");
        this.containerElem.appendChild(target.elem);

        target.w = target.elem.offsetWidth;
        target.h = target.elem.offsetHeight;

        const maxL = this.containerW - target.w - 10;
        const maxT = this.containerH - target.h - 10;

        target.x = Math.floor(Math.random() * maxL) + 5;
        target.y = Math.floor(Math.random() * maxT) + 5;

        target.elem.style.left = `${target.x}px`;
        target.elem.style.top = `${target.y}px`;

        this.targets.push(target);
        this.updateUI();
    }

    checkCollisions() {
        const px1 = this.playerX;
        const py1 = this.playerY;
        const px2 = px1 + this.playerW;
        const py2 = py1 + this.playerH;

        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            const tx1 = t.x;
            const ty1 = t.y;
            const tx2 = tx1 + t.w;
            const ty2 = ty1 + t.h;

            if (px1 < tx2 && px2 > tx1 && py1 < ty2 && py2 > ty1) {
                this.collectTarget(t, i);
            }
        }
    }

    collectTarget(target, index) {
        target.elem.remove();
        this.targets.splice(index, 1);
        
        this.score++;
        this.targetsHit++;
        
        if (this.targetsHit % 5 === 0 && this.currentSpawnRate > 750) {
            this.currentSpawnRate = Math.max(750, this.currentSpawnRate - 500);
        }
        
        this.updateUI();
    }

    updateUI() {
        this.scoreDisplay.textContent = `Score: ${this.score}`;
        this.spawnTimeDisplay.innerHTML = `Speed: ${(this.currentSpawnRate/1000).toFixed(1)}s<br>Bananas: ${this.targets.length}/10`;
        
        if (this.targets.length >= 7) {
            this.spawnTimeDisplay.style.color = "var(--secondary-color)";
        } else {
            this.spawnTimeDisplay.style.color = "white";
        }
    }

    triggerGameOver() {
        this.isGameOver = true;
        cancelAnimationFrame(this.animationId);
        
        this.gameOverScreen.classList.add("visible");
        this.finalScoreDisplay.textContent = `Score: ${this.score}`;
        this.saveAndLoadHighscores(this.playerName, this.score);
    }

    // Highscore & API Methods
    async fetchHighscores() {
        try {
            const response = await fetch(`https://api.jsonbin.io/v3/b/${this.JSONBIN_BIN_ID}/latest`, {
                headers: { 'X-Master-Key': this.JSONBIN_API_KEY }
            });
            const data = await response.json();
            return data.record.highscores || [];
        } catch (e) {
            console.error("Score fetch failed", e);
            return [];
        }
    }

    renderHighscores(scores, list) {
        list.innerHTML = scores.length ? "" : "<li>Noch keine Highscores.</li>";
        scores.forEach((s, i) => {
            const li = document.createElement("li");
            li.innerHTML = `<span>${i + 1}. ${s.name}</span><span style="color:var(--primary-color)">${s.score} Pkt</span>`;
            list.appendChild(li);
        });
    }

    async saveAndLoadHighscores(name, score) {
        this.highscoreListElement.innerHTML = "<li>Speichere...</li>";
        try {
            let scores = await this.fetchHighscores();
            scores.push({ name, score });
            scores.sort((a,b) => b.score - a.score);
            scores = scores.slice(0, 10);

            await fetch(`https://api.jsonbin.io/v3/b/${this.JSONBIN_BIN_ID}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': this.JSONBIN_API_KEY },
                body: JSON.stringify({ highscores: scores })
            });

            this.renderHighscores(scores, this.highscoreListElement);
        } catch (e) {
            this.highscoreListElement.innerHTML = "<li>DB Fehler</li>";
        }
    }

    async handleShowHighscores() {
        const list = document.getElementById("startHighscoreContainer");
        list.style.display = "block";
        this.startHighscoreList.innerHTML = "<li>Lade...</li>";
        const scores = await this.fetchHighscores();
        this.renderHighscores(scores, this.startHighscoreList);
    }

    // Input & Joystick Helpers
    setupJoystick() {
        const zone = document.getElementById("joystick-zone");
        const stick = document.getElementById("joystick-stick");
        const base = document.getElementById("joystick-base");
        if (!zone) return;

        let activeId = null;

        const handleMove = (x, y) => {
            const rect = base.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            let dx = x - cx;
            let dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const max = rect.width / 2;

            if (dist > max) {
                dx *= max / dist;
                dy *= max / dist;
            }

            stick.style.transform = `translate(${dx}px, ${dy}px)`;
            this.joystickDeltaX = dx / max;
            this.joystickDeltaY = dy / max;
        };

        zone.addEventListener("touchstart", (e) => {
            e.preventDefault();
            if (activeId !== null) return;
            const t = e.changedTouches[0];
            activeId = t.identifier;
            handleMove(t.clientX, t.clientY);
        }, {passive: false});

        zone.addEventListener("touchmove", (e) => {
            e.preventDefault();
            for (let t of e.changedTouches) {
                if (t.identifier === activeId) handleMove(t.clientX, t.clientY);
            }
        }, {passive: false});

        const end = (e) => {
            for (let t of e.changedTouches) {
                if (t.identifier === activeId) {
                    activeId = null;
                    stick.style.transform = `translate(0,0)`;
                    this.joystickDeltaX = 0;
                    this.joystickDeltaY = 0;
                }
            }
        };
        zone.addEventListener("touchend", end);
        zone.addEventListener("touchcancel", end);
        
        // Mouse fallback
        let isMouseDown = false;
        zone.addEventListener("mousedown", (e) => { isMouseDown = true; handleMove(e.clientX, e.clientY); });
        document.addEventListener("mousemove", (e) => { if (isMouseDown) handleMove(e.clientX, e.clientY); });
        document.addEventListener("mouseup", () => { isMouseDown = false; stick.style.transform = `translate(0,0)`; this.joystickDeltaX = 0; this.joystickDeltaY = 0; });
    }

    showJoystickIfTouch() {
        if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0)) {
            document.getElementById("joystick-zone").style.display = "block";
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(e => console.log(e));
        } else {
            document.exitFullscreen();
        }
    }
}

// Start Game
window.onload = () => {
    window.game = new BananaJoe();
};
