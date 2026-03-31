// ── Combat Mode (First-Person View) ──

class CombatMode {
    constructor() {
        this.active = false;
        this.player = null;       // the player in combat mode
        this.aimAngle = 0;
        this.aimX = 0;            // mouse position on canvas
        this.aimY = 0;
        this.shakeTimer = 0;
        this.shakeIntensity = 0;
        this.fovWidth = Math.PI * 0.4; // Field of view for rifle scope
    }

    enter(player) {
        this.active = true;
        this.player = player;
        this.shakeTimer = 0;
    }

    exit() {
        this.active = false;
        this.player = null;
    }

    updateAim(mouseX, mouseY) {
        if (!this.active || !this.player) return;
        this.aimX = mouseX;
        this.aimY = mouseY;
        this.aimAngle = angleBetween(this.player, { x: mouseX, y: mouseY });
        this.player.facing = this.aimAngle;
    }

    addShake(intensity) {
        this.shakeTimer = 200;
        this.shakeIntensity = intensity;
    }

    update(dt) {
        if (this.shakeTimer > 0) {
            this.shakeTimer -= dt;
        }
    }

    // Draw combat mode overlay on top of the normal view
    drawOverlay(ctx, canvas, allPlayers, pitch) {
        if (!this.active || !this.player) return;

        const p = this.player;
        const weapon = p.weapon;

        if (weapon === WEAPON_TYPE.RIFLE) {
            this.drawRifleScope(ctx, canvas, allPlayers, pitch);
        } else if (weapon === WEAPON_TYPE.SIDEARM) {
            this.drawSidearmView(ctx, canvas);
        } else if (weapon === WEAPON_TYPE.SHANK) {
            this.drawShankView(ctx, canvas, allPlayers);
        } else {
            this.drawFistView(ctx, canvas, allPlayers);
        }

        // Weapon info
        const stats = WEAPON_STATS[weapon];
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(canvas.width - 160, canvas.height - 50, 150, 40);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px Courier New';
        ctx.textAlign = 'right';
        ctx.fillText(stats.name, canvas.width - 20, canvas.height - 28);
        // Cooldown bar
        if (p.weaponCooldown > 0) {
            const pct = p.weaponCooldown / stats.cooldown;
            ctx.fillStyle = '#ff1744';
            ctx.fillRect(canvas.width - 155, canvas.height - 18, 140 * pct, 4);
        } else {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(canvas.width - 155, canvas.height - 18, 140, 4);
        }

        // Combat mode label
        ctx.fillStyle = 'rgba(255,23,68,0.8)';
        ctx.font = 'bold 12px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('[ COMBAT MODE — ESC TO EXIT ]', canvas.width / 2, canvas.height - 12);
    }

    drawRifleScope(ctx, canvas, allPlayers, pitch) {
        // Darken edges (vignette)
        const gradient = ctx.createRadialGradient(
            canvas.width / 2, canvas.height / 2, canvas.height * 0.2,
            canvas.width / 2, canvas.height / 2, canvas.height * 0.6
        );
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scope circle
        const scopeR = Math.min(canvas.width, canvas.height) * 0.3;
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.aimX, this.aimY, scopeR, 0, Math.PI * 2);
        ctx.clip();

        // Zoomed view of aim area — tint it slightly
        ctx.fillStyle = 'rgba(0,50,0,0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Scope crosshair
        ctx.strokeStyle = 'rgba(255,0,0,0.6)';
        ctx.lineWidth = 1;
        // Horizontal
        ctx.beginPath();
        ctx.moveTo(this.aimX - scopeR, this.aimY);
        ctx.lineTo(this.aimX + scopeR, this.aimY);
        ctx.stroke();
        // Vertical
        ctx.beginPath();
        ctx.moveTo(this.aimX, this.aimY - scopeR);
        ctx.lineTo(this.aimX, this.aimY + scopeR);
        ctx.stroke();

        // Range rings
        ctx.strokeStyle = 'rgba(255,0,0,0.2)';
        [0.3, 0.6, 0.9].forEach(r => {
            ctx.beginPath();
            ctx.arc(this.aimX, this.aimY, scopeR * r, 0, Math.PI * 2);
            ctx.stroke();
        });

        // Highlight enemies in scope
        allPlayers.forEach(p => {
            if (!p.alive || p.team === this.player.team) return;
            const d = dist({ x: this.aimX, y: this.aimY }, p);
            if (d < scopeR) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,0,0,0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });

        ctx.restore();

        // Scope border
        ctx.beginPath();
        ctx.arc(this.aimX, this.aimY, scopeR, 0, Math.PI * 2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Shake effect
        if (this.shakeTimer > 0) {
            const intensity = this.shakeIntensity * (this.shakeTimer / 200);
            ctx.save();
            ctx.translate(
                (Math.random() - 0.5) * intensity,
                (Math.random() - 0.5) * intensity
            );
            ctx.restore();
        }
    }

    drawSidearmView(ctx, canvas) {
        // Simple crosshair
        const cx = this.aimX;
        const cy = this.aimY;
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1.5;
        const gap = 6;
        const len = 14;
        // Top
        ctx.beginPath(); ctx.moveTo(cx, cy - gap); ctx.lineTo(cx, cy - gap - len); ctx.stroke();
        // Bottom
        ctx.beginPath(); ctx.moveTo(cx, cy + gap); ctx.lineTo(cx, cy + gap + len); ctx.stroke();
        // Left
        ctx.beginPath(); ctx.moveTo(cx - gap, cy); ctx.lineTo(cx - gap - len, cy); ctx.stroke();
        // Right
        ctx.beginPath(); ctx.moveTo(cx + gap, cy); ctx.lineTo(cx + gap + len, cy); ctx.stroke();
        // Center dot
        ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fill();
    }

    drawShankView(ctx, canvas, allPlayers) {
        // Shank range indicator
        if (!this.player) return;
        const range = WEAPON_STATS[WEAPON_TYPE.SHANK].range + PLAYER_RADIUS;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, range, this.aimAngle - Math.PI / 3, this.aimAngle + Math.PI / 3);
        ctx.lineTo(this.player.x, this.player.y);
        ctx.closePath();
        ctx.fillStyle = 'rgba(171,71,188,0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(171,71,188,0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight targets in range
        allPlayers.forEach(p => {
            if (!p.alive || p.team === this.player.team) return;
            if (dist(this.player, p) < range) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, PLAYER_RADIUS + 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,23,68,0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }

    drawFistView(ctx, canvas, allPlayers) {
        // Fist range indicator
        if (!this.player) return;
        const range = WEAPON_STATS[WEAPON_TYPE.FIST].range + PLAYER_RADIUS;
        ctx.beginPath();
        ctx.arc(this.player.x, this.player.y, range, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Highlight targets in range
        allPlayers.forEach(p => {
            if (!p.alive || p.team === this.player.team) return;
            if (dist(this.player, p) < range) {
                ctx.beginPath();
                ctx.arc(p.x, p.y, PLAYER_RADIUS + 3, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255,23,68,0.5)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        });
    }
}
