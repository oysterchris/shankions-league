// ── Weapon System ──

class WeaponSystem {
    constructor() {
        this.projectiles = [];
    }

    processAttack(attack, allPlayers) {
        const { attacker, weapon, damage, range, angle } = attack;
        const hits = [];

        if (weapon === WEAPON_TYPE.RIFLE || weapon === WEAPON_TYPE.SIDEARM) {
            // Ranged: create projectile and check line hit
            this.projectiles.push({
                x: attacker.x + Math.cos(angle) * PLAYER_RADIUS,
                y: attacker.y + Math.sin(angle) * PLAYER_RADIUS,
                vx: Math.cos(angle) * WEAPON_STATS[weapon].speed,
                vy: Math.sin(angle) * WEAPON_STATS[weapon].speed,
                damage: damage,
                team: attacker.team,
                life: range / WEAPON_STATS[weapon].speed,
                weapon: weapon,
            });
        } else {
            // Melee: instant hit check in cone
            allPlayers.forEach(p => {
                if (p === attacker || !p.alive || p.team === attacker.team) return;
                const d = dist(attacker, p);
                if (d > range + PLAYER_RADIUS) return;
                // Check angle (60-degree cone for shank, 90-degree for fist)
                const aToP = angleBetween(attacker, p);
                let angleDiff = Math.abs(aToP - angle);
                if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff;
                const coneAngle = weapon === WEAPON_TYPE.SHANK ? Math.PI / 3 : Math.PI / 2;
                if (angleDiff < coneAngle) {
                    p.takeDamage(damage, attacker);
                    hits.push(p);
                }
            });
        }

        return hits;
    }

    updateProjectiles(dt, allPlayers, pitch) {
        const hits = [];

        this.projectiles = this.projectiles.filter(proj => {
            proj.x += proj.vx;
            proj.y += proj.vy;
            proj.life -= 1;

            // Check hit on players
            for (const p of allPlayers) {
                if (!p.alive || p.team === proj.team) continue;
                if (dist(proj, p) < PLAYER_RADIUS + 4) {
                    p.takeDamage(proj.damage, null);
                    hits.push({ projectile: proj, victim: p });
                    return false; // remove projectile
                }
            }

            // Out of bounds or life expired
            if (proj.life <= 0) return false;
            if (proj.x < pitch.x - 50 || proj.x > pitch.x + pitch.w + 50) return false;
            if (proj.y < pitch.y - 50 || proj.y > pitch.y + pitch.h + 50) return false;

            return true;
        });

        return hits;
    }

    drawProjectiles(ctx) {
        this.projectiles.forEach(proj => {
            // Bullet trail
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            ctx.lineTo(proj.x - proj.vx * 3, proj.y - proj.vy * 3);
            ctx.strokeStyle = proj.weapon === WEAPON_TYPE.RIFLE
                ? 'rgba(255,200,50,0.8)'
                : 'rgba(255,150,50,0.6)';
            ctx.lineWidth = proj.weapon === WEAPON_TYPE.RIFLE ? 2 : 1.5;
            ctx.stroke();

            // Bullet head
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });
    }

    clear() {
        this.projectiles = [];
    }
}
