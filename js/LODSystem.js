import * as THREE from 'three';

// Level of Detail (LOD) system for performance optimization
export class LODSystem {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.lodLevels = {
            HIGH: 0,    // Close-up: Full detail
            MEDIUM: 1,  // Medium distance: Reduced detail
            LOW: 2,     // Far distance: Minimal detail
            BILLBOARD: 3 // Very far: 2D sprite
        };
        this.distanceThresholds = {
            HIGH: 1000,
            MEDIUM: 5000,
            LOW: 20000,
            BILLBOARD: 50000
        };
        this.objectLODs = new Map();
    }

    updateLOD(object, cameraPosition) {
        const distance = cameraPosition.distanceTo(object.position);
        let lodLevel = this.lodLevels.HIGH;
        
        if (distance > this.distanceThresholds.BILLBOARD) {
            lodLevel = this.lodLevels.BILLBOARD;
        } else if (distance > this.distanceThresholds.LOW) {
            lodLevel = this.lodLevels.LOW;
        } else if (distance > this.distanceThresholds.MEDIUM) {
            lodLevel = this.lodLevels.MEDIUM;
        }
        
        const currentLOD = this.objectLODs.get(object);
        if (currentLOD !== lodLevel) {
            this.applyLOD(object, lodLevel);
            this.objectLODs.set(object, lodLevel);
        }
    }

    applyLOD(object, lodLevel) {
        if (!object.userData || !object.userData.originalGeometry) {
            // Store original geometry if not already stored
            if (object.geometry) {
                object.userData = object.userData || {};
                object.userData.originalGeometry = object.geometry;
                object.userData.originalMaterial = object.material;
            }
        }

        const originalGeometry = object.userData?.originalGeometry;
        if (!originalGeometry) return;

        switch(lodLevel) {
            case this.lodLevels.HIGH:
                // Use original geometry
                if (object.geometry !== originalGeometry) {
                    object.geometry = originalGeometry;
                    object.geometry.needsUpdate = true;
                }
                break;
                
            case this.lodLevels.MEDIUM:
                // Reduce segments by 50%
                this.applyMediumLOD(object, originalGeometry);
                break;
                
            case this.lodLevels.LOW:
                // Minimal geometry
                this.applyLowLOD(object, originalGeometry);
                break;
                
            case this.lodLevels.BILLBOARD:
                // 2D sprite representation
                this.applyBillboardLOD(object);
                break;
        }
    }

    applyMediumLOD(object, originalGeometry) {
        if (originalGeometry.type === 'SphereGeometry') {
            const radius = originalGeometry.parameters.radius;
            const widthSegments = Math.max(16, Math.floor(originalGeometry.parameters.widthSegments / 2));
            const heightSegments = Math.max(8, Math.floor(originalGeometry.parameters.heightSegments / 2));
            
            if (!object.userData.mediumGeometry) {
                object.userData.mediumGeometry = new THREE.SphereGeometry(
                    radius, widthSegments, heightSegments
                );
            }
            object.geometry = object.userData.mediumGeometry;
        }
    }

    applyLowLOD(object, originalGeometry) {
        if (originalGeometry.type === 'SphereGeometry') {
            const radius = originalGeometry.parameters.radius;
            
            if (!object.userData.lowGeometry) {
                object.userData.lowGeometry = new THREE.SphereGeometry(radius, 8, 6);
            }
            object.geometry = object.userData.lowGeometry;
        }
    }

    applyBillboardLOD(object) {
        // Create a simple 2D sprite for very distant objects
        if (!object.userData.billboard) {
            const spriteMaterial = new THREE.SpriteMaterial({
                map: this.createBillboardTexture(object),
                transparent: true,
                opacity: 0.8
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(50, 50, 1);
            object.userData.billboard = sprite;
            object.userData.billboardOriginal = object.visible;
        }
        
        // Hide original, show billboard
        object.visible = false;
        if (object.parent && !object.parent.getObjectByName('billboard')) {
            object.userData.billboard.name = 'billboard';
            object.parent.add(object.userData.billboard);
        }
        object.userData.billboard.visible = true;
    }

    createBillboardTexture(object) {
        // Create a simple colored circle texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        
        // Get object color
        const color = object.material?.color || new THREE.Color(0xffffff);
        const hex = color.getHex();
        const r = (hex >> 16) & 255;
        const g = (hex >> 8) & 255;
        const b = hex & 255;
        
        // Draw circle
        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.beginPath();
        ctx.arc(32, 32, 30, 0, Math.PI * 2);
        ctx.fill();
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    updateAll(cameraPosition) {
        // Update LOD for all celestial bodies
        this.solarSystem.celestialBodies.forEach(body => {
            if (body.mesh) {
                this.updateLOD(body.mesh, cameraPosition);
            }
        });
        
        // Update LOD for spacecraft
        this.solarSystem.spacecraft.forEach(craft => {
            if (craft.model) {
                this.updateLOD(craft.model, cameraPosition);
            }
        });
    }

    resetLOD(object) {
        if (object.userData?.originalGeometry) {
            object.geometry = object.userData.originalGeometry;
            object.geometry.needsUpdate = true;
        }
        
        if (object.userData?.billboard) {
            object.userData.billboard.visible = false;
            object.visible = object.userData.billboardOriginal !== false;
        }
        
        this.objectLODs.delete(object);
    }
}

