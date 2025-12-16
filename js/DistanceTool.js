import * as THREE from 'three';
import { Raycaster } from 'three';

export class DistanceTool {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.isActive = false;
        this.startPoint = null;
        this.endPoint = null;
        this.line = null;
        this.label = null;
        this.raycaster = new Raycaster();
        this.init();
    }

    init() {
        this.createLine();
        this.createLabel();
        
        document.addEventListener('click', (e) => {
            if (!this.isActive || e.target.tagName === 'BUTTON' || e.target.closest('.panel')) return;
            const mouse = new THREE.Vector2();
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
            
            this.raycaster.setFromCamera(mouse, this.solarSystem.camera);
            const intersects = this.raycaster.intersectObjects(
                [...this.solarSystem.celestialBodies.map(b => b.mesh),
                 ...this.solarSystem.spacecraft.map(s => s.model),
                 ...this.solarSystem.comets.map(c => c.mesh)],
                true
            );

            if (intersects.length > 0) {
                const point = intersects[0].point;
                
                if (!this.startPoint) {
                    this.startPoint = point.clone();
                    this.line.geometry.setFromPoints([this.startPoint, this.startPoint]);
                } else {
                    this.endPoint = point.clone();
                    this.updateLine();
                    this.updateLabel();
                    this.startPoint = null;
                    this.endPoint = null;
                }
            }
        });
    }

    createLine() {
        const geometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 0)
        ]);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 2,
            dashed: true
        });
        this.line = new THREE.Line(geometry, material);
        this.line.visible = false;
        this.solarSystem.scene.add(this.line);
    }

    createLabel() {
        const div = document.createElement('div');
        div.className = 'distance-label';
        div.style.cssText = `
            position: absolute;
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            pointer-events: none;
            display: none;
        `;
        document.body.appendChild(div);
        this.label = div;
    }

    updateLine() {
        if (this.startPoint && this.endPoint) {
            this.line.geometry.setFromPoints([this.startPoint, this.endPoint]);
            this.line.visible = true;
        }
    }

    updateLabel() {
        if (this.startPoint && this.endPoint) {
            const distance = this.startPoint.distanceTo(this.endPoint);
            const distanceKm = distance / this.solarSystem.config.scaling.PLANET_SIZE_SCALE;
            const distanceAU = distanceKm / 149597870.7;
            
            const midpoint = new THREE.Vector3().addVectors(this.startPoint, this.endPoint).multiplyScalar(0.5);
            const screenPos = midpoint.project(this.solarSystem.camera);
            
            this.label.textContent = `${distanceAU.toFixed(3)} AU (${distanceKm.toFixed(0)} km)`;
            this.label.style.left = `${(screenPos.x * 0.5 + 0.5) * window.innerWidth}px`;
            this.label.style.top = `${(-screenPos.y * 0.5 + 0.5) * window.innerHeight}px`;
            this.label.style.display = 'block';
        }
    }

    toggle() {
        this.isActive = !this.isActive;
        if (!this.isActive) {
            this.line.visible = false;
            this.label.style.display = 'none';
            this.startPoint = null;
            this.endPoint = null;
        }
    }
}

