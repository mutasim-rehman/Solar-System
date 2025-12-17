import * as THREE from 'three';

// Physically Based Rendering (PBR) material system
export class PBRMaterials {
    constructor(textureLoader) {
        this.textureLoader = textureLoader;
        this.materialCache = new Map();
    }

    createPBRMaterial(config) {
        const cacheKey = `${config.name}_${config.type}`;
        if (this.materialCache.has(cacheKey)) {
            return this.materialCache.get(cacheKey).clone();
        }

        const material = new THREE.MeshStandardMaterial({
            color: config.color || 0xffffff,
            roughness: config.roughness !== undefined ? config.roughness : 0.7,
            metalness: config.metalness !== undefined ? config.metalness : 0.1,
            envMapIntensity: config.envMapIntensity || 1.0,
            flatShading: config.flatShading || false
        });

        // Load textures
        const texturePromises = [];

        if (config.albedoMap) {
            texturePromises.push(
                this.loadTexture(config.albedoMap).then(texture => {
                    material.map = texture;
                    material.needsUpdate = true;
                })
            );
        }

        if (config.normalMap) {
            texturePromises.push(
                this.loadTexture(config.normalMap).then(texture => {
                    material.normalMap = texture;
                    material.normalScale = new THREE.Vector2(config.normalScale || 1, config.normalScale || 1);
                    material.needsUpdate = true;
                })
            );
        }

        if (config.roughnessMap) {
            texturePromises.push(
                this.loadTexture(config.roughnessMap).then(texture => {
                    material.roughnessMap = texture;
                    material.needsUpdate = true;
                })
            );
        }

        if (config.metalnessMap) {
            texturePromises.push(
                this.loadTexture(config.metalnessMap).then(texture => {
                    material.metalnessMap = texture;
                    material.needsUpdate = true;
                })
            );
        }

        if (config.aoMap) {
            texturePromises.push(
                this.loadTexture(config.aoMap).then(texture => {
                    material.aoMap = texture;
                    material.needsUpdate = true;
                })
            );
        }

        if (config.emissiveMap) {
            texturePromises.push(
                this.loadTexture(config.emissiveMap).then(texture => {
                    material.emissiveMap = texture;
                    material.emissive = config.emissive || new THREE.Color(0x000000);
                    material.emissiveIntensity = config.emissiveIntensity || 1.0;
                    material.needsUpdate = true;
                })
            );
        }

        Promise.all(texturePromises).then(() => {
            this.materialCache.set(cacheKey, material);
        });

        return material;
    }

    createPlanetPBR(planetData) {
        return this.createPBRMaterial({
            name: planetData.name,
            type: 'planet',
            color: planetData.color || 0xffffff,
            roughness: planetData.roughness || 0.8,
            metalness: planetData.metalness || 0.0,
            albedoMap: planetData.texture,
            normalMap: planetData.normalMap,
            roughnessMap: planetData.roughnessMap,
            aoMap: planetData.aoMap,
            emissiveMap: planetData.emissiveMap,
            emissive: planetData.emissive,
            emissiveIntensity: planetData.emissiveIntensity || 0
        });
    }

    createSpacecraftPBR(spacecraftData) {
        return this.createPBRMaterial({
            name: spacecraftData.name,
            type: 'spacecraft',
            color: 0x888888,
            roughness: 0.3,
            metalness: 0.8,
            albedoMap: spacecraftData.texture,
            normalMap: spacecraftData.normalMap,
            roughnessMap: spacecraftData.roughnessMap,
            metalnessMap: spacecraftData.metalnessMap
        });
    }

    loadTexture(url) {
        return new Promise((resolve, reject) => {
            if (!url) {
                resolve(null);
                return;
            }
            
            this.textureLoader.load(
                url,
                (texture) => {
                    texture.wrapS = THREE.RepeatWrapping;
                    texture.wrapT = THREE.RepeatWrapping;
                    resolve(texture);
                },
                undefined,
                (error) => {
                    console.warn(`Failed to load texture: ${url}`, error);
                    resolve(null);
                }
            );
        });
    }

    createEnvironmentMap(scene) {
        // Create a simple environment map for reflections
        const envMap = new THREE.CubeTextureLoader().load([
            'textures/env/px.jpg', 'textures/env/nx.jpg',
            'textures/env/py.jpg', 'textures/env/ny.jpg',
            'textures/env/pz.jpg', 'textures/env/nz.jpg'
        ]);
        
        scene.environment = envMap;
        scene.background = new THREE.Color(0x000000);
        
        return envMap;
    }
}

