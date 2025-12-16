export class SpeedIndicator {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.indicator = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        const indicator = document.getElementById('speed-indicator');
        if (!indicator) return;
        this.indicator = indicator;
    }

    update(object) {
        if (!this.indicator || !object) {
            if (this.indicator) this.indicator.classList.add('hidden');
            return;
        }

        const body = this.solarSystem.celestialBodies.find(b => b.mesh === object) ||
                    this.solarSystem.spacecraft.find(s => s.model === object) ||
                    this.solarSystem.comets.find(c => c.mesh === object);

        if (!body || !body.data) {
            this.indicator.classList.add('hidden');
            return;
        }

        let speed = 0;
        if (body.data.orbitalSpeed) {
            const distance = body.data.distance || body.data.semiMajorAxis * this.solarSystem.AU_IN_UNITS;
            const circumference = 2 * Math.PI * distance;
            const periodDays = 1 / body.data.orbitalSpeed;
            const periodSeconds = periodDays * 24 * 60 * 60;
            speed = circumference / periodSeconds;
        }

        if (speed > 0) {
            const speedKmS = speed / this.solarSystem.config.scaling.PLANET_SIZE_SCALE;
            this.indicator.textContent = `Speed: ${speedKmS.toFixed(2)} km/s`;
            this.indicator.classList.remove('hidden');
            this.isVisible = true;
        } else {
            this.indicator.classList.add('hidden');
            this.isVisible = false;
        }
    }

    hide() {
        if (this.indicator) {
            this.indicator.classList.add('hidden');
            this.isVisible = false;
        }
    }
}

