export class Config {
    static async load() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error('Failed to load config');
            const config = await response.json();
            return config;
        } catch (error) {
            console.error('Error loading config:', error);
            return this.getDefaultConfig();
        }
    }

    static getDefaultConfig() {
        return {
            scaling: {
                PLANET_SIZE_SCALE: 0.0002,
                SUN_VISUAL_SCALE: 0.05,
                AU_IN_UNITS: 500,
                MOON_DISTANCE_SCALE: 0.00006,
                MIN_SPACECRAFT_SCALE: 0.002,
                COMET_SCALE: 0.5
            },
            performance: {
                STAR_COUNT: 20000,
                ASTEROID_COUNT: 25000,
                RING_PARTICLE_COUNT: 8000,
                ENABLE_LOD: true,
                LOD_DISTANCE_THRESHOLD: 10000
            }
        };
    }
}

