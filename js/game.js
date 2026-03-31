// ── Game — Main Orchestrator ──

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.pitch = new Pitch();
        this.ball = new Ball();
        this.weaponSystem = new WeaponSystem();
        this.combatMode = new CombatMode();
        this.ai = new AI();
        this.economy = new Economy();
        this.ui = new UI();

        this.state = GAME_STATE.TITLE;
        this.homePlayers = [];
        this.awayPlayers = [];
        this.selectedPlayer = null;
        this.selectedIndex = 0;

        this.homeScore = 0;
        this.awayScore = 0;
        this.half = 1;
        this.matchTime = 0; // seconds elapsed in current half
        this.kills = 0;

        this.keys = {};
        this.mouse = { x: 0, y: 0, down: false };
        this.pauseTimer = 0;

        this.lastTime = 0;
        this.running = false;
    }

    init() {
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.bindInput();
        this.ui.init();
        this.bindMenus();
        this.running = true;
        requestAnimationFrame(t => this.loop(t));
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.pitch.resize(this.canvas.width, this.canvas.height);
    }

    // ── Input ──

    bindInput() {
        window.addEventListener('keydown', e => {
            this.keys[e.key.toLowerCase()] = true;

            if (this.state === GAME_STATE.PLAYING) {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    this.cycleSelectedPlayer();
                }
                if (e.key === 'f' || e.key === 'F') {
                    this.enterCombatMode();
                }
                if (e.key >= '1' && e.key <= '6') {
                    this.selectPlayerByNumber(parseInt(e.key) - 1);
                }
                if (e.key === ' ') {
                    e.preventDefault();
                    this.passOrShoot();
                }
                if (e.key === 'q' || e.key === 'Q') {
                    this.throughBall();
                }
                if (e.key === 'e' || e.key === 'E') {
                    this.tackle();
                }
            }

            if (this.state === GAME_STATE.COMBAT) {
                if (e.key === 'Escape') {
                    this.exitCombatMode();
                }
            }
        });

        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
        });

        this.canvas.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });

        this.canvas.addEventListener('mousedown', e => {
            this.mouse.down = true;

            if (this.state === GAME_STATE.COMBAT) {
                this.combatAttack();
            } else if (this.state === GAME_STATE.PLAYING) {
                // Click to select nearest home player
                this.selectPlayerByClick(e.clientX, e.clientY);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            this.mouse.down = false;
        });
    }

    bindMenus() {
        document.getElementById('btn-play').addEventListener('click', () => {
            this.startMatch();
        });

        document.getElementById('btn-how').addEventListener('click', () => {
            document.getElementById('title-screen').classList.add('hidden');
            document.getElementById('how-screen').classList.remove('hidden');
        });

        document.getElementById('btn-back').addEventListener('click', () => {
            document.getElementById('how-screen').classList.add('hidden');
            document.getElementById('title-screen').classList.remove('hidden');
        });

        document.getElementById('btn-second-half').addEventListener('click', () => {
            this.startSecondHalf();
        });

        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.ui.hideMatchEnd();
            this.ui.showShop(this.economy);
        });

        document.getElementById('btn-next-match').addEventListener('click', () => {
            this.ui.hideMatchEnd();
            this.startMatch();
        });

        document.getElementById('btn-exit-shop').addEventListener('click', () => {
            this.ui.hideShop();
            this.startMatch();
        });
    }

    // ── Match Setup ──

    startMatch() {
        document.getElementById('title-screen').classList.add('hidden');

        this.homeScore = 0;
        this.awayScore = 0;
        this.half = 1;
        this.matchTime = 0;
        this.kills = 0;
        this.pauseTimer = 0;

        this.economy.resetForNewMatch();

        // Create players
        this.homePlayers = POSITIONS.HOME.map((pos, i) => new Player(TEAM.HOME, i, pos));
        this.awayPlayers = POSITIONS.AWAY.map((pos, i) => new Player(TEAM.AWAY, i, pos));

        // Assign starting weapons — random hidden assignments
        this.assignStartingWeapons(this.homePlayers);
        this.assignStartingWeapons(this.awayPlayers);

        // Apply economy upgrades
        this.economy.applyUpgrades(this.homePlayers);

        // Position everyone
        this.resetPositions();

        // Select first outfield player
        this.selectPlayerByNumber(3); // select midfielder

        this.ui.updateScore(0, 0);
        this.ui.updateCash(this.economy.cash);

        this.state = GAME_STATE.KICKOFF;
        this.pauseTimer = MATCH.KICKOFF_PAUSE;
        playSound('whistle');
    }

    assignStartingWeapons(players) {
        const alivePlayers = players.filter(p => p.alive);
        if (alivePlayers.length === 0) return;

        // Reset all to fist
        alivePlayers.forEach(p => p.setWeapon(WEAPON_TYPE.FIST));

        // Assign rifle to one random player (not GK preferably)
        const outfield = alivePlayers.filter(p => p.role !== 'GK');
        const riflePool = outfield.length > 0 ? outfield : alivePlayers;
        const rifleCarrier = riflePool[randInt(0, riflePool.length - 1)];
        rifleCarrier.setWeapon(WEAPON_TYPE.RIFLE);

        // Assign shank to one random player (different from rifle)
        const shankPool = alivePlayers.filter(p => p !== rifleCarrier);
        if (shankPool.length > 0) {
            const shankCarrier = shankPool[randInt(0, shankPool.length - 1)];
            shankCarrier.setWeapon(WEAPON_TYPE.SHANK);
        }

        // Additional weapon slots from economy (home team only)
        if (players[0] && players[0].team === TEAM.HOME) {
            const slots = this.economy.getAvailableWeaponSlots();
            const fistPlayers = alivePlayers.filter(p => p.weapon === WEAPON_TYPE.FIST);

            // Extra shanks
            for (let i = 0; i < slots.shanks - 1 && fistPlayers.length > 0; i++) {
                const idx = randInt(0, fistPlayers.length - 1);
                fistPlayers[idx].setWeapon(WEAPON_TYPE.SHANK);
                fistPlayers.splice(idx, 1);
            }

            // Sidearm
            if (slots.sidearms > 0 && fistPlayers.length > 0) {
                const idx = randInt(0, fistPlayers.length - 1);
                fistPlayers[idx].setWeapon(WEAPON_TYPE.SIDEARM);
                fistPlayers.splice(idx, 1);
            }

            // Extra rifle
            if (slots.rifles > 1 && fistPlayers.length > 0) {
                const idx = randInt(0, fistPlayers.length - 1);
                fistPlayers[idx].setWeapon(WEAPON_TYPE.RIFLE);
            }
        }
    }

    resetPositions() {
        this.allPlayers().forEach(p => p.resetPosition(this.pitch));
        this.ball.reset(this.pitch.cx, this.pitch.cy);
    }

    allPlayers() {
        return [...this.homePlayers, ...this.awayPlayers];
    }

    allAlivePlayers() {
        return this.allPlayers().filter(p => p.alive);
    }

    // ── Player Selection ──

    cycleSelectedPlayer() {
        const alive = this.homePlayers.filter(p => p.alive);
        if (alive.length === 0) return;
        if (this.selectedPlayer) this.selectedPlayer.selected = false;
        this.selectedIndex = (this.selectedIndex + 1) % alive.length;
        this.selectedPlayer = alive[this.selectedIndex];
        this.selectedPlayer.selected = true;
    }

    selectPlayerByNumber(num) {
        if (num < 0 || num >= this.homePlayers.length) return;
        const p = this.homePlayers[num];
        if (!p.alive) return;
        if (this.selectedPlayer) this.selectedPlayer.selected = false;
        this.selectedPlayer = p;
        this.selectedPlayer.selected = true;
        this.selectedIndex = this.homePlayers.filter(pl => pl.alive).indexOf(p);
    }

    selectPlayerByClick(mx, my) {
        let closest = null;
        let closestDist = 50; // max click distance
        this.homePlayers.forEach(p => {
            if (!p.alive) return;
            const d = dist(p, { x: mx, y: my });
            if (d < closestDist) {
                closestDist = d;
                closest = p;
            }
        });
        if (closest) {
            if (this.selectedPlayer) this.selectedPlayer.selected = false;
            this.selectedPlayer = closest;
            this.selectedPlayer.selected = true;
        }
    }

    // ── Football Actions ──

    tackle() {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) return;
        // Only tackle when opponent has the ball
        if (!this.ball.carrier || this.ball.carrier.team === TEAM.HOME) return;

        const tackleRange = PLAYER_RADIUS * 3;
        const d = dist(this.selectedPlayer, this.ball.carrier);
        if (d > tackleRange) return;

        // 60% success rate for human tackles (better than AI's 50%)
        if (chance(0.6)) {
            this.ball.carrier = null;
            this.ball.vx = (Math.random() - 0.5) * 4;
            this.ball.vy = (Math.random() - 0.5) * 4;
            playSound('punch');
        } else {
            // Failed tackle — small knockback on your player
            const angle = angleBetween(this.ball.carrier, this.selectedPlayer);
            this.selectedPlayer.vx = Math.cos(angle) * 3;
            this.selectedPlayer.vy = Math.sin(angle) * 3;
        }
    }

    checkAutoTackle() {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) return;
        if (!this.ball.carrier || this.ball.carrier.team === TEAM.HOME) return;
        // If controlled player is running into the carrier, auto-tackle
        const d = dist(this.selectedPlayer, this.ball.carrier);
        if (d < PLAYER_RADIUS * 2 + 5) {
            if (chance(0.5)) {
                this.ball.carrier = null;
                this.ball.vx = (Math.random() - 0.5) * 3;
                this.ball.vy = (Math.random() - 0.5) * 3;
            }
        }
    }

    passOrShoot() {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) return;
        if (this.ball.carrier !== this.selectedPlayer) return;

        // If near goal, shoot
        const isHome = this.selectedPlayer.team === TEAM.HOME;
        const goalX = isHome ? this.pitch.x + this.pitch.w : this.pitch.x;
        const distToGoal = Math.abs(this.selectedPlayer.x - goalX);

        if (distToGoal < this.pitch.w * 0.35) {
            // Shoot toward goal
            const angle = angleBetween(this.selectedPlayer, { x: goalX, y: this.pitch.cy });
            const inaccuracy = (Math.random() - 0.5) * 0.2;
            this.ball.kick(angle + inaccuracy, PLAYER_STATS.SHOOT_POWER);
            this.ball.lastKicker = this.selectedPlayer;
        } else {
            // Pass to nearest teammate ahead
            const teammates = this.homePlayers.filter(p =>
                p.alive && p !== this.selectedPlayer
            );
            if (teammates.length === 0) return;

            // Find best pass target (closest to mouse or nearest forward)
            let target = teammates.reduce((best, t) => {
                const d = dist(t, { x: this.mouse.x, y: this.mouse.y });
                return d < dist(best, { x: this.mouse.x, y: this.mouse.y }) ? t : best;
            });

            this.ball.passTo(target, PLAYER_STATS.PASS_POWER);
            this.ball.lastKicker = this.selectedPlayer;
        }
    }

    throughBall() {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) return;
        if (this.ball.carrier !== this.selectedPlayer) return;

        // Pass to space ahead of a forward teammate
        const isHome = this.selectedPlayer.team === TEAM.HOME;
        const teammates = this.homePlayers.filter(p =>
            p.alive && p !== this.selectedPlayer
        );
        if (teammates.length === 0) return;

        // Find most forward teammate
        const target = teammates.reduce((best, t) => {
            const tFwd = isHome ? t.x : -t.x;
            const bFwd = isHome ? best.x : -best.x;
            return tFwd > bFwd ? t : best;
        });

        // Pass ahead of them
        const dir = isHome ? 1 : -1;
        const targetPos = { x: target.x + dir * 60, y: target.y };
        const angle = angleBetween(this.ball, targetPos);
        this.ball.kick(angle, PLAYER_STATS.THROUGH_BALL_POWER);
        this.ball.lastKicker = this.selectedPlayer;
    }

    // ── Combat Mode ──

    enterCombatMode() {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) return;
        this.combatMode.enter(this.selectedPlayer);
        this.state = GAME_STATE.COMBAT;
    }

    exitCombatMode() {
        this.combatMode.exit();
        this.state = GAME_STATE.PLAYING;
    }

    combatAttack() {
        if (!this.combatMode.active || !this.combatMode.player) return;
        const player = this.combatMode.player;
        if (!player.canAttack()) return;

        // Face toward mouse
        player.facing = angleBetween(player, { x: this.mouse.x, y: this.mouse.y });

        const attack = player.attack();
        if (!attack) return;

        const hits = this.weaponSystem.processAttack(attack, this.allPlayers());
        if (player.weapon === WEAPON_TYPE.RIFLE) {
            this.combatMode.addShake(15);
        }

        // Check for kills
        hits.forEach(victim => {
            if (!victim.alive) {
                this.ui.addKill(player, victim, player.weapon);
                this.kills++;
            }
        });
    }

    // ── Game Loop ──

    loop(timestamp) {
        if (!this.running) return;

        const dt = this.lastTime ? Math.min(timestamp - this.lastTime, 50) : 16;
        this.lastTime = timestamp;

        this.update(dt);
        this.draw();

        requestAnimationFrame(t => this.loop(t));
    }

    update(dt) {
        if (this.state === GAME_STATE.TITLE) return;

        // Pause timer (goal celebration, kickoff)
        if (this.pauseTimer > 0) {
            this.pauseTimer -= dt;
            this.ui.updateGoalTimer(dt);
            return;
        }

        if (this.state === GAME_STATE.KICKOFF) {
            this.state = GAME_STATE.PLAYING;
        }

        if (this.state !== GAME_STATE.PLAYING && this.state !== GAME_STATE.COMBAT) return;

        // Match clock
        this.matchTime += (dt / 1000) * MATCH.TIME_SCALE;
        this.ui.updateTimer(
            MATCH.HALF_DURATION - this.matchTime,
            this.half
        );

        // Half time / full time
        if (this.matchTime >= MATCH.HALF_DURATION) {
            if (this.half === 1) {
                this.half = 2;
                this.matchTime = 0;
                this.state = GAME_STATE.HALFTIME;
                this.ui.showHalftime(this.homeScore, this.awayScore, this.homePlayers, this.economy);
                playSound('whistle');
                return;
            } else {
                this.endMatch();
                return;
            }
        }

        // Player input (move selected player)
        this.handlePlayerMovement(dt);

        // Update all players
        this.allPlayers().forEach(p => p.update(dt));

        // Ball physics
        this.ball.update(this.pitch);

        // Ball pickup + auto-tackle for controlled player
        this.checkBallPickup();
        this.checkAutoTackle();

        // Goal check
        const scorer = this.ball.isInGoal(this.pitch);
        if (scorer !== null) {
            this.scoreGoal(scorer);
        }

        // Weapon projectiles
        const projHits = this.weaponSystem.updateProjectiles(dt, this.allAlivePlayers(), this.pitch);
        projHits.forEach(({ victim }) => {
            if (!victim.alive) {
                this.ui.addKill(null, victim, WEAPON_TYPE.RIFLE);
                this.kills++;
                // If ball carrier died, drop ball
                if (this.ball.carrier === victim) {
                    this.ball.carrier = null;
                }
            }
        });

        // AI for away team
        this.ai.update(dt, TEAM.AWAY, this.awayPlayers, this.homePlayers, this.ball, this.pitch, this.weaponSystem);

        // Combat mode aiming
        if (this.state === GAME_STATE.COMBAT) {
            this.combatMode.updateAim(this.mouse.x, this.mouse.y);
            this.combatMode.update(dt);
        }

        // Threat detection for HUD
        this.checkThreats();

        // UI updates
        this.ui.updateCash(this.economy.cash);
        this.ui.updateSelectedPlayer(this.selectedPlayer);
        this.ui.updateGoalTimer(dt);

        // Check if all home players dead
        if (this.homePlayers.filter(p => p.alive).length === 0) {
            this.endMatch();
        }
    }

    handlePlayerMovement(dt) {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) {
            this.cycleSelectedPlayer();
            return;
        }

        const p = this.selectedPlayer;
        let mx = 0, my = 0;

        if (this.keys['w']) my = -1;
        if (this.keys['s']) my = 1;
        if (this.keys['a']) mx = -1;
        if (this.keys['d']) mx = 1;

        if (mx !== 0 || my !== 0) {
            const n = normalize(mx, my);
            p.sprinting = this.keys['shift'];
            const spd = p.speed * (p.sprinting ? PLAYER_STATS.SPRINT_MULT : 1);
            p.vx = n.x * spd;
            p.vy = n.y * spd;
            p.facing = Math.atan2(n.y, n.x);

            // Clamp to pitch
            p.x = clamp(p.x, this.pitch.x + PLAYER_RADIUS, this.pitch.x + this.pitch.w - PLAYER_RADIUS);
            p.y = clamp(p.y, this.pitch.y + PLAYER_RADIUS, this.pitch.y + this.pitch.h - PLAYER_RADIUS);
        }
    }

    checkBallPickup() {
        if (this.ball.carrier) return;

        // Find closest player to ball
        let closest = null;
        let closestDist = BALL_PHYSICS.CONTROL_DIST;

        this.allAlivePlayers().forEach(p => {
            const d = dist(p, this.ball);
            if (d < closestDist) {
                closestDist = d;
                closest = p;
            }
        });

        if (closest) {
            this.ball.carrier = closest;
        }
    }

    scoreGoal(scoringTeam) {
        if (scoringTeam === TEAM.HOME) {
            this.homeScore++;
        } else {
            this.awayScore++;
        }

        this.ui.updateScore(this.homeScore, this.awayScore);
        this.ui.showGoal(scoringTeam);
        playSound('goal');

        // Reset positions
        this.resetPositions();

        this.state = GAME_STATE.GOAL_SCORED;
        this.pauseTimer = MATCH.GOAL_PAUSE;

        // After pause, go to kickoff
        setTimeout(() => {
            if (this.state === GAME_STATE.GOAL_SCORED) {
                this.state = GAME_STATE.KICKOFF;
                this.pauseTimer = MATCH.KICKOFF_PAUSE;
            }
        }, MATCH.GOAL_PAUSE);
    }

    startSecondHalf() {
        // Apply weapon reassignments
        const assignments = this.ui.getHalftimeWeapons();
        Object.entries(assignments).forEach(([idx, weapon]) => {
            const p = this.homePlayers[parseInt(idx)];
            if (p && p.alive) {
                p.setWeapon(weapon);
            }
        });

        this.ui.hideHalftime();
        this.resetPositions();
        this.matchTime = 0;
        this.state = GAME_STATE.KICKOFF;
        this.pauseTimer = MATCH.KICKOFF_PAUSE;

        // Reassign away team weapons randomly
        this.assignStartingWeapons(this.awayPlayers);

        playSound('whistle');
    }

    endMatch() {
        this.state = GAME_STATE.MATCH_END;
        playSound('whistle');

        const cashEarned = this.economy.getMatchReward(this.homeScore, this.awayScore, this.kills);
        this.economy.addCash(cashEarned);

        const deadPlayers = this.homePlayers.filter(p => !p.alive);
        this.ui.showMatchEnd(this.homeScore, this.awayScore, this.kills, cashEarned, deadPlayers);

        // Exit combat if active
        if (this.combatMode.active) this.exitCombatMode();
    }

    checkThreats() {
        if (!this.selectedPlayer || !this.selectedPlayer.alive) {
            this.ui.showThreat(false);
            return;
        }

        // Check if any armed opponent is nearby
        const threatRange = 120;
        const hasThreat = this.awayPlayers.some(p =>
            p.alive &&
            p.weapon !== WEAPON_TYPE.FIST &&
            dist(this.selectedPlayer, p) < threatRange
        );
        this.ui.showThreat(hasThreat);
    }

    // ── Drawing ──

    draw() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, w, h);

        if (this.state === GAME_STATE.TITLE) return;

        // Pitch
        this.pitch.draw(ctx);

        // Players (away first so home draws on top)
        this.awayPlayers.forEach(p => p.draw(ctx, false)); // don't show away weapons
        this.homePlayers.forEach(p => p.draw(ctx, true));   // show home weapons

        // Player names
        this.allPlayers().forEach(p => p.drawName(ctx));

        // Ball
        this.ball.draw(ctx);

        // Projectiles
        this.weaponSystem.drawProjectiles(ctx);

        // Goal message
        this.ui.drawGoalMessage(ctx, this.canvas);

        // Combat overlay
        if (this.state === GAME_STATE.COMBAT) {
            this.combatMode.drawOverlay(ctx, this.canvas, this.allPlayers(), this.pitch);
        }

        // Draw ball possession indicator
        if (this.ball.carrier) {
            ctx.beginPath();
            ctx.arc(this.ball.carrier.x, this.ball.carrier.y, PLAYER_RADIUS + 8, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Minimap threat indicators (small dots at edge of screen for distant armed opponents)
        if (this.selectedPlayer && this.selectedPlayer.alive) {
            this.drawThreatRadar(ctx, w, h);
        }
    }

    drawThreatRadar(ctx, w, h) {
        const sp = this.selectedPlayer;
        this.awayPlayers.forEach(p => {
            if (!p.alive || p.weapon === WEAPON_TYPE.FIST) return;
            const d = dist(sp, p);
            if (d < 200) {
                // Direction indicator
                const angle = angleBetween(sp, p);
                const indicatorDist = 30;
                const ix = sp.x + Math.cos(angle) * indicatorDist;
                const iy = sp.y + Math.sin(angle) * indicatorDist;

                ctx.beginPath();
                ctx.arc(ix, iy, 4, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,23,68,${1 - d / 200})`;
                ctx.fill();
            }
        });
    }
}

// ── Boot ──
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.init();
});
