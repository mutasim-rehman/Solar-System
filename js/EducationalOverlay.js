export class EducationalOverlay {
    constructor() {
        this.facts = [
            "The Sun contains 99.86% of the Solar System's mass",
            "Jupiter has 95 known moons",
            "Venus rotates backwards compared to most planets",
            "Saturn's rings are made mostly of ice particles",
            "Neptune has the fastest winds in the Solar System at over 2,000 km/h",
            "Mars has the largest volcano in the Solar System: Olympus Mons",
            "Mercury has extreme temperature variations: 427°C to -173°C",
            "Earth is the only known planet with life",
            "Uranus rotates on its side at a 98-degree angle",
            "The asteroid belt contains millions of objects"
        ];
        this.currentFactIndex = 0;
        this.overlay = null;
        this.init();
    }

    init() {
        const overlay = document.createElement('div');
        overlay.id = 'educational-overlay';
        overlay.style.cssText = `
            position: fixed;
            bottom: 250px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            max-width: 600px;
            font-size: 14px;
            text-align: center;
            z-index: 150;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.5s;
        `;
        document.body.appendChild(overlay);
        this.overlay = overlay;

        this.showNextFact();
        setInterval(() => this.showNextFact(), 15000); // Show new fact every 15 seconds
    }

    showNextFact() {
        if (!this.overlay) return;
        
        const fact = this.facts[this.currentFactIndex];
        this.overlay.textContent = `💡 Did you know: ${fact}`;
        this.overlay.style.opacity = '1';
        
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = '0';
            }
        }, 12000);

        this.currentFactIndex = (this.currentFactIndex + 1) % this.facts.length;
    }

    showCustom(text) {
        if (!this.overlay) return;
        this.overlay.textContent = text;
        this.overlay.style.opacity = '1';
        
        setTimeout(() => {
            if (this.overlay) {
                this.overlay.style.opacity = '0';
            }
        }, 5000);
    }
}

