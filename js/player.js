// ── Player ──

class Player {
    constructor(team, index, posData) {
        this.team = team;
        this.index = index;
        this.role = posData.role;
        this.name = posData.name;
        this.basePos = { x: posData.x, y: posData.y }; // normalized

        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.facing = team === TEAM.HOME ? 0 : Math.PI;

        this.hp = PLAYER_STATS.HP;
        this.alive = true;
        this.speed = PLAYER_STATS.SPEED;
        this.sprinting = false;

        // Weapons
        this.weapon = WEAPON_TYPE.FIST;
        this.weaponCooldown = 0;
        this.isAttacking = false;
        this.attackTimer = 0;

        // Rendering
        this.selected = false;
        this.flashTimer = 0;
        this.deathTimer = 0;

        // AI state
        this.aiTarget = null;
        this.aiState = 'idle'; // idle, chase_ball, return_pos, attack, guard
        this.aiTimer = 0;
        this.aiCombatTarget = null;
    }

    resetPosition(pitch) {
        this.x = pitch.x + this.basePos.x * pitch.w;
        this.y = pitch.y + this.basePos.y * pitch.h;
        this.vx = 0;
        this.vy = 0;
    }

    setWeapon(type) {
        this.weapon = type;
    }

    takeDamage(amount, attacker) {
        if (!this.alive) return;
        this.hp -= amount;
        this.flashTimer = 150;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die(attacker);
        }
    }

    die(killer) {
        this.alive = false;
        this.deathTimer = 1000;
        playSound('death');
        return { victim: this, killer: killer };
    }

    canAttack() {
        return this.alive && this.weaponCooldown <= 0;
    }

    attack() {
        if (!this.canAttack()) return null;
        const stats = WEAPON_STATS[this.weapon];
        this.weaponCooldown = stats.cooldown;
        this.isAttacking = true;
        this.attackTimer = 200;

        if (this.weapon === WEAPON_TYPE.RIFLE) playSound('gunshot');
        else if (this.weapon === WEAPON_TYPE.SHANK) playSound('shank');
        else if (this.weapon === WEAPON_TYPE.SIDEARM) playSound('gunshot');
        else playSound('punch');

        return {
            attacker: this,
            weapon: this.weapon,
            damage: stats.damage,
            range: stats.range,
            angle: this.facing,
        };
    }

    update(dt) {
        if (!this.alive) {
            this.deathTimer -= dt;
            return;
        }

        // Movement
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= 0.85;
        this.vy *= 0.85;

        // Timers
        if (this.weaponCooldown > 0) this.weaponCooldown -= dt;
        if (this.flashTimer > 0) this.flashTimer -= dt;
        if (this.attackTimer > 0) this.attackTimer -= dt;
        else this.isAttacking = false;
    }

    moveToward(tx, ty, speedMult = 1) {
        const dx = tx - this.x;
        const dy = ty - this.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 2) return;
        const spd = this.speed * speedMult * (this.sprinting ? PLAYER_STATS.SPRINT_MULT : 1);
        this.vx = (dx / d) * spd;
        this.vy = (dy / d) * spd;
        this.facing = Math.atan2(dy, dx);
    }

    draw(ctx, showWeaponHint = false) {
        if (!this.alive) {
            if (this.deathTimer > 0) {
                // Death animation — X mark
                ctx.save();
                ctx.globalAlpha = this.deathTimer / 1000;
                ctx.strokeStyle = '#ff1744';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.moveTo(this.x - 8, this.y - 8);
                ctx.lineTo(this.x + 8, this.y + 8);
                ctx.moveTo(this.x + 8, this.y - 8);
                ctx.lineTo(this.x - 8, this.y + 8);
                ctx.stroke();
                ctx.restore();
            }
            return;
        }

        const isHome = this.team === TEAM.HOME;

        // Shadow
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + 3, PLAYER_RADIUS, PLAYER_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.fill();

        // Selection ring
        if (this.selected) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, PLAYER_RADIUS + 5, 0, Math.PI * 2);
            ctx.strokeStyle = COLORS.SELECTED;
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Damage flash
        if (this.flashTimer > 0) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, PLAYER_RADIUS + 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,23,68,${this.flashTimer / 150 * 0.4})`;
            ctx.fill();
        }

        // Body
        ctx.beginPath();
        ctx.arc(this.x, this.y, PLAYER_RADIUS, 0, Math.PI * 2);
        const mainColor = isHome ? COLORS.HOME : COLORS.AWAY;
        ctx.fillStyle = mainColor;
        ctx.fill();
        ctx.strokeStyle = isHome ? COLORS.HOME_DARK : COLORS.AWAY_DARK;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Facing indicator (small line showing direction)
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(
            this.x + Math.cos(this.facing) * (PLAYER_RADIUS + 4),
            this.y + Math.sin(this.facing) * (PLAYER_RADIUS + 4)
        );
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Weapon indicator (only for player's own team or if showWeaponHint)
        if (showWeaponHint && this.weapon !== WEAPON_TYPE.FIST) {
            let glow;
            if (this.weapon === WEAPON_TYPE.RIFLE || this.weapon === WEAPON_TYPE.SIDEARM) {
                glow = COLORS.RIFLE_GLOW;
            } else {
                glow = COLORS.SHANK_GLOW;
            }
            ctx.beginPath();
            ctx.arc(this.x, this.y - PLAYER_RADIUS - 6, 3, 0, Math.PI * 2);
            ctx.fillStyle = glow;
            ctx.fill();
        }

        // HP bar (only when damaged)
        if (this.hp < PLAYER_STATS.HP) {
            const barW = PLAYER_RADIUS * 2;
            const barH = 3;
            const barX = this.x - barW / 2;
            const barY = this.y + PLAYER_RADIUS + 4;
            ctx.fillStyle = '#333';
            ctx.fillRect(barX, barY, barW, barH);
            const pct = this.hp / PLAYER_STATS.HP;
            ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ff9800' : '#f44336';
            ctx.fillRect(barX, barY, barW * pct, barH);
        }

        // Number
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.index + 1, this.x, this.y);

        // Attack animation
        if (this.isAttacking) {
            if (this.weapon === WEAPON_TYPE.RIFLE || this.weapon === WEAPON_TYPE.SIDEARM) {
                // Muzzle flash
                ctx.beginPath();
                const fx = this.x + Math.cos(this.facing) * (PLAYER_RADIUS + 6);
                const fy = this.y + Math.sin(this.facing) * (PLAYER_RADIUS + 6);
                ctx.arc(fx, fy, 6, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,200,50,0.8)';
                ctx.fill();
            } else if (this.weapon === WEAPON_TYPE.SHANK) {
                // Slash arc
                ctx.beginPath();
                ctx.arc(this.x, this.y, PLAYER_RADIUS + 12, this.facing - 0.5, this.facing + 0.5);
                ctx.strokeStyle = 'rgba(171,71,188,0.8)';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                // Punch
                ctx.beginPath();
                const px = this.x + Math.cos(this.facing) * (PLAYER_RADIUS + 8);
                const py = this.y + Math.sin(this.facing) * (PLAYER_RADIUS + 8);
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,255,0.6)';
                ctx.fill();
            }
        }
    }

    drawName(ctx) {
        if (!this.alive) return;
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '9px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, this.x, this.y - PLAYER_RADIUS - 8);
    }
}
