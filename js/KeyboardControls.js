export class KeyboardControls {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.keys = new Set();
        this.shortcuts = {
            ' ': () => this.togglePause(),
            'r': () => this.resetView(),
            'o': () => this.toggleOrbits(),
            'l': () => this.toggleLabels(),
            '1': () => this.focusPlanet('Sun'),
            '2': () => this.focusPlanet('Mercury'),
            '3': () => this.focusPlanet('Venus'),
            '4': () => this.focusPlanet('Earth'),
            '5': () => this.focusPlanet('Mars'),
            '6': () => this.focusPlanet('Jupiter'),
            '7': () => this.focusPlanet('Saturn'),
            '8': () => this.focusPlanet('Uranus'),
            '9': () => this.focusPlanet('Neptune'),
            'ArrowUp': () => this.increaseTimeScale(),
            'ArrowDown': () => this.decreaseTimeScale(),
            'h': () => this.toggleHelp(),
            's': () => this.takeScreenshot(),
            'b': () => this.toggleBookmark(),
            'c': () => this.toggleComparison(),
            'd': () => this.toggleDistanceTool(),
            'Escape': () => this.closeInspector()
        };

        this.init();
    }

    init() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            const key = e.key;
            this.keys.add(key);

            if (this.shortcuts[key]) {
                e.preventDefault();
                this.shortcuts[key]();
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys.delete(e.key);
        });
    }

    togglePause() {
        const slider = document.getElementById('time-slider');
        if (this.solarSystem.isPaused) {
            slider.value = 1;
        } else {
            slider.value = 0;
        }
        slider.dispatchEvent(new Event('input'));
    }

    resetView() {
        document.getElementById('reset-view')?.click();
    }

    toggleOrbits() {
        document.getElementById('toggle-orbits')?.click();
    }

    toggleLabels() {
        document.getElementById('toggle-labels')?.click();
    }

    focusPlanet(name) {
        const body = this.solarSystem.celestialBodies.find(b => b.name === name);
        if (body) {
            this.solarSystem.focusAndFitObject(body.mesh);
        }
    }

    increaseTimeScale() {
        const slider = document.getElementById('time-slider');
        const current = parseInt(slider.value);
        if (current < 6) {
            slider.value = current + 1;
            slider.dispatchEvent(new Event('input'));
        }
    }

    decreaseTimeScale() {
        const slider = document.getElementById('time-slider');
        const current = parseInt(slider.value);
        if (current > 0) {
            slider.value = current - 1;
            slider.dispatchEvent(new Event('input'));
        }
    }

    toggleHelp() {
        const helpPanel = document.getElementById('help-panel');
        if (helpPanel) {
            helpPanel.classList.toggle('hidden');
        }
    }

    takeScreenshot() {
        if (this.solarSystem.screenshot) {
            this.solarSystem.screenshot();
        }
    }

    toggleBookmark() {
        if (this.solarSystem.bookmarkManager) {
            this.solarSystem.bookmarkManager.toggleBookmark();
        }
    }

    toggleComparison() {
        if (this.solarSystem.comparisonTool) {
            this.solarSystem.comparisonTool.toggle();
        }
    }

    toggleDistanceTool() {
        if (this.solarSystem.distanceTool) {
            this.solarSystem.distanceTool.toggle();
        }
    }

    closeInspector() {
        if (this.solarSystem.objectInspector && this.solarSystem.objectInspector.isActive) {
            this.solarSystem.objectInspector.close();
        }
    }
}

