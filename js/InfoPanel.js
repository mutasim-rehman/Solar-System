export class InfoPanel {
    constructor() {
        this.panel = null;
        this.currentObject = null;
        this.init();
    }

    init() {
        const panel = document.createElement('div');
        panel.id = 'info-panel';
        panel.className = 'info-panel hidden';
        panel.innerHTML = `
            <div class="info-panel-header">
                <h3 id="info-title">Object Information</h3>
                <button class="info-close" id="info-close">×</button>
            </div>
            <div class="info-panel-content" id="info-content">
                <p>Click on any object to see its information</p>
            </div>
        `;
        document.body.appendChild(panel);
        this.panel = panel;

        document.getElementById('info-close')?.addEventListener('click', () => {
            this.hide();
        });

        document.addEventListener('click', (e) => {
            if (e.target === this.panel || this.panel.contains(e.target)) return;
            if (!e.target.closest('.planet-label') && !e.target.closest('.search-result')) {
                // Don't hide on clicks that might open the panel
            }
        });
    }

    show(object, data) {
        this.currentObject = object;
        this.panel.classList.remove('hidden');
        this.updateContent(data);
    }

    hide() {
        this.panel.classList.add('hidden');
        this.currentObject = null;
    }

    updateContent(data) {
        const title = document.getElementById('info-title');
        const content = document.getElementById('info-content');

        if (!title || !content) return;

        title.textContent = data.name || 'Unknown Object';

        let html = '';

        if (data.info) {
            html += '<div class="info-section">';
            html += '<h4>Basic Information</h4>';
            html += '<table class="info-table">';
            
            if (data.info.mass) {
                html += `<tr><td>Mass:</td><td>${data.info.mass}</td></tr>`;
            }
            if (data.info.composition) {
                html += `<tr><td>Composition:</td><td>${data.info.composition}</td></tr>`;
            }
            if (data.info.temperature) {
                html += `<tr><td>Temperature:</td><td>${data.info.temperature}</td></tr>`;
            }
            if (data.info.moons !== undefined) {
                html += `<tr><td>Moons:</td><td>${data.info.moons}</td></tr>`;
            }
            if (data.info.discovery) {
                html += `<tr><td>Discovery:</td><td>${data.info.discovery}</td></tr>`;
            }
            if (data.info.description) {
                html += `<tr><td colspan="2">${data.info.description}</td></tr>`;
            }
            if (data.info.nextPerihelion) {
                html += `<tr><td>Next Perihelion:</td><td>${data.info.nextPerihelion}</td></tr>`;
            }

            html += '</table>';
            html += '</div>';
        }

        if (data.real) {
            html += '<div class="info-section">';
            html += '<h4>Orbital Data</h4>';
            html += '<table class="info-table">';
            
            if (data.real.radius) {
                html += `<tr><td>Radius:</td><td>${data.real.radius.toLocaleString()} km</td></tr>`;
            }
            if (data.real.distance) {
                html += `<tr><td>Distance from Sun:</td><td>${data.real.distance} AU</td></tr>`;
            }
            if (data.real.orbitPeriod) {
                html += `<tr><td>Orbital Period:</td><td>${data.real.orbitPeriod} days</td></tr>`;
            }
            if (data.real.rotationPeriod) {
                html += `<tr><td>Rotation Period:</td><td>${Math.abs(data.real.rotationPeriod)} days</td></tr>`;
            }
            if (data.real.ecc) {
                html += `<tr><td>Eccentricity:</td><td>${data.real.ecc.toFixed(3)}</td></tr>`;
            }
            if (data.real.incl) {
                html += `<tr><td>Inclination:</td><td>${data.real.incl}°</td></tr>`;
            }

            html += '</table>';
            html += '</div>';
        }

        if (data.type === 'spacecraft') {
            html += '<div class="info-section">';
            html += '<h4>Mission Information</h4>';
            html += '<p>Spacecraft tracking data and mission details</p>';
            html += '</div>';
        }

        content.innerHTML = html;
    }

    isVisible() {
        return !this.panel.classList.contains('hidden');
    }
}

