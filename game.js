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
        this.obstacles = [];
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
        
        // Dynamic step size (speed) - Balanced for different screen sizes
        // On PC (large width), we increase speed to cover distances.
        // On Mobile (small width), we decrease speed to increase challenge.
        this.stepSize = 0.22 + (Math.max(0, this.containerW - 400) * 0.0016);
        this.stepSize = Math.min(this.stepSize, 2.0); // Cap max speed
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

        document.addEventListener("keydown", (e) => {
            this.keys[e.code] = true;
            // ESC key to exit pseudo-fullscreen
            if (e.code === "Escape" && document.body.classList.contains("is-pseudo-fullscreen")) {
                document.body.classList.remove("is-pseudo-fullscreen");
                this.updateDimensions();
            }
        });
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
        this.obstacles = [];
        this.spawnTimer = 0;
        
        // Clear targets & obstacles from DOM
        document.querySelectorAll(".target").forEach(t => t.remove());
        document.querySelectorAll(".obstacle").forEach(o => o.remove());
        
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

        if (this.keys["ArrowUp"] || this.keys["KeyW"]) dy -= 1;
        if (this.keys["ArrowDown"] || this.keys["KeyS"]) dy += 1;
        if (this.keys["ArrowLeft"] || this.keys["KeyA"]) dx -= 1;
        if (this.keys["ArrowRight"] || this.keys["KeyD"]) dx += 1;

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

            // Random chance to spawn obstacle based on progress
            const obstacleChance = Math.min(0.7, 0.1 + (this.score / 50));
            if (Math.random() < obstacleChance) {
                this.spawnObstacle();
            }
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

    hitObstacle(obstacle, index) {
        obstacle.elem.remove();
        this.obstacles.splice(index, 1);

        // Penalty
        this.score = Math.max(0, this.score - 2);

        // Visual feedback for penalty (optional, can be added to UI)
        this.scoreDisplay.style.color = "var(--secondary-color)";
        setTimeout(() => {
            this.scoreDisplay.style.color = "var(--primary-color)";
        }, 300);

        this.updateUI();
    }

    spawnObstacle() {
        if (this.obstacles.length >= 15) return;

        const obs = {
            id: Date.now() + Math.random(),
            x: 0,
            y: 0,
            w: 48,
            h: 48,
            elem: document.createElement("div")
        };

        obs.elem.classList.add("obstacle");
        this.containerElem.appendChild(obs.elem);

        obs.w = obs.elem.offsetWidth;
        obs.h = obs.elem.offsetHeight;

        const maxL = this.containerW - obs.w - 10;
        const maxT = this.containerH - obs.h - 10;

        obs.x = Math.floor(Math.random() * maxL) + 5;
        obs.y = Math.floor(Math.random() * maxT) + 5;

        obs.elem.style.left = `${obs.x}px`;
        obs.elem.style.top = `${obs.y}px`;

        this.obstacles.push(obs);
    }

    checkCollisions() {
        const px1 = this.playerX;
        const py1 = this.playerY;
        const px2 = px1 + this.playerW;
        const py2 = py1 + this.playerH;

        // 1. Check Targets
        for (let i = this.targets.length - 1; i >= 0; i--) {
            const t = this.targets[i];
            if (px1 < t.x + t.w && px2 > t.x && py1 < t.y + t.h && py2 > t.y) {
                this.collectTarget(t, i);
            }
        }

        // 2. Check Obstacles
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const o = this.obstacles[i];
            if (px1 < o.x + o.w && px2 > o.x && py1 < o.y + o.h && py2 > o.y) {
                this.hitObstacle(o, i);
            }
        }
    }

    collectTarget(target, index) {
        target.elem.remove();
        this.targets.splice(index, 1);
        
        this.score++;
        this.targetsHit++;
        
        // Progressive difficulty increase
        if (this.targetsHit % 4 === 0 && this.currentSpawnRate > 500) {
            this.currentSpawnRate = Math.max(500, this.currentSpawnRate - 400);
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
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

        // Use Pseudo-Fullscreen for iOS or Safari if needed
        if (isIOS || isSafari) {
            document.body.classList.toggle("is-pseudo-fullscreen");
            this.updateDimensions();
            return;
        }

        const doc = document.documentElement;
        const fsElement = document.fullscreenElement ||
                         document.webkitFullscreenElement ||
                         document.mozFullScreenElement ||
                         document.msFullscreenElement;

        if (!fsElement) {
            if (doc.requestFullscreen) {
                doc.requestFullscreen().catch(e => {
                    // Fallback for browsers that fail
                    document.body.classList.add("is-pseudo-fullscreen");
                    this.updateDimensions();
                });
            } else if (doc.webkitRequestFullscreen) {
                doc.webkitRequestFullscreen();
            } else if (doc.mozRequestFullScreen) {
                doc.mozRequestFullScreen();
            } else if (doc.msRequestFullscreen) {
                doc.msRequestFullscreen();
            } else {
                // Total fallback
                document.body.classList.toggle("is-pseudo-fullscreen");
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }

        // Listen for standard FS changes to update dimensions
        document.addEventListener("fullscreenchange", () => this.updateDimensions());
        document.addEventListener("webkitfullscreenchange", () => this.updateDimensions());
        document.addEventListener("mozfullscreenchange", () => this.updateDimensions());
        document.addEventListener("MSFullscreenChange", () => this.updateDimensions());
    }
}

// Start Game
window.onload = () => {
    window.game = new BananaJoe();
};
