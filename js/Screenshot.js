export class Screenshot {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
    }

    capture() {
        try {
            this.solarSystem.renderer.render(this.solarSystem.scene, this.solarSystem.camera);
            const dataURL = this.solarSystem.renderer.domElement.toDataURL('image/png');
            this.download(dataURL, `solar-system-${Date.now()}.png`);
        } catch (error) {
            console.error('Screenshot failed:', error);
            alert('Screenshot failed. Please try again.');
        }
    }

    download(dataURL, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

