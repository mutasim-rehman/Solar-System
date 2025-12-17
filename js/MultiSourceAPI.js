// Multi-source API integration (NASA, ESA, JPL, etc.)
export class MultiSourceAPI {
    constructor() {
        this.apis = {
            nasa: {
                baseUrl: 'https://api.nasa.gov',
                key: null,
                endpoints: {
                    apod: '/planetary/apod',
                    neows: '/neo/rest/v1/feed',
                    insight: '/insight_weather/',
                    marsPhotos: '/mars-photos/api/v1/rovers'
                }
            },
            esa: {
                baseUrl: 'https://www.esa.int',
                key: null,
                endpoints: {}
            },
            jpl: {
                baseUrl: 'https://ssd.jpl.nasa.gov/api',
                key: null,
                endpoints: {
                    horizons: '/horizons.api'
                }
            }
        };
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    setAPIKey(service, key) {
        if (this.apis[service]) {
            this.apis[service].key = key;
            localStorage.setItem(`${service}ApiKey`, key);
        }
    }

    async fetchNASA(endpoint, params = {}) {
        const api = this.apis.nasa;
        if (!api.key) {
            throw new Error('NASA API key not set');
        }

        const cacheKey = `nasa_${endpoint}_${JSON.stringify(params)}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const url = new URL(`${api.baseUrl}${api.endpoints[endpoint]}`);
        url.searchParams.append('api_key', api.key);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`NASA API error: ${response.statusText}`);
            const data = await response.json();
            
            this.cache.set(cacheKey, { data, timestamp: Date.now() });
            return data;
        } catch (error) {
            console.error('NASA API fetch error:', error);
            throw error;
        }
    }

    async fetchJPLHorizons(target, startDate, stopDate) {
        const api = this.apis.jpl;
        const url = new URL(`${api.baseUrl}${api.endpoints.horizons}`);
        
        url.searchParams.append('format', 'json');
        url.searchParams.append('COMMAND', target);
        url.searchParams.append('OBJ_DATA', 'YES');
        url.searchParams.append('MAKE_EPHEM', 'YES');
        url.searchParams.append('EPHEM_TYPE', 'VECTORS');
        url.searchParams.append('CENTER', '500@10'); // Solar System Barycenter
        url.searchParams.append('START_TIME', startDate.toISOString().split('T')[0]);
        url.searchParams.append('STOP_TIME', stopDate.toISOString().split('T')[0]);
        url.searchParams.append('STEP_SIZE', '1d');
        url.searchParams.append('QUANTITIES', '1,9,20,23,24');

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`JPL API error: ${response.statusText}`);
            const data = await response.json();
            return this.parseHorizonsData(data);
        } catch (error) {
            console.error('JPL Horizons fetch error:', error);
            throw error;
        }
    }

    parseHorizonsData(data) {
        // Parse JPL Horizons response
        if (data.result && data.result.includes('$$SOE')) {
            const lines = data.result.split('\n');
            const ephemeris = [];
            
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('$$SOE')) {
                    // Start of ephemeris
                    for (let j = i + 1; j < lines.length; j++) {
                        if (lines[j].includes('$$EOE')) break;
                        
                        const parts = lines[j].trim().split(/\s+/);
                        if (parts.length > 10) {
                            ephemeris.push({
                                date: new Date(parts[0] + 'T' + parts[1]),
                                x: parseFloat(parts[2]),
                                y: parseFloat(parts[3]),
                                z: parseFloat(parts[4]),
                                vx: parseFloat(parts[5]),
                                vy: parseFloat(parts[6]),
                                vz: parseFloat(parts[7])
                            });
                        }
                    }
                    break;
                }
            }
            
            return ephemeris;
        }
        
        return [];
    }

    async fetchNearEarthObjects(startDate, endDate) {
        return this.fetchNASA('neows', {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        });
    }

    async fetchMarsWeather() {
        return this.fetchNASA('insight', {});
    }

    async fetchMarsPhotos(rover = 'curiosity', sol = null, earthDate = null) {
        const params = {};
        if (sol) params.sol = sol;
        if (earthDate) params.earth_date = earthDate;
        
        const endpoint = `${this.apis.nasa.endpoints.marsPhotos}/${rover}/photos`;
        const url = new URL(`${this.apis.nasa.baseUrl}${endpoint}`);
        url.searchParams.append('api_key', this.apis.nasa.key);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Mars Photos API error: ${response.statusText}`);
            return await response.json();
        } catch (error) {
            console.error('Mars Photos API fetch error:', error);
            throw error;
        }
    }

    clearCache() {
        this.cache.clear();
    }
}

