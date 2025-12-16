export class Tooltip {
    constructor() {
        this.tooltip = null;
        this.init();
    }

    init() {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
        this.tooltip = tooltip;

        // Add tooltips to buttons
        document.querySelectorAll('.control-btn, .time-btn, .preset-btn').forEach(btn => {
            const title = btn.getAttribute('title') || btn.textContent;
            if (title) {
                btn.addEventListener('mouseenter', (e) => {
                    this.show(e.target, title);
                });
                btn.addEventListener('mouseleave', () => {
                    this.hide();
                });
            }
        });
    }

    show(element, text) {
        if (!this.tooltip) return;
        this.tooltip.textContent = text;
        this.tooltip.style.display = 'block';
        
        const rect = element.getBoundingClientRect();
        this.tooltip.style.left = `${rect.left + rect.width / 2}px`;
        this.tooltip.style.top = `${rect.top - 30}px`;
        this.tooltip.style.transform = 'translateX(-50%)';
    }

    hide() {
        if (this.tooltip) {
            this.tooltip.style.display = 'none';
        }
    }
}

