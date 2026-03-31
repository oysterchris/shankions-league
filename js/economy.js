// ── Economy & Progression ──

class Economy {
    constructor() {
        this.cash = ECONOMY.STARTING_CASH;
        this.level = 1;
        this.matchesWon = 0;
        this.totalKills = 0;

        // Unlocked upgrade slots
        this.extraShanks = 0;    // additional shank slots
        this.hasSidearm = false;  // sidearm unlocked
        this.extraRifle = false;  // second rifle slot

        // Shop items
        this.shopItems = [
            { id: 'shank2', name: 'Extra Shank', desc: 'Equip a second player with a shank', price: 300, type: 'shank', bought: false },
            { id: 'shank3', name: 'Third Shank', desc: 'Equip a third player with a shank', price: 500, type: 'shank', bought: false, requires: 'shank2' },
            { id: 'sidearm', name: 'Sidearm', desc: 'Unlock sidearm for one player', price: 600, type: 'sidearm', bought: false },
            { id: 'rifle2', name: 'Second Rifle', desc: 'Equip a second player with a rifle', price: 1000, type: 'rifle', bought: false },
            { id: 'armor1', name: 'Light Armor', desc: '+25 HP for all players', price: 400, type: 'armor', bought: false },
            { id: 'speed1', name: 'Speed Boots', desc: '+15% movement speed', price: 350, type: 'speed', bought: false },
            { id: 'recruit', name: 'Recruit Player', desc: 'Replace a dead player', price: 800, type: 'recruit', bought: false },
        ];
    }

    addCash(amount) {
        this.cash += amount;
    }

    canBuy(item) {
        if (item.bought) return false;
        if (this.cash < item.price) return false;
        if (item.requires) {
            const req = this.shopItems.find(i => i.id === item.requires);
            if (req && !req.bought) return false;
        }
        return true;
    }

    buy(item) {
        if (!this.canBuy(item)) return false;
        this.cash -= item.price;
        item.bought = true;
        playSound('buy');
        return true;
    }

    getMatchReward(homeScore, awayScore, kills) {
        let reward = 0;
        if (homeScore > awayScore) {
            reward += ECONOMY.WIN_BONUS;
            this.matchesWon++;
        } else if (homeScore === awayScore) {
            reward += ECONOMY.DRAW_BONUS;
        } else {
            reward += ECONOMY.LOSS_BONUS;
        }
        reward += homeScore * ECONOMY.GOAL_BONUS;
        reward += kills * ECONOMY.KILL_BONUS;
        this.totalKills += kills;
        return reward;
    }

    getAvailableWeaponSlots() {
        const slots = {
            rifles: 1,
            shanks: 1,
            sidearms: 0,
        };

        this.shopItems.forEach(item => {
            if (!item.bought) return;
            if (item.id === 'shank2') slots.shanks++;
            if (item.id === 'shank3') slots.shanks++;
            if (item.id === 'sidearm') slots.sidearms++;
            if (item.id === 'rifle2') slots.rifles++;
        });

        return slots;
    }

    applyUpgrades(players) {
        this.shopItems.forEach(item => {
            if (!item.bought) return;
            if (item.id === 'armor1') {
                players.forEach(p => {
                    if (p.alive) p.hp = Math.min(p.hp + 25, 125);
                });
            }
            if (item.id === 'speed1') {
                players.forEach(p => {
                    p.speed = PLAYER_STATS.SPEED * 1.15;
                });
            }
        });
    }

    // Check if a dead player can be recruited
    canRecruit() {
        const item = this.shopItems.find(i => i.id === 'recruit');
        return item && !item.bought;
    }

    resetForNewMatch() {
        // Recruit item resets each match (can buy again)
        const recruit = this.shopItems.find(i => i.id === 'recruit');
        if (recruit) recruit.bought = false;
    }
}
