export class DatePicker {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.init();
    }

    init() {
        const datePickerPanel = document.createElement('div');
        datePickerPanel.id = 'date-picker-panel';
        datePickerPanel.className = 'panel date-picker-panel';
        datePickerPanel.innerHTML = `
            <div class="panel-title">Jump to Date</div>
            <input type="datetime-local" id="date-input" class="date-input">
            <button class="control-btn" id="jump-to-date-btn">Jump</button>
            <div class="date-presets">
                <button class="date-preset-btn" data-days="0">Today</button>
                <button class="date-preset-btn" data-days="-365">1 Year Ago</button>
                <button class="date-preset-btn" data-days="365">1 Year Ahead</button>
                <button class="date-preset-btn" data-days="-3650">10 Years Ago</button>
                <button class="date-preset-btn" data-days="3650">10 Years Ahead</button>
            </div>
        `;
        document.getElementById('left-panels')?.appendChild(datePickerPanel);

        document.getElementById('jump-to-date-btn')?.addEventListener('click', () => {
            this.jumpToDate();
        });

        document.querySelectorAll('.date-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const days = parseInt(btn.dataset.days);
                const date = new Date();
                date.setDate(date.getDate() + days);
                this.setDate(date);
            });
        });
    }

    jumpToDate() {
        const input = document.getElementById('date-input');
        if (!input || !input.value) return;

        const date = new Date(input.value);
        if (isNaN(date.getTime())) {
            alert('Invalid date');
            return;
        }

        this.setDate(date);
    }

    setDate(date) {
        this.solarSystem.currentDate = date;
        this.solarSystem.simulationStartDate = date;
        this.solarSystem.updateDateDisplay();
        this.solarSystem.updatePlanetPositions(date);
    }
}

