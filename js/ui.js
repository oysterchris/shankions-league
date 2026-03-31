// ── UI Manager ──

class UI {
    constructor() {
        this.killFeed = [];
        this.killFeedEl = null;
        this.goalMessage = null;
        this.goalTimer = 0;
        this.messageQueue = [];
    }

    init() {
        // Create kill feed container
        this.killFeedEl = document.createElement('div');
        this.killFeedEl.id = 'kill-feed';
        document.getElementById('game-container').appendChild(this.killFeedEl);
    }

    updateScore(homeScore, awayScore) {
        document.getElementById('home-score').textContent = homeScore;
        document.getElementById('away-score').textContent = awayScore;
    }

    updateTimer(seconds, half) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        document.getElementById('timer-display').textContent =
            `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        document.getElementById('half-display').textContent =
            half === 1 ? '1ST HALF' : '2ND HALF';
    }

    updateCash(amount) {
        document.getElementById('cash-display').textContent = `$${amount}`;
    }

    updateSelectedPlayer(player) {
        const info = document.getElementById('selected-player-info');
        if (!player || !player.alive) {
            info.textContent = '';
            return;
        }
        const wpn = player.weapon === WEAPON_TYPE.FIST ? 'FISTS' : WEAPON_STATS[player.weapon].name.toUpperCase();
        info.textContent = `${player.name} [${player.role}] — ${wpn} — HP:${player.hp}`;
    }

    showThreat(show) {
        const el = document.getElementById('threat-indicator');
        if (show) el.classList.remove('hidden');
        else el.classList.add('hidden');
    }

    addKill(killer, victim, weapon) {
        const weaponIcons = {
            [WEAPON_TYPE.RIFLE]: '🔫',
            [WEAPON_TYPE.SHANK]: '🔪',
            [WEAPON_TYPE.SIDEARM]: '🔫',
            [WEAPON_TYPE.FIST]: '👊',
        };

        const entry = document.createElement('div');
        entry.className = 'kill-entry';
        entry.innerHTML = `<span class="killer">${killer ? killer.name : '???'}</span>` +
            `<span class="weapon-icon">${weaponIcons[weapon] || '💀'}</span>` +
            `<span class="victim">${victim.name}</span>`;
        this.killFeedEl.appendChild(entry);

        // Remove after 4 seconds
        setTimeout(() => {
            if (entry.parentNode) entry.parentNode.removeChild(entry);
        }, 4000);

        // Max 5 visible
        while (this.killFeedEl.children.length > 5) {
            this.killFeedEl.removeChild(this.killFeedEl.firstChild);
        }
    }

    showGoal(scoringTeam) {
        this.goalMessage = scoringTeam === TEAM.HOME ? 'GOAL!' : 'GOAL!';
        this.goalTimer = MATCH.GOAL_PAUSE;
    }

    drawGoalMessage(ctx, canvas) {
        if (this.goalTimer <= 0) return;

        const alpha = Math.min(1, this.goalTimer / 500);
        const scale = 1 + (1 - this.goalTimer / MATCH.GOAL_PAUSE) * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = `bold ${72 * scale}px Courier New`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillText(this.goalMessage, canvas.width / 2 + 3, canvas.height / 2 + 3);

        // Text
        ctx.fillStyle = '#fff';
        ctx.fillText(this.goalMessage, canvas.width / 2, canvas.height / 2);
        ctx.restore();
    }

    updateGoalTimer(dt) {
        if (this.goalTimer > 0) this.goalTimer -= dt;
    }

    // Halftime screen
    showHalftime(homeScore, awayScore, homePlayers, economy) {
        const screen = document.getElementById('halftime-screen');
        screen.classList.remove('hidden');

        document.getElementById('halftime-score').innerHTML =
            `<span style="color:${COLORS.HOME}">${homeScore}</span> — <span style="color:${COLORS.AWAY}">${awayScore}</span>`;

        // Build weapon assignment UI
        const slots = document.getElementById('weapon-slots');
        slots.innerHTML = '';
        const weaponSlots = economy.getAvailableWeaponSlots();

        const alivePlayers = homePlayers.filter(p => p.alive);
        alivePlayers.forEach(p => {
            const div = document.createElement('div');
            div.className = 'weapon-slot';

            const options = [`<option value="fist" ${p.weapon === WEAPON_TYPE.FIST ? 'selected' : ''}>Fists</option>`];
            options.push(`<option value="shank" ${p.weapon === WEAPON_TYPE.SHANK ? 'selected' : ''}>Shank</option>`);
            if (weaponSlots.sidearms > 0)
                options.push(`<option value="sidearm" ${p.weapon === WEAPON_TYPE.SIDEARM ? 'selected' : ''}>Sidearm</option>`);
            options.push(`<option value="rifle" ${p.weapon === WEAPON_TYPE.RIFLE ? 'selected' : ''}>Rifle</option>`);

            div.innerHTML = `<span class="player-name">${p.name} [${p.role}]</span>` +
                `<select data-player="${p.index}">${options.join('')}</select>`;
            slots.appendChild(div);
        });
    }

    getHalftimeWeapons() {
        const assignments = {};
        document.querySelectorAll('#weapon-slots select').forEach(sel => {
            assignments[sel.dataset.player] = sel.value;
        });
        return assignments;
    }

    hideHalftime() {
        document.getElementById('halftime-screen').classList.add('hidden');
    }

    // Match end screen
    showMatchEnd(homeScore, awayScore, kills, cashEarned, deadPlayers) {
        const screen = document.getElementById('match-end-screen');
        screen.classList.remove('hidden');

        let result;
        if (homeScore > awayScore) result = 'VICTORY';
        else if (homeScore < awayScore) result = 'DEFEAT';
        else result = 'DRAW';

        document.getElementById('match-result').textContent = result;
        document.getElementById('match-result').style.color =
            result === 'VICTORY' ? '#4caf50' : result === 'DEFEAT' ? '#ef5350' : '#ff9800';

        document.getElementById('match-stats').innerHTML =
            `Final Score: <span style="color:${COLORS.HOME}">${homeScore}</span> — <span style="color:${COLORS.AWAY}">${awayScore}</span><br>` +
            `Kills: ${kills}`;

        document.getElementById('cash-earned').textContent = `+$${cashEarned}`;

        const deadNames = deadPlayers.map(p => p.name).join(', ');
        document.getElementById('dead-players').textContent =
            deadPlayers.length > 0 ? `LOST: ${deadNames}` : 'No casualties';
    }

    hideMatchEnd() {
        document.getElementById('match-end-screen').classList.add('hidden');
    }

    // Shop screen
    showShop(economy) {
        const screen = document.getElementById('shop-screen');
        screen.classList.remove('hidden');
        this.updateShop(economy);
    }

    updateShop(economy) {
        document.getElementById('shop-cash').textContent = `Cash: $${economy.cash}`;
        const container = document.getElementById('shop-items');
        container.innerHTML = '';

        economy.shopItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shop-item' + (item.bought ? ' owned' : '');
            div.innerHTML = `<div class="item-name">${item.name}</div>` +
                `<div class="item-desc">${item.desc}</div>` +
                `<div class="item-price">${item.bought ? 'OWNED' : '$' + item.price}</div>`;

            if (!item.bought) {
                div.addEventListener('click', () => {
                    if (economy.buy(item)) {
                        this.updateShop(economy);
                    }
                });
            }

            container.appendChild(div);
        });
    }

    hideShop() {
        document.getElementById('shop-screen').classList.add('hidden');
    }
}
