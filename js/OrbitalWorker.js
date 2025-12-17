// Manager for Web Worker orbital calculations
export class OrbitalWorker {
    constructor() {
        this.worker = null;
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.init();
    }

    init() {
        try {
            // Create Web Worker
            const workerCode = `
                ${this.getWorkerCode()}
            `;
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            this.worker = new Worker(URL.createObjectURL(blob));
            
            this.worker.onmessage = (e) => {
                const { type, requestId, results, prediction, ephemeris } = e.data;
                
                if (requestId && this.pendingRequests.has(requestId)) {
                    const { resolve, reject } = this.pendingRequests.get(requestId);
                    this.pendingRequests.delete(requestId);
                    
                    if (type === 'POSITIONS_CALCULATED') {
                        resolve(results);
                    } else if (type === 'ORBIT_PREDICTED') {
                        resolve(prediction);
                    } else if (type === 'EPHEMERIS_CALCULATED') {
                        resolve(ephemeris);
                    } else {
                        reject(new Error('Unknown response type'));
                    }
                }
            };
            
            this.worker.onerror = (error) => {
                console.error('Worker error:', error);
                // Fallback to inline calculations
            };
        } catch (error) {
            console.warn('Web Workers not supported, falling back to inline calculations:', error);
        }
    }

    getWorkerCode() {
        // Import the worker code
        return `
            self.onmessage = function(e) {
                const { type, data, requestId } = e.data;
                
                switch(type) {
                    case 'CALCULATE_POSITIONS':
                        const results = calculatePositions(data);
                        self.postMessage({ type: 'POSITIONS_CALCULATED', requestId, results });
                        break;
                        
                    case 'PREDICT_ORBIT':
                        const prediction = predictOrbit(data);
                        self.postMessage({ type: 'ORBIT_PREDICTED', requestId, prediction });
                        break;
                        
                    case 'CALCULATE_EPHEMERIS':
                        const ephemeris = calculateEphemeris(data);
                        self.postMessage({ type: 'EPHEMERIS_CALCULATED', requestId, ephemeris });
                        break;
                }
            };

            function calculatePositions(data) {
                const { objects, date, timeScale } = data;
                const J2000 = new Date('2000-01-01T12:00:00Z');
                const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);
                
                const positions = {};
                
                objects.forEach(obj => {
                    if (obj.type === 'planet' && obj.orbitalSpeed) {
                        const period = 1 / obj.orbitalSpeed;
                        const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                        const trueAnomaly = meanAnomaly + (2 * obj.eccentricity * Math.sin(meanAnomaly));
                        
                        const a = obj.distance;
                        const e = obj.eccentricity || 0;
                        const c = a * e;
                        const b = a * Math.sqrt(1 - e * e);
                        
                        positions[obj.name] = {
                            x: Math.cos(trueAnomaly) * a + c,
                            z: Math.sin(trueAnomaly) * b,
                            angle: trueAnomaly
                        };
                    } else if (obj.type === 'moon' && obj.orbitalSpeed) {
                        const period = 1 / obj.orbitalSpeed;
                        const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                        const trueAnomaly = meanAnomaly;
                        
                        positions[obj.name] = {
                            x: Math.cos(trueAnomaly) * obj.distance,
                            z: Math.sin(trueAnomaly) * obj.distance,
                            angle: trueAnomaly
                        };
                    }
                });
                
                return positions;
            }

            function predictOrbit(data) {
                const { object, startDate, daysAhead, steps } = data;
                const predictions = [];
                const stepSize = daysAhead / steps;
                
                for (let i = 0; i <= steps; i++) {
                    const date = new Date(startDate.getTime() + (i * stepSize * 24 * 60 * 60 * 1000));
                    const J2000 = new Date('2000-01-01T12:00:00Z');
                    const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);
                    
                    if (object.orbitalSpeed) {
                        const period = 1 / object.orbitalSpeed;
                        const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                        const trueAnomaly = meanAnomaly + (2 * (object.eccentricity || 0) * Math.sin(meanAnomaly));
                        
                        const a = object.distance;
                        const e = object.eccentricity || 0;
                        const c = a * e;
                        const b = a * Math.sqrt(1 - e * e);
                        
                        predictions.push({
                            date: date.toISOString(),
                            x: Math.cos(trueAnomaly) * a + c,
                            z: Math.sin(trueAnomaly) * b,
                            y: 0
                        });
                    }
                }
                
                return predictions;
            }

            function calculateEphemeris(data) {
                const { object, startDate, endDate, interval } = data;
                const ephemeris = [];
                const currentDate = new Date(startDate);
                const end = new Date(endDate);
                
                while (currentDate <= end) {
                    const J2000 = new Date('2000-01-01T12:00:00Z');
                    const daysSinceJ2000 = (currentDate - J2000) / (1000 * 60 * 60 * 24);
                    
                    if (object.orbitalSpeed) {
                        const period = 1 / object.orbitalSpeed;
                        const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                        const trueAnomaly = meanAnomaly + (2 * (object.eccentricity || 0) * Math.sin(meanAnomaly));
                        
                        const a = object.distance;
                        const e = object.eccentricity || 0;
                        const c = a * e;
                        const b = a * Math.sqrt(1 - e * e);
                        
                        ephemeris.push({
                            date: new Date(currentDate),
                            position: {
                                x: Math.cos(trueAnomaly) * a + c,
                                z: Math.sin(trueAnomaly) * b,
                                y: 0
                            }
                        });
                    }
                    
                    currentDate.setTime(currentDate.getTime() + interval);
                }
                
                return ephemeris;
            }
        `;
    }

    calculatePositions(objects, date, timeScale) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                // Fallback to inline calculation
                resolve(this.inlineCalculatePositions(objects, date, timeScale));
                return;
            }
            
            const requestId = ++this.requestId;
            this.pendingRequests.set(requestId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'CALCULATE_POSITIONS',
                requestId,
                data: { objects, date, timeScale }
            });
        });
    }

    predictOrbit(object, startDate, daysAhead = 365, steps = 100) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                resolve(this.inlinePredictOrbit(object, startDate, daysAhead, steps));
                return;
            }
            
            const requestId = ++this.requestId;
            this.pendingRequests.set(requestId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'PREDICT_ORBIT',
                requestId,
                data: { object, startDate, daysAhead, steps }
            });
        });
    }

    calculateEphemeris(object, startDate, endDate, interval = 24 * 60 * 60 * 1000) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                resolve(this.inlineCalculateEphemeris(object, startDate, endDate, interval));
                return;
            }
            
            const requestId = ++this.requestId;
            this.pendingRequests.set(requestId, { resolve, reject });
            
            this.worker.postMessage({
                type: 'CALCULATE_EPHEMERIS',
                requestId,
                data: { object, startDate, endDate, interval }
            });
        });
    }

    // Fallback inline calculations
    inlineCalculatePositions(objects, date, timeScale) {
        const J2000 = new Date('2000-01-01T12:00:00Z');
        const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);
        const positions = {};
        
        objects.forEach(obj => {
            if (obj.type === 'planet' && obj.orbitalSpeed) {
                const period = 1 / obj.orbitalSpeed;
                const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                const trueAnomaly = meanAnomaly + (2 * obj.eccentricity * Math.sin(meanAnomaly));
                
                const a = obj.distance;
                const e = obj.eccentricity || 0;
                const c = a * e;
                const b = a * Math.sqrt(1 - e * e);
                
                positions[obj.name] = {
                    x: Math.cos(trueAnomaly) * a + c,
                    z: Math.sin(trueAnomaly) * b,
                    angle: trueAnomaly
                };
            }
        });
        
        return positions;
    }

    inlinePredictOrbit(object, startDate, daysAhead, steps) {
        const predictions = [];
        const stepSize = daysAhead / steps;
        
        for (let i = 0; i <= steps; i++) {
            const date = new Date(startDate.getTime() + (i * stepSize * 24 * 60 * 60 * 1000));
            const J2000 = new Date('2000-01-01T12:00:00Z');
            const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);
            
            if (object.orbitalSpeed) {
                const period = 1 / object.orbitalSpeed;
                const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                const trueAnomaly = meanAnomaly + (2 * (object.eccentricity || 0) * Math.sin(meanAnomaly));
                
                const a = object.distance;
                const e = object.eccentricity || 0;
                const c = a * e;
                const b = a * Math.sqrt(1 - e * e);
                
                predictions.push({
                    date: date.toISOString(),
                    x: Math.cos(trueAnomaly) * a + c,
                    z: Math.sin(trueAnomaly) * b,
                    y: 0
                });
            }
        }
        
        return predictions;
    }

    inlineCalculateEphemeris(object, startDate, endDate, interval) {
        const ephemeris = [];
        const currentDate = new Date(startDate);
        const end = new Date(endDate);
        
        while (currentDate <= end) {
            const J2000 = new Date('2000-01-01T12:00:00Z');
            const daysSinceJ2000 = (currentDate - J2000) / (1000 * 60 * 60 * 24);
            
            if (object.orbitalSpeed) {
                const period = 1 / object.orbitalSpeed;
                const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                const trueAnomaly = meanAnomaly + (2 * (object.eccentricity || 0) * Math.sin(meanAnomaly));
                
                const a = object.distance;
                const e = object.eccentricity || 0;
                const c = a * e;
                const b = a * Math.sqrt(1 - e * e);
                
                ephemeris.push({
                    date: new Date(currentDate),
                    position: {
                        x: Math.cos(trueAnomaly) * a + c,
                        z: Math.sin(trueAnomaly) * b,
                        y: 0
                    }
                });
            }
            
            currentDate.setTime(currentDate.getTime() + interval);
        }
        
        return ephemeris;
    }

    terminate() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }
}

