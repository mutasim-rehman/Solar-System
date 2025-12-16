export class DataExport {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
    }

    exportToJSON() {
        const data = {
            date: this.solarSystem.currentDate.toISOString(),
            mode: this.solarSystem.isRealTime ? 'live' : 'simulation',
            timeScale: this.solarSystem.timeScale,
            objects: {
                planets: this.solarSystem.celestialBodies
                    .filter(b => b.type === 'planet' || b.type === 'star')
                    .map(b => ({
                        name: b.name,
                        position: {
                            x: b.mesh.position.x,
                            y: b.mesh.position.y,
                            z: b.mesh.position.z
                        },
                        angle: b.currentAngle
                    })),
                moons: this.solarSystem.celestialBodies
                    .filter(b => b.type === 'moon')
                    .map(b => ({
                        name: b.name,
                        position: {
                            x: b.mesh.position.x,
                            y: b.mesh.position.y,
                            z: b.mesh.position.z
                        }
                    })),
                spacecraft: this.solarSystem.spacecraft.map(s => ({
                    name: s.name,
                    position: {
                        x: s.model.position.x,
                        y: s.model.position.y,
                        z: s.model.position.z
                    }
                })),
                comets: this.solarSystem.comets.map(c => ({
                    name: c.name,
                    position: {
                        x: c.mesh.position.x,
                        y: c.mesh.position.y,
                        z: c.mesh.position.z
                    }
                }))
            }
        };

        const json = JSON.stringify(data, null, 2);
        this.download(json, `solar-system-${Date.now()}.json`, 'application/json');
    }

    exportToCSV() {
        let csv = 'Name,Type,X,Y,Z,Date\n';
        
        const allObjects = [
            ...this.solarSystem.celestialBodies.map(b => ({
                name: b.name,
                type: b.type,
                pos: b.mesh.position
            })),
            ...this.solarSystem.spacecraft.map(s => ({
                name: s.name,
                type: 'spacecraft',
                pos: s.model.position
            })),
            ...this.solarSystem.comets.map(c => ({
                name: c.name,
                type: 'comet',
                pos: c.mesh.position
            }))
        ];

        allObjects.forEach(obj => {
            csv += `${obj.name},${obj.type},${obj.pos.x.toFixed(2)},${obj.pos.y.toFixed(2)},${obj.pos.z.toFixed(2)},${this.solarSystem.currentDate.toISOString()}\n`;
        });

        this.download(csv, `solar-system-${Date.now()}.csv`, 'text/csv');
    }

    download(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

