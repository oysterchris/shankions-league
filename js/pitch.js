// ── Pitch Rendering ──

class Pitch {
    constructor() {
        this.x = 0;
        this.y = 0;
        this.w = 0;
        this.h = 0;
    }

    resize(canvasW, canvasH) {
        this.x = canvasW * PITCH.PAD_X;
        this.y = canvasH * PITCH.PAD_Y;
        this.w = canvasW * (1 - PITCH.PAD_X * 2);
        this.h = canvasH * (1 - PITCH.PAD_Y * 2);
    }

    get cx() { return this.x + this.w / 2; }
    get cy() { return this.y + this.h / 2; }

    // Goal dimensions
    get goalTop() { return this.y + this.h * 0.35; }
    get goalBot() { return this.y + this.h * 0.65; }
    get goalDepth() { return 20; }

    draw(ctx) {
        // Grass
        drawGrassPattern(ctx, this.x, this.y, this.w, this.h);

        ctx.strokeStyle = PITCH.LINE_COLOR;
        ctx.lineWidth = 2;

        // Outline
        ctx.strokeRect(this.x, this.y, this.w, this.h);

        // Center line
        ctx.beginPath();
        ctx.moveTo(this.cx, this.y);
        ctx.lineTo(this.cx, this.y + this.h);
        ctx.stroke();

        // Center circle
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.h * 0.15, 0, Math.PI * 2);
        ctx.stroke();

        // Center spot
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = PITCH.LINE_COLOR;
        ctx.fill();

        // Penalty areas
        const penW = this.w * 0.14;
        const penH = this.h * 0.45;
        const penY = this.y + (this.h - penH) / 2;
        ctx.strokeRect(this.x, penY, penW, penH);
        ctx.strokeRect(this.x + this.w - penW, penY, penW, penH);

        // Goal areas (smaller boxes)
        const goalAreaW = this.w * 0.06;
        const goalAreaH = this.h * 0.25;
        const goalAreaY = this.y + (this.h - goalAreaH) / 2;
        ctx.strokeRect(this.x, goalAreaY, goalAreaW, goalAreaH);
        ctx.strokeRect(this.x + this.w - goalAreaW, goalAreaY, goalAreaW, goalAreaH);

        // Goals (nets)
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        // Left goal
        ctx.fillRect(this.x - this.goalDepth, this.goalTop, this.goalDepth, this.goalBot - this.goalTop);
        ctx.strokeRect(this.x - this.goalDepth, this.goalTop, this.goalDepth, this.goalBot - this.goalTop);
        // Right goal
        ctx.fillRect(this.x + this.w, this.goalTop, this.goalDepth, this.goalBot - this.goalTop);
        ctx.strokeRect(this.x + this.w, this.goalTop, this.goalDepth, this.goalBot - this.goalTop);

        // Net pattern
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        const netSpacing = 8;
        // Left net
        for (let nx = this.x - this.goalDepth; nx < this.x; nx += netSpacing) {
            ctx.beginPath();
            ctx.moveTo(nx, this.goalTop);
            ctx.lineTo(nx, this.goalBot);
            ctx.stroke();
        }
        for (let ny = this.goalTop; ny < this.goalBot; ny += netSpacing) {
            ctx.beginPath();
            ctx.moveTo(this.x - this.goalDepth, ny);
            ctx.lineTo(this.x, ny);
            ctx.stroke();
        }
        // Right net
        for (let nx = this.x + this.w; nx < this.x + this.w + this.goalDepth; nx += netSpacing) {
            ctx.beginPath();
            ctx.moveTo(nx, this.goalTop);
            ctx.lineTo(nx, this.goalBot);
            ctx.stroke();
        }
        for (let ny = this.goalTop; ny < this.goalBot; ny += netSpacing) {
            ctx.beginPath();
            ctx.moveTo(this.x + this.w, ny);
            ctx.lineTo(this.x + this.w + this.goalDepth, ny);
            ctx.stroke();
        }

        // Penalty spots
        ctx.fillStyle = PITCH.LINE_COLOR;
        ctx.beginPath();
        ctx.arc(this.x + this.w * 0.1, this.cy, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(this.x + this.w * 0.9, this.cy, 3, 0, Math.PI * 2);
        ctx.fill();

        // Corner arcs
        const cornerR = 12;
        ctx.strokeStyle = PITCH.LINE_COLOR;
        ctx.lineWidth = 2;
        [
            [this.x, this.y, 0, Math.PI / 2],
            [this.x + this.w, this.y, Math.PI / 2, Math.PI],
            [this.x + this.w, this.y + this.h, Math.PI, Math.PI * 1.5],
            [this.x, this.y + this.h, Math.PI * 1.5, Math.PI * 2],
        ].forEach(([cx, cy, sa, ea]) => {
            ctx.beginPath();
            ctx.arc(cx, cy, cornerR, sa, ea);
            ctx.stroke();
        });
    }
}
