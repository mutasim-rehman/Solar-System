import * as THREE from 'three';

// Advanced particle systems for solar flares, comet tails, etc.
export class ParticleSystems {
    constructor(scene) {
        this.scene = scene;
        this.systems = new Map();
    }

    createSolarFlare(sun, intensity = 1.0) {
        const particleCount = 1000;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        const velocities = new Float32Array(particleCount * 3);
        
        const color = new THREE.Color(0xffff00);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Random position around sun
            const radius = 50 + Math.random() * 100;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            
            positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = radius * Math.cos(phi);
            
            // Velocity (outward from sun)
            const speed = 0.5 + Math.random() * 2.0;
            velocities[i3] = positions[i3] * speed * 0.01;
            velocities[i3 + 1] = positions[i3 + 1] * speed * 0.01;
            velocities[i3 + 2] = positions[i3 + 2] * speed * 0.01;
            
            // Color (yellow to orange)
            const hue = 0.1 + Math.random() * 0.1;
            color.setHSL(hue, 1.0, 0.5);
            colors[i3] = color.r;
            colors[i3 + 1] = color.g;
            colors[i3 + 2] = color.b;
            
            sizes[i] = 2 + Math.random() * 4;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 },
                intensity: { value: intensity }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                    float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
                    gl_FragColor = vec4(vColor, alpha);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.userData.velocities = velocities;
        particles.userData.type = 'solarFlare';
        
        sun.add(particles);
        this.systems.set('solarFlare', particles);
        
        return particles;
    }

    createCometTail(comet, length = 100, particleCount = 5000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);
        
        const color = new THREE.Color(0xaaffff);
        
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            
            // Position along tail
            const t = Math.random();
            const tailLength = length * (1 - t * t);
            const spread = tailLength * 0.1;
            
            positions[i3] = -tailLength + (Math.random() - 0.5) * spread;
            positions[i3 + 1] = (Math.random() - 0.5) * spread;
            positions[i3 + 2] = (Math.random() - 0.5) * spread;
            
            // Color (blue-white, fading)
            const brightness = 0.5 + t * 0.5;
            colors[i3] = color.r * brightness;
            colors[i3 + 1] = color.g * brightness;
            colors[i3 + 2] = color.b * brightness;
            
            sizes[i] = 1 + Math.random() * 2;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.ShaderMaterial({
            uniforms: {
                time: { value: 0 }
            },
            vertexShader: `
                attribute float size;
                attribute vec3 color;
                varying vec3 vColor;
                uniform float time;
                
                void main() {
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                varying vec3 vColor;
                
                void main() {
                    float distanceToCenter = distance(gl_PointCoord, vec2(0.5));
                    float alpha = 1.0 - smoothstep(0.0, 0.5, distanceToCenter);
                    gl_FragColor = vec4(vColor, alpha * 0.8);
                }
            `,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            vertexColors: true
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.userData.type = 'cometTail';
        
        comet.add(particles);
        this.systems.set(`cometTail_${comet.uuid}`, particles);
        
        return particles;
    }

    createAsteroidField(center, radius, count = 10000) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            
            // Random position in sphere
            const r = Math.random() * radius;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            
            positions[i3] = center.x + r * Math.sin(phi) * Math.cos(theta);
            positions[i3 + 1] = center.y + r * Math.sin(phi) * Math.sin(theta);
            positions[i3 + 2] = center.z + r * Math.cos(phi);
            
            // Gray color
            const gray = 0.3 + Math.random() * 0.4;
            colors[i3] = gray;
            colors[i3 + 1] = gray;
            colors[i3 + 2] = gray;
            
            sizes[i] = 0.5 + Math.random() * 1.5;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
        
        const material = new THREE.PointsMaterial({
            size: 1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        const particles = new THREE.Points(geometry, material);
        particles.userData.type = 'asteroidField';
        
        this.scene.add(particles);
        this.systems.set('asteroidField', particles);
        
        return particles;
    }

    update(deltaTime) {
        this.systems.forEach((system, key) => {
            if (system.userData.type === 'solarFlare' && system.material.uniforms) {
                system.material.uniforms.time.value += deltaTime;
                
                // Update positions
                const positions = system.geometry.attributes.position;
                const velocities = system.userData.velocities;
                
                for (let i = 0; i < positions.count; i++) {
                    const i3 = i * 3;
                    positions.array[i3] += velocities[i3] * deltaTime;
                    positions.array[i3 + 1] += velocities[i3 + 1] * deltaTime;
                    positions.array[i3 + 2] += velocities[i3 + 2] * deltaTime;
                }
                
                positions.needsUpdate = true;
            }
        });
    }

    dispose() {
        this.systems.forEach(system => {
            system.geometry.dispose();
            system.material.dispose();
            if (system.parent) {
                system.parent.remove(system);
            } else {
                this.scene.remove(system);
            }
        });
        this.systems.clear();
    }
}

