// ── Ball ──

class Ball {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.vx = 0;
        this.vy = 0;
        this.carrier = null; // player carrying the ball
        this.lastKicker = null;
        this.trail = [];
    }

    reset(pitchCx, pitchCy) {
        this.x = pitchCx;
        this.y = pitchCy;
        this.vx = 0;
        this.vy = 0;
        this.carrier = null;
        this.lastKicker = null;
        this.trail = [];
    }

    kick(angle, power) {
        this.vx = Math.cos(angle) * power;
        this.vy = Math.sin(angle) * power;
        this.carrier = null;
        playSound('kick');
    }

    passTo(target, power) {
        const angle = angleBetween(this, target);
        this.vx = Math.cos(angle) * power;
        this.vy = Math.sin(angle) * power;
        this.carrier = null;
        playSound('pass');
    }

    update(pitch) {
        if (this.carrier && this.carrier.alive) {
            // Ball follows carrier
            const angle = this.carrier.facing;
            this.x = this.carrier.x + Math.cos(angle) * (PLAYER_RADIUS + BALL_RADIUS + 2);
            this.y = this.carrier.y + Math.sin(angle) * (PLAYER_RADIUS + BALL_RADIUS + 2);
            this.vx = 0;
            this.vy = 0;
            return;
        }

        this.carrier = null;

        // Physics
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= BALL_PHYSICS.FRICTION;
        this.vy *= BALL_PHYSICS.FRICTION;

        // Trail
        if (Math.abs(this.vx) > 0.5 || Math.abs(this.vy) > 0.5) {
            this.trail.push({ x: this.x, y: this.y, alpha: 1 });
            if (this.trail.length > 12) this.trail.shift();
        }
        this.trail.forEach(t => t.alpha *= 0.85);
        this.trail = this.trail.filter(t => t.alpha > 0.05);

        // Boundary bounce
        if (this.x - BALL_RADIUS < pitch.x) {
            this.x = pitch.x + BALL_RADIUS;
            this.vx *= -BALL_PHYSICS.BOUNCE;
        }
        if (this.x + BALL_RADIUS > pitch.x + pitch.w) {
            this.x = pitch.x + pitch.w - BALL_RADIUS;
            this.vx *= -BALL_PHYSICS.BOUNCE;
        }
        if (this.y - BALL_RADIUS < pitch.y) {
            this.y = pitch.y + BALL_RADIUS;
            this.vy *= -BALL_PHYSICS.BOUNCE;
        }
        if (this.y + BALL_RADIUS > pitch.y + pitch.h) {
            this.y = pitch.y + pitch.h - BALL_RADIUS;
            this.vy *= -BALL_PHYSICS.BOUNCE;
        }

        // Slow stop
        if (Math.abs(this.vx) < 0.1) this.vx = 0;
        if (Math.abs(this.vy) < 0.1) this.vy = 0;
    }

    isInGoal(pitch) {
        const goalTop = pitch.y + pitch.h * 0.35;
        const goalBot = pitch.y + pitch.h * 0.65;
        const goalDepth = 20;

        if (this.y > goalTop && this.y < goalBot) {
            // Left goal (away scores)
            if (this.x < pitch.x + goalDepth) return TEAM.AWAY;
            // Right goal (home scores)
            if (this.x > pitch.x + pitch.w - goalDepth) return TEAM.HOME;
        }
        return null;
    }

    draw(ctx) {
        // Trail
        this.trail.forEach(t => {
            ctx.beginPath();
            ctx.arc(t.x, t.y, BALL_RADIUS * 0.6, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,255,255,${t.alpha * 0.3})`;
            ctx.fill();
        });

        // Shadow
        ctx.beginPath();
        ctx.ellipse(this.x + 2, this.y + 3, BALL_RADIUS, BALL_RADIUS * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fill();

        // Ball
        ctx.beginPath();
        ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.BALL;
        ctx.fill();
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pentagon pattern
        ctx.beginPath();
        ctx.arc(this.x - 1, this.y - 1, BALL_RADIUS * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#333';
        ctx.fill();
    }
}
