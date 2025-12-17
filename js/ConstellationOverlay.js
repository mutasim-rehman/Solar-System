// Constellation overlay with star catalog integration
import * as THREE from 'three';

export class ConstellationOverlay {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.constellations = new Map();
        this.stars = [];
        this.starField = null;
        this.visible = false;
        this.init();
    }

    async init() {
        await this.loadStarCatalog();
        this.createStarField();
        this.loadConstellations();
    }

    async loadStarCatalog() {
        // Load Hipparcos star catalog (simplified)
        // In production, load from actual catalog file
        const starData = [
            { ra: 0, dec: 0, mag: 2.0, name: 'Polaris' },
            { ra: 6.752, dec: -16.716, mag: -1.46, name: 'Sirius' },
            { ra: 5.242, dec: -8.201, mag: -0.72, name: 'Canopus' },
            { ra: 14.660, dec: -60.835, mag: -0.27, name: 'Alpha Centauri' },
            // Add more stars from catalog
        ];

        this.stars = starData.map(star => ({
            ...star,
            position: this.equatorialToCartesian(star.ra, star.dec, 10000)
        }));
    }

    equatorialToCartesian(ra, dec, distance) {
        // Convert equatorial coordinates to Cartesian
        const raRad = (ra * Math.PI) / 12; // Convert hours to radians
        const decRad = (dec * Math.PI) / 180;
        
        const x = distance * Math.cos(decRad) * Math.cos(raRad);
        const y = distance * Math.cos(decRad) * Math.sin(raRad);
        const z = distance * Math.sin(decRad);
        
        return new THREE.Vector3(x, y, z);
    }

    createStarField() {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.stars.length * 3);
        const colors = new Float32Array(this.stars.length * 3);
        const sizes = new Float32Array(this.stars.length);

        this.stars.forEach((star, i) => {
            const i3 = i * 3;
            positions[i3] = star.position.x;
            positions[i3 + 1] = star.position.y;
            positions[i3 + 2] = star.position.z;

            // Color based on magnitude (brighter = whiter)
            const brightness = Math.max(0.3, 1.0 - (star.mag + 2) / 10);
            colors[i3] = brightness;
            colors[i3 + 1] = brightness;
            colors[i3 + 2] = brightness;

            // Size based on magnitude
            sizes[i] = Math.max(1, 5 - star.mag);
        });

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
                    gl_PointSize = size * (300.0 / -mvPosition.z) * (1.0 + sin(time + position.x * 0.01) * 0.1);
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

        this.starField = new THREE.Points(geometry, material);
        this.starField.visible = this.visible;
        this.scene.add(this.starField);
    }

    loadConstellations() {
        // Define major constellations
        const constellationData = [
            {
                name: 'Orion',
                stars: [
                    { name: 'Betelgeuse', ra: 5.919, dec: 7.407 },
                    { name: 'Rigel', ra: 5.242, dec: -8.201 },
                    { name: 'Bellatrix', ra: 5.418, dec: 6.349 },
                    { name: 'Mintaka', ra: 5.533, dec: -0.299 },
                    { name: 'Alnilam', ra: 5.603, dec: -1.202 },
                    { name: 'Alnitak', ra: 5.679, dec: -1.943 }
                ],
                color: 0x4488ff
            },
            {
                name: 'Ursa Major',
                stars: [
                    { name: 'Dubhe', ra: 11.062, dec: 61.751 },
                    { name: 'Merak', ra: 11.031, dec: 56.382 },
                    { name: 'Phecda', ra: 11.897, dec: 53.695 },
                    { name: 'Megrez', ra: 12.257, dec: 57.033 },
                    { name: 'Alioth', ra: 12.900, dec: 55.960 },
                    { name: 'Mizar', ra: 13.398, dec: 54.925 },
                    { name: 'Alkaid', ra: 13.792, dec: 49.313 }
                ],
                color: 0x88aaff
            }
            // Add more constellations
        ];

        constellationData.forEach(constellation => {
            this.addConstellation(constellation);
        });
    }

    addConstellation(constellationData) {
        const { name, stars, color } = constellationData;
        
        // Create lines connecting stars
        const points = stars.map(star => {
            const pos = this.equatorialToCartesian(star.ra, star.dec, 10000);
            return pos;
        });

        // Create constellation lines (connect stars in order)
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3,
            linewidth: 1
        });
        const lines = new THREE.Line(lineGeometry, lineMaterial);
        lines.visible = this.visible;
        lines.name = `constellation_${name}`;

        // Add constellation name label
        const center = new THREE.Vector3();
        points.forEach(p => center.add(p));
        center.divideScalar(points.length);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'constellation-label';
        labelDiv.textContent = name;
        labelDiv.style.color = `#${color.toString(16).padStart(6, '0')}`;
        labelDiv.style.fontSize = '12px';
        labelDiv.style.fontWeight = 'bold';

        const { CSS2DObject } = require('three/addons/renderers/CSS2DRenderer.js');
        const label = new CSS2DObject(labelDiv);
        label.position.copy(center);
        lines.add(label);

        this.scene.add(lines);
        this.constellations.set(name, { lines, stars, color });
    }

    toggle(visible) {
        this.visible = visible;
        if (this.starField) {
            this.starField.visible = visible;
        }
        this.constellations.forEach(constellation => {
            constellation.lines.visible = visible;
        });
    }

    update(time) {
        if (this.starField && this.starField.material.uniforms) {
            this.starField.material.uniforms.time.value = time;
        }
    }
}

