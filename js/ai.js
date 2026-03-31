// ── AI System ──

class AI {
    constructor() {
        this.decisionTimer = 0;
        this.teamState = 'normal'; // normal, aggressive, defensive
    }

    update(dt, team, players, opponents, ball, pitch, weaponSystem) {
        this.decisionTimer -= dt;
        if (this.decisionTimer > 0) return;
        this.decisionTimer = AI_PARAMS.REACTION_TIME + Math.random() * 200;

        const alivePlayers = players.filter(p => p.alive);
        const aliveOpponents = opponents.filter(p => p.alive);
        if (alivePlayers.length === 0) return;

        // Determine team state based on score and player count
        const teamHasBall = ball.carrier && ball.carrier.team === team;

        alivePlayers.forEach(p => {
            this.decidePlayerAction(p, players, opponents, ball, pitch, teamHasBall, weaponSystem);
        });
    }

    decidePlayerAction(player, teammates, opponents, ball, pitch, teamHasBall, weaponSystem) {
        const aliveOpponents = opponents.filter(p => p.alive);

        // Check for nearby threats first
        const nearestThreat = this.findNearestThreat(player, aliveOpponents);
        if (nearestThreat && nearestThreat.dist < 60 && chance(AI_PARAMS.AGGRESSION)) {
            player.aiState = 'attack';
            player.aiCombatTarget = nearestThreat.player;
            this.executeCombat(player, nearestThreat.player, weaponSystem, opponents);
            return;
        }

        // Goalkeeper behavior
        if (player.role === 'GK') {
            this.goalkeeperBehavior(player, ball, pitch);
            return;
        }

        if (ball.carrier === player) {
            // Has ball — decide what to do
            this.ballCarrierBehavior(player, teammates, opponents, ball, pitch);
        } else if (teamHasBall) {
            // Teammate has ball — support
            this.supportBehavior(player, ball, pitch);
        } else if (!ball.carrier || ball.carrier.team !== player.team) {
            // Opponent has ball or ball is loose
            this.defensiveBehavior(player, ball, pitch, aliveOpponents);
        }
    }

    goalkeeperBehavior(player, ball, pitch) {
        const isHome = player.team === TEAM.HOME;
        const goalX = isHome ? pitch.x + 20 : pitch.x + pitch.w - 20;
        const goalCY = pitch.cy;

        // Track ball's Y position but stay near goal
        const targetY = clamp(ball.y, pitch.goalTop + 20, pitch.goalBot - 20);
        player.moveToward(goalX, targetY, 0.8);
        player.aiState = 'guard';

        // If ball is very close, rush it
        if (dist(player, ball) < 80 && !ball.carrier) {
            player.moveToward(ball.x, ball.y, 1.2);
            player.aiState = 'chase_ball';
        }
    }

    ballCarrierBehavior(player, teammates, opponents, ball, pitch) {
        const isHome = player.team === TEAM.HOME;
        const goalX = isHome ? pitch.x + pitch.w : pitch.x;
        const goalY = pitch.cy;

        // Check if we can shoot
        const distToGoal = Math.abs(player.x - goalX) / pitch.w;
        if (distToGoal < AI_PARAMS.SHOOT_RANGE) {
            // Shoot!
            const shootAngle = angleBetween(player, { x: goalX, y: goalY });
            // Add some inaccuracy
            const inaccuracy = (Math.random() - 0.5) * 0.3;
            ball.kick(shootAngle + inaccuracy, PLAYER_STATS.SHOOT_POWER);
            ball.lastKicker = player;
            player.aiState = 'idle';
            return;
        }

        // Check for pass opportunity
        const aliveTeammates = teammates.filter(t => t.alive && t !== player);
        if (aliveTeammates.length > 0 && chance(0.3)) {
            // Find teammate closest to goal
            const best = aliveTeammates.reduce((best, t) => {
                const tDistGoal = Math.abs(t.x - goalX);
                const bDistGoal = best ? Math.abs(best.x - goalX) : Infinity;
                return tDistGoal < bDistGoal ? t : best;
            }, null);
            if (best && chance(AI_PARAMS.PASS_ACCURACY)) {
                ball.passTo(best, PLAYER_STATS.PASS_POWER);
                ball.lastKicker = player;
                player.aiState = 'idle';
                return;
            }
        }

        // Dribble toward goal
        const dribbleAngle = angleBetween(player, { x: goalX, y: goalY });
        // Avoid nearest opponent
        const nearest = this.findNearest(player, opponents.filter(o => o.alive));
        if (nearest && nearest.dist < 50) {
            // Dodge perpendicular
            const dodgeAngle = angleBetween(player, nearest.player) + Math.PI / 2;
            player.moveToward(
                player.x + Math.cos(dodgeAngle) * 50,
                player.y + Math.sin(dodgeAngle) * 50,
                1.0
            );
        } else {
            player.moveToward(goalX, goalY + (Math.random() - 0.5) * 100, 0.9);
        }
        player.aiState = 'chase_ball';
    }

    supportBehavior(player, ball, pitch) {
        // Move toward a good passing position
        const isHome = player.team === TEAM.HOME;
        const dir = isHome ? 1 : -1;
        const targetX = ball.x + dir * randRange(60, 120);
        const targetY = player.basePos.y * pitch.h + pitch.y + (Math.random() - 0.5) * 80;

        // Clamp to pitch
        const tx = clamp(targetX, pitch.x + 20, pitch.x + pitch.w - 20);
        const ty = clamp(targetY, pitch.y + 20, pitch.y + pitch.h - 20);

        player.moveToward(tx, ty, 0.6);
        player.aiState = 'idle';
    }

    defensiveBehavior(player, ball, pitch, opponents) {
        const ballDist = dist(player, ball);

        // Closest to ball → chase it
        if (ballDist < 150 || player.role === 'MID') {
            if (!ball.carrier) {
                player.moveToward(ball.x, ball.y, 1.0);
                player.aiState = 'chase_ball';
            } else {
                // Chase ball carrier
                player.moveToward(ball.carrier.x, ball.carrier.y, 0.9);
                player.aiState = 'chase_ball';

                // Try to tackle (take ball) if very close
                if (ball.carrier && dist(player, ball.carrier) < PLAYER_RADIUS * 2 + 5) {
                    // Tackle — 50% chance to win ball
                    if (chance(0.5)) {
                        ball.carrier = null;
                        ball.vx = (Math.random() - 0.5) * 3;
                        ball.vy = (Math.random() - 0.5) * 3;
                    }
                }
            }
        } else {
            // Return to defensive position
            const homeX = pitch.x + player.basePos.x * pitch.w;
            const homeY = pitch.y + player.basePos.y * pitch.h;
            player.moveToward(homeX, homeY, 0.5);
            player.aiState = 'return_pos';
        }
    }

    executeCombat(player, target, weaponSystem, allPlayers) {
        if (!player.canAttack()) return;

        player.facing = angleBetween(player, target);
        const attack = player.attack();
        if (attack) {
            weaponSystem.processAttack(attack, allPlayers);
        }

        // Move toward target if melee
        if (player.weapon === WEAPON_TYPE.FIST || player.weapon === WEAPON_TYPE.SHANK) {
            player.moveToward(target.x, target.y, 1.0);
        }
    }

    findNearest(player, others) {
        let nearest = null;
        let nearestDist = Infinity;
        others.forEach(o => {
            const d = dist(player, o);
            if (d < nearestDist) {
                nearestDist = d;
                nearest = o;
            }
        });
        return nearest ? { player: nearest, dist: nearestDist } : null;
    }

    findNearestThreat(player, opponents) {
        // Find nearest opponent who has a weapon (not just fists) or is very close
        let nearest = null;
        let nearestDist = Infinity;
        opponents.forEach(o => {
            if (!o.alive) return;
            const d = dist(player, o);
            const isThreat = o.weapon !== WEAPON_TYPE.FIST || d < 40;
            if (isThreat && d < nearestDist) {
                nearestDist = d;
                nearest = o;
            }
        });
        return nearest ? { player: nearest, dist: nearestDist } : null;
    }
}
