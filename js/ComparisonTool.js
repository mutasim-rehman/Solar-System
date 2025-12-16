export class ComparisonTool {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.isActive = false;
        this.selectedObjects = [];
        this.panel = null;
        this.init();
    }

    init() {
        const panel = document.createElement('div');
        panel.id = 'comparison-panel';
        panel.className = 'panel comparison-panel hidden';
        panel.innerHTML = `
            <div class="panel-title">Planet Comparison</div>
            <div class="comparison-content" id="comparison-content">
                <p>Select two objects to compare</p>
            </div>
            <button class="control-btn" id="clear-comparison">Clear</button>
        `;
        document.getElementById('right-panels')?.appendChild(panel);
        this.panel = panel;

        document.getElementById('clear-comparison')?.addEventListener('click', () => {
            this.clear();
        });
    }

    selectObject(object) {
        if (this.selectedObjects.length >= 2) {
            this.selectedObjects.shift();
        }
        this.selectedObjects.push(object);
        this.updateComparison();
    }

    updateComparison() {
        const content = document.getElementById('comparison-content');
        if (!content) return;

        if (this.selectedObjects.length < 2) {
            content.innerHTML = '<p>Select two objects to compare</p>';
            return;
        }

        const obj1 = this.selectedObjects[0];
        const obj2 = this.selectedObjects[1];

        let html = '<table class="comparison-table">';
        html += '<tr><th>Property</th><th>' + obj1.name + '</th><th>' + obj2.name + '</th></tr>';

        const props = ['radius', 'distance', 'orbitPeriod', 'rotationPeriod', 'ecc', 'incl'];
        
        props.forEach(prop => {
            const val1 = obj1.data?.real?.[prop] || obj1.real?.[prop];
            const val2 = obj2.data?.real?.[prop] || obj2.real?.[prop];
            
            if (val1 !== undefined && val2 !== undefined) {
                let label = prop;
                let unit = '';
                
                switch(prop) {
                    case 'radius': label = 'Radius'; unit = ' km'; break;
                    case 'distance': label = 'Distance from Sun'; unit = ' AU'; break;
                    case 'orbitPeriod': label = 'Orbital Period'; unit = ' days'; break;
                    case 'rotationPeriod': label = 'Rotation Period'; unit = ' days'; break;
                    case 'ecc': label = 'Eccentricity'; break;
                    case 'incl': label = 'Inclination'; unit = '°'; break;
                }

                html += `<tr>
                    <td>${label}</td>
                    <td>${typeof val1 === 'number' ? val1.toLocaleString() : val1}${unit}</td>
                    <td>${typeof val2 === 'number' ? val2.toLocaleString() : val2}${unit}</td>
                </tr>`;
            }
        });

        html += '</table>';
        content.innerHTML = html;
    }

    toggle() {
        this.isActive = !this.isActive;
        if (this.panel) {
            this.panel.classList.toggle('hidden', !this.isActive);
        }
    }

    clear() {
        this.selectedObjects = [];
        this.updateComparison();
    }
}

