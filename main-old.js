        import * as THREE from 'three';
        import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
        import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
        import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
        import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

        // --- SCALING & ACCURACY CONSTANTS ---
        const PLANET_SIZE_SCALE = 1 / 5000;
        const SUN_VISUAL_SCALE = 0.05;
        const AU_IN_UNITS = 500;
        const MOON_DISTANCE_SCALE = PLANET_SIZE_SCALE * 0.3;
        const MIN_SPACECRAFT_SCALE = 0.002;
        const COMET_SCALE = 0.5;

        class SolarSystem3D {
            constructor() {
                this.container = document.getElementById('canvas-container');
                this.scene = new THREE.Scene();
                this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000000);
                this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });

                this.labelRenderer = new CSS2DRenderer();

                this.initLoadingManager();

                this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
                this.textureLoader = new THREE.TextureLoader(this.loadingManager);

                this.gltfLoader = new GLTFLoader(this.loadingManager);
                const dracoLoader = new DRACOLoader();
                dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
                this.gltfLoader.setDRACOLoader(dracoLoader);

                this.clock = new THREE.Clock();

                // State
                this.celestialBodies = [];
                this.spacecraft = [];
                this.comets = [];
                this.realTimePositions = new Map();
                this.timeScale = 1;
                this.isPaused = false;
                this.isRealTime = true;
                this.isOrbitsVisible = true;
                this.isLabelsVisible = false;
                this.showPlanets = true;
                this.showMoons = true;
                this.showSpacecraft = true;
                this.showComets = false;
                this.focusTarget = null;
                this.lastFocusPosition = null;
                this.nasaApiKey = null;
                this.apiConnected = false;
                this.currentDate = new Date();
                this.simulationStartDate = new Date();
                this.panelsVisible = true;

                this.init();
            }

            initLoadingManager() {
                const loadingOverlay = document.getElementById('loading-overlay');
                const progressBar = document.getElementById('progress-bar');
                const loadingText = document.getElementById('loading-text');

                this.loadingManager = new THREE.LoadingManager();

                this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
                    const progress = (itemsLoaded / itemsTotal) * 100;
                    progressBar.style.width = `${progress}%`;
                    const fileName = url.split('/').pop();
                    loadingText.textContent = `LOADING: ${fileName}`;
                };

                this.loadingManager.onLoad = () => {
                    loadingText.textContent = 'ESTABLISHING NASA CONNECTION...';

                    setTimeout(() => {
                        loadingOverlay.style.opacity = '0';
                        document.getElementById('canvas-container').style.opacity = '1';
                        document.getElementById('ui-overlay').style.opacity = '1';

                        loadingOverlay.addEventListener('transitionend', () => {
                            loadingOverlay.style.display = 'none';
                            this.checkApiModal();
                        });
                    }, 500);
                };

                this.loadingManager.onError = (url) => {
                    console.error(`Error loading ${url}`);
                    loadingText.textContent = `ERROR: ${url.split('/').pop()}`;
                    progressBar.style.background = '#ff6b6b';
                };
            }

            init() {
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.renderer.setPixelRatio(window.devicePixelRatio);
                this.container.appendChild(this.renderer.domElement);

                this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
                this.labelRenderer.domElement.style.position = 'absolute';
                this.labelRenderer.domElement.style.top = '0px';
                this.container.appendChild(this.labelRenderer.domElement);

                this.camera.position.set(0, 2500, 9000);
                this.controls.enableDamping = true;
                this.controls.maxDistance = 500000;

                this.scene.add(new THREE.AmbientLight(0x404040, 0.3));
                const hemiLight = new THREE.HemisphereLight(0x404040, 0x202040, 0.2);
                this.scene.add(hemiLight);

                this.textureLoader.setCrossOrigin('anonymous');

                this.createStarfield();
                this.createSolarSystem();
                this.createMainAsteroidBelt();
                this.createComets();

                this.initUI();
                this.initApiModal();
                this.updateDateDisplay();
                this.setMode('Simulation');

                window.addEventListener('resize', () => this.onWindowResize());
                this.animate();
            }

            checkApiModal() {
                const storedApiKey = localStorage.getItem('nasaApiKey');
                if (!storedApiKey) {
                    const apiKeyModal = document.getElementById('api-key-modal');
                    apiKeyModal.style.visibility = 'visible';
                    apiKeyModal.style.opacity = '1';
                }
            }

            initApiModal() {
                const apiKeyModal = document.getElementById('api-key-modal');
                const apiKeyInput = document.getElementById('api-key-input');
                const apiKeySubmit = document.getElementById('api-key-submit');

                const storedApiKey = localStorage.getItem('nasaApiKey');
                if (storedApiKey) {
                    this.nasaApiKey = storedApiKey;
                    this.connectToNasaApi();
                }

                apiKeySubmit.addEventListener('click', () => {
                    const key = apiKeyInput.value.trim();
                    if (key) {
                        this.nasaApiKey = key;
                        localStorage.setItem('nasaApiKey', key);
                        this.connectToNasaApi();
                        apiKeyModal.style.opacity = '0';
                        apiKeyModal.addEventListener('transitionend', () => apiKeyModal.style.visibility = 'hidden', { once: true });
                    }
                });

                apiKeyInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') apiKeySubmit.click();
                });
            }

            async connectToNasaApi() {
                if (!this.nasaApiKey) return;

                try {
                    const testUrl = `https://api.nasa.gov/planetary/apod?api_key=${this.nasaApiKey}`;
                    const response = await fetch(testUrl);

                    if (response.ok) {
                        this.apiConnected = true;
                        const apiStatus = document.getElementById('api-status');
                        apiStatus.querySelector('.status-indicator').classList.add('connected');
                        apiStatus.querySelector('span').textContent = 'NASA API: Connected';
                        document.getElementById('last-update').textContent = new Date().toLocaleTimeString();
                        await this.fetchRealTimeData();
                        await this.fetchSpacecraftData();
                        this.updateMissionStatus();
                    } else {
                        throw new Error('API key invalid');
                    }
                } catch (error) {
                    console.error('Failed to connect to NASA API:', error);
                    this.apiConnected = false;
                    document.getElementById('last-update').textContent = 'Connection Failed';
                }
            }

            async fetchRealTimeData() {
                if (!this.apiConnected) return;

                try {
                    const now = new Date();
                    const J2000 = new Date('2000-01-01T12:00:00Z');
                    const daysSinceJ2000 = (now - J2000) / (1000 * 60 * 60 * 24);

                    const planetData = [
                        { name: 'Mercury', period: 87.97, distance: 0.387, eccentricity: 0.205 },
                        { name: 'Venus', period: 224.7, distance: 0.723, eccentricity: 0.007 },
                        { name: 'Earth', period: 365.25, distance: 1.0, eccentricity: 0.017 },
                        { name: 'Mars', period: 687, distance: 1.52, eccentricity: 0.094 },
                        { name: 'Jupiter', period: 4331, distance: 5.20, eccentricity: 0.049 },
                        { name: 'Saturn', period: 10747, distance: 9.58, eccentricity: 0.057 },
                        { name: 'Uranus', period: 30589, distance: 19.22, eccentricity: 0.046 },
                        { name: 'Neptune', period: 59800, distance: 30.05, eccentricity: 0.011 }
                    ];

                    planetData.forEach(planet => {
                        const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / planet.period;
                        const trueAnomaly = meanAnomaly + (2 * planet.eccentricity * Math.sin(meanAnomaly));

                        const distance = planet.distance * AU_IN_UNITS;
                        const x = Math.cos(trueAnomaly) * distance;
                        const z = Math.sin(trueAnomaly) * distance;

                        this.realTimePositions.set(planet.name, { x, z, angle: trueAnomaly });
                    });

                } catch (error) {
                    console.error('Failed to fetch real-time data:', error);
                }
            }

            async fetchSpacecraftData() {
                if (!this.apiConnected) return;

                // Real-world radii for Earth and spacecraft altitudes (in km)
                const earthRadiusKm = 6371;
                const issAltitudeKm = 408;
                const hubbleAltitudeKm = 540;

                // Scaled orbital radii
                const issOrbitRadius = (earthRadiusKm + issAltitudeKm) * PLANET_SIZE_SCALE;
                const hubbleOrbitRadius = (earthRadiusKm + hubbleAltitudeKm) * PLANET_SIZE_SCALE;

                const spacecraftList = [
                    { name: 'OSIRIS-REx', modelFile: 'models/OSIRIS-REx.glb', scale: 0.00000049, orbit: { semiMajorAxis: 1.1, eccentricity: 0.2, inclination: 4, period: 1.2 } },
                    { name: 'Parker Solar Probe', modelFile: 'models/Parker Solar Probe.glb', scale: 0.00000024, orbit: { semiMajorAxis: 0.6, eccentricity: 0.9, inclination: 3, period: 0.3 } },
                    { name: 'New Horizons', modelFile: 'models/New_Horizons.glb', scale: 0.0000016, orbit: { semiMajorAxis: 39.5, eccentricity: 0.2, inclination: 2, period: 248 } },
                    { name: 'Voyager 1', modelFile: 'models/Voyager Probe (A).glb', scale: 0.00000029, orbit: { semiMajorAxis: 150, eccentricity: 0.3, inclination: 35, period: 17000 } },
                    { name: 'Voyager 2', modelFile: 'models/Voyager Probe (B).glb', scale: 0.00000029, orbit: { semiMajorAxis: 120, eccentricity: 0.4, inclination: 30, period: 15000 } },
                    { name: 'James Webb', modelFile: 'models/James Webb Space Telescope (B).glb', scale: 0.00000165, orbit: { semiMajorAxis: 1.01, eccentricity: 0.01, inclination: 5, period: 1.02 } },
                    { name: 'Hubble', modelFile: 'models/Hubble Space Telescope (A).glb', scale: 0.0000000025, parent: 'Earth', orbit: { semiMajorAxis: hubbleOrbitRadius, period: 1.6 / 24 } },
                    { name: 'ISS', modelFile: 'models/International Space Station (ISS) (A).glb', scale: 0.0000000855, parent: 'Earth', orbit: { semiMajorAxis: issOrbitRadius, period: 1.5 / 24 } },
                    { name: 'Gateway', modelFile: 'models/Gateway Core.glb', scale: 0.00000012, parent: 'Moon', orbit: { semiMajorAxis: 0.00257, eccentricity: 0.75, inclination: 7, period: 7 } }
                ];

                for (const craft of spacecraftList) {
                    try {
                        await this.loadSpacecraftModel(craft);
                    } catch (error) {
                        console.error(`Failed to load data for ${craft.name}:`, error);
                        this.createSpacecraftPlaceholder(craft);
                    }
                }
            }

            updateMissionStatus() {
                const totalObjects = this.celestialBodies.length + this.spacecraft.length + this.comets.length;
                document.getElementById('object-count').textContent = totalObjects;
                document.getElementById('spacecraft-count').textContent = this.spacecraft.length;
                document.getElementById('comet-count').textContent = this.comets.length;
                document.getElementById('data-source').textContent = this.apiConnected ? 'NASA/JPL (Live)' : 'Simulation';
            }

            async loadSpacecraftModel(craft) {
                return new Promise((resolve, reject) => {
                    this.gltfLoader.load(craft.modelFile, (gltf) => {
                        const model = gltf.scene;
                        const intendedScale = craft.scale || 0.5;
                        const finalScale = Math.max(intendedScale, MIN_SPACECRAFT_SCALE);
                        model.scale.setScalar(finalScale);

                        const labelDiv = document.createElement('div');
                        labelDiv.className = 'planet-label';
                        labelDiv.textContent = craft.name;
                        const label = new CSS2DObject(labelDiv);
                        label.position.set(0, 10, 0);
                        model.add(label);

                        const spacecraftData = {
                            name: craft.name,
                            model: model,
                            label: label,
                            type: 'spacecraft',
                            data: {
                                speed: 1 / (craft.orbit.period * 365.25),
                                ...craft.orbit
                            }
                        };

                        const parentBody = this.celestialBodies.find(b => b.name === craft.parent);

                        if (parentBody) {
                            const pivot = new THREE.Object3D();
                            parentBody.mesh.add(pivot);
                            model.position.x = craft.orbit.semiMajorAxis;
                            pivot.add(model);
                            spacecraftData.pivot = pivot;
                        } else {
                            const distance = craft.orbit.semiMajorAxis * AU_IN_UNITS;
                            const angle = Math.random() * Math.PI * 2;
                            model.position.x = Math.cos(angle) * distance;
                            model.position.z = Math.sin(angle) * distance;
                            this.scene.add(model);
                            spacecraftData.data.distance = distance;
                            spacecraftData.data.angle = angle;
                        }

                        this.spacecraft.push(spacecraftData);
                        resolve();

                    }, undefined, (error) => {
                        console.warn(`Failed to load GLTF model for ${craft.name}:`, error);
                        reject(error);
                    });
                });
            }

            createSpacecraftPlaceholder(craft) {
                const geometry = new THREE.SphereGeometry(2, 8, 6);
                const material = new THREE.MeshStandardMaterial({ color: 0x888888, emissive: 0x444444, emissiveIntensity: 0.5 });
                const mesh = new THREE.Mesh(geometry, material);

                const distance = craft.orbit.semiMajorAxis * AU_IN_UNITS;
                const angle = Math.random() * Math.PI * 2;
                mesh.position.x = Math.cos(angle) * distance;
                mesh.position.z = Math.sin(angle) * distance;
                this.scene.add(mesh);

                const labelDiv = document.createElement('div');
                labelDiv.className = 'planet-label';
                labelDiv.textContent = craft.name + ' (Placeholder)';
                const label = new CSS2DObject(labelDiv);
                label.position.set(0, 5, 0);
                mesh.add(label);

                this.spacecraft.push({
                    name: craft.name,
                    model: mesh,
                    label: label,
                    type: 'spacecraft',
                    data: {
                        distance: distance, angle: angle, speed: 1 / (craft.orbit.period * 365.25),
                        semiMajorAxis: craft.orbit.semiMajorAxis, eccentricity: craft.orbit.eccentricity,
                        inclination: craft.orbit.inclination
                    }
                });
            }

            createStarfield() {
                const starVertices = [];
                for (let i = 0; i < 20000; i++) {
                    const x = THREE.MathUtils.randFloatSpread(500000);
                    const y = THREE.MathUtils.randFloatSpread(500000);
                    const z = THREE.MathUtils.randFloatSpread(500000);
                    starVertices.push(x, y, z);
                }
                const starGeometry = new THREE.BufferGeometry();
                starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
                const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2.5, transparent: true, opacity: 0.8 });
                const stars = new THREE.Points(starGeometry, starMaterial);
                this.scene.add(stars);
            }

            createMainAsteroidBelt() {
                const beltParticles = 25000;
                const positions = [];
                this.asteroidData = [];
                const innerRadius = 2.2 * AU_IN_UNITS;
                const outerRadius = 3.2 * AU_IN_UNITS;
                const beltThickness = 25;

                for (let i = 0; i < beltParticles; i++) {
                    const dist = THREE.MathUtils.randFloat(innerRadius, outerRadius);
                    const angle = THREE.MathUtils.randFloat(0, 2 * Math.PI);
                    const speed = (Math.random() * 0.05 + 0.01) * (innerRadius / dist);
                    this.asteroidData.push({ radius: dist, angle: angle, speed: speed });
                    const y = THREE.MathUtils.randFloatSpread(beltThickness);
                    const x = Math.cos(angle) * dist;
                    const z = Math.sin(angle) * dist;
                    positions.push(x, y, z);
                }

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                const material = new THREE.PointsMaterial({ color: 0xa0a0a0, size: 0.75, transparent: true, opacity: 0.7 });
                this.mainBelt = new THREE.Points(geometry, material);
                this.scene.add(this.mainBelt);
            }

            createComets() {
                const cometData = [
                    { name: "Halley's Comet", distance: 17.8, eccentricity: 0.967, inclination: 162, period: 76 },
                    { name: 'Comet Hale-Bopp', distance: 186, eccentricity: 0.995, inclination: 89, period: 2533 },
                    { name: 'Comet Encke', distance: 2.2, eccentricity: 0.848, inclination: 12, period: 3.3 },
                    { name: 'Comet Swift-Tuttle', distance: 26, eccentricity: 0.963, inclination: 113, period: 133 },
                    { name: 'Comet Hyakutake', distance: 34, eccentricity: 0.999, inclination: 124, period: 15000 }
                ];

                cometData.forEach(comet => {
                    // Create comet nucleus (sphere)
                    const nucleusGeometry = new THREE.SphereGeometry(COMET_SCALE * 2, 16, 12);
                    const nucleusMaterial = new THREE.MeshStandardMaterial({
                        color: 0x444444,
                        roughness: 0.9,
                        metalness: 0.1
                    });
                    const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);

                    // Create coma (larger, transparent sphere)
                    const comaGeometry = new THREE.SphereGeometry(COMET_SCALE * 8, 16, 12);
                    const comaMaterial = new THREE.MeshStandardMaterial({
                        color: 0xaaffff,
                        transparent: true,
                        opacity: 0.3,
                        emissive: 0x002244,
                        emissiveIntensity: 0.1
                    });
                    const coma = new THREE.Mesh(comaGeometry, comaMaterial);
                    nucleus.add(coma);

                    // Create tail (elongated cone pointing away from sun)
                    const tailGeometry = new THREE.ConeGeometry(COMET_SCALE * 3, COMET_SCALE * 30, 8);
                    const tailMaterial = new THREE.MeshBasicMaterial({
                        color: 0x88ddff,
                        transparent: true,
                        opacity: 0.2
                    });
                    const tail = new THREE.Mesh(tailGeometry, tailMaterial);
                    tail.rotation.z = Math.PI / 2;
                    tail.position.x = COMET_SCALE * 15;
                    nucleus.add(tail);

                    // Position in orbit
                    const distance = comet.distance * AU_IN_UNITS;
                    const angle = Math.random() * Math.PI * 2;
                    nucleus.position.x = Math.cos(angle) * distance;
                    nucleus.position.z = Math.sin(angle) * distance;

                    // Add orbital plane rotation for inclination
                    const orbitalPlane = new THREE.Object3D();
                    orbitalPlane.rotation.x = THREE.MathUtils.degToRad(comet.inclination);
                    orbitalPlane.add(nucleus);
                    this.scene.add(orbitalPlane);

                    // Create elliptical orbit
                    const a = distance;
                    const e = comet.eccentricity;
                    const c = a * e;
                    const b = a * Math.sqrt(1 - e * e);

                    const curve = new THREE.EllipseCurve(c, 0, a, b, 0, 2 * Math.PI, false, 0);
                    const points = curve.getPoints(500);
                    const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
                    const orbitMaterial = new THREE.LineBasicMaterial({
                        color: 0x66aaff,
                        transparent: true,
                        opacity: 0.3
                    });
                    const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
                    orbitLine.rotation.x = Math.PI / 2;
                    orbitalPlane.add(orbitLine);

                    // Add label
                    const labelDiv = document.createElement('div');
                    labelDiv.className = 'planet-label';
                    labelDiv.textContent = comet.name;
                    labelDiv.style.fontSize = '10px';
                    const label = new CSS2DObject(labelDiv);
                    label.position.set(0, COMET_SCALE * 12, 0);
                    nucleus.add(label);

                    const cometObj = {
                        name: comet.name,
                        mesh: nucleus,
                        tail: tail,
                        orbit: orbitLine,
                        label: label,
                        plane: orbitalPlane,
                        type: 'comet',
                        data: {
                            distance: distance,
                            eccentricity: comet.eccentricity,
                            orbitalSpeed: 1 / comet.period,
                            angle: angle,
                            inclination: comet.inclination
                        }
                    };

                    this.comets.push(cometObj);
                });
            }

            createParticleRings(config) {
                const ringGroup = new THREE.Group();
                const particleCount = config.particleCount || 8000;
                const positions = [];
                const colors = [];

                for (let i = 0; i < particleCount; i++) {
                    const radius = THREE.MathUtils.lerp(config.inner, config.outer, Math.pow(Math.random(), 0.5));
                    const angle = Math.random() * Math.PI * 2;
                    const height = (Math.random() - 0.5) * (config.outer - config.inner) * 0.02;
                    positions.push(Math.cos(angle) * radius, height, Math.sin(angle) * radius);
                    colors.push(config.color.r, config.color.g, config.color.b);
                }

                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

                const material = new THREE.PointsMaterial({
                    size: config.particleSize || 0.8,
                    sizeAttenuation: true,
                    vertexColors: true,
                    transparent: true,
                    opacity: config.opacity || 0.7,
                    blending: THREE.AdditiveBlending
                });

                ringGroup.add(new THREE.Points(geometry, material));
                return ringGroup;
            }

            createCelestialBody(config) {
                const orbitalPlane = new THREE.Object3D();
                if (config.inclination) {
                    orbitalPlane.rotation.x = THREE.MathUtils.degToRad(config.inclination);
                }
                this.scene.add(orbitalPlane);

                const geometry = new THREE.SphereGeometry(config.radius, 64, 32);
                let material;

                material = config.emissive
                    ? new THREE.MeshBasicMaterial({ color: 0xffffff })
                    : new THREE.MeshStandardMaterial({ color: 0x888888 });

                if (config.texture) {
                    this.textureLoader.load(config.texture,
                        (texture) => {
                                material = config.emissive
                                    ? new THREE.MeshBasicMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture })
                                    : new THREE.MeshStandardMaterial({ map: texture });
                                mesh.material = material;
                        },
                        undefined, (err) => console.warn(`Could not load texture for ${config.name}: ${config.texture}`)
                    );
                }

                const mesh = new THREE.Mesh(geometry, material);
                if (config.axialTilt) {
                    mesh.rotation.z = THREE.MathUtils.degToRad(config.axialTilt);
                }
                orbitalPlane.add(mesh);

                if (config.rings) {
                    const ringSystem = this.createParticleRings(config.rings);
                    mesh.add(ringSystem);
                }

                const a = config.distance;
                const e = config.eccentricity || 0;
                const c = a * e;
                const b = a * Math.sqrt(1 - e*e);

                const curve = new THREE.EllipseCurve(c, 0, a, b, 0, 2 * Math.PI, false, 0);
                const points = curve.getPoints(200);
                const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
                const orbitMaterial = new THREE.LineBasicMaterial({
                    color: config.orbitColor || 0xaaaaaa,
                    transparent: true,
                    opacity: 0.4
                });
                const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
                orbitLine.rotation.x = Math.PI / 2;
                if (config.distance > 0) orbitalPlane.add(orbitLine);

                const labelDiv = document.createElement('div');
                labelDiv.className = 'planet-label';
                labelDiv.textContent = config.name;
                const label = new CSS2DObject(labelDiv);
                label.position.set(0, config.radius * 1.5, 0);
                mesh.add(label);

                const body = {
                    name: config.name, mesh, orbit: orbitLine, label,
                    plane: orbitalPlane, data: config, type: config.type || 'planet',
                    currentAngle: Math.random() * 2 * Math.PI
                };
                this.celestialBodies.push(body);
                return body;
            }

            createSolarSystem() {
                // --- MODIFIED with local textures and new orbit colors ---
                const solarSystemData = [
                    { name: 'Sun', texture: 'textures/sun.png', real: { radius: 695700, rotationPeriod: 27 }, emissive: true, type: 'star' },
                    { name: 'Mercury', texture: 'textures/mercury.jpg', real: { radius: 2439.7, distance: 0.387, orbitPeriod: 88, rotationPeriod: 58.6, tilt: 0.03, ecc: 0.205, incl: 7.0 }, orbitColor: 0x8c8c8c, type: 'planet' },
                    { name: 'Venus', texture: 'textures/venus.jpg', real: { radius: 6051.8, distance: 0.723, orbitPeriod: 224.7, rotationPeriod: -243, tilt: 177.4, ecc: 0.007, incl: 3.4 }, orbitColor: 0xd9a648, type: 'planet' },
                    { name: 'Earth', texture: 'textures/earth.jpg', real: { radius: 6371, distance: 1, orbitPeriod: 365.2, rotationPeriod: 1, tilt: 23.44, ecc: 0.017, incl: 0.0 }, orbitColor: 0x4b71d9, type: 'planet' },
                    { name: 'Mars', texture: 'textures/mars.jpg', real: { radius: 3389.5, distance: 1.52, orbitPeriod: 687, rotationPeriod: 1.03, tilt: 25.19, ecc: 0.094, incl: 1.8 }, orbitColor: 0xd95b43, type: 'planet' },
                    { name: 'Jupiter', texture: 'textures/jupiter.jpg', real: { radius: 69911, distance: 5.20, orbitPeriod: 4331, rotationPeriod: 0.41, tilt: 3.13, ecc: 0.049, incl: 1.3 }, rings: { innerKm: 92000, outerKm: 129000, color: {r:0.5,g:0.4,b:0.3}, opacity: 0.3, particleCount: 2000 }, orbitColor: 0xc7894f, type: 'planet' },
                    { name: 'Saturn', texture: 'textures/saturn.jpg', real: { radius: 58232, distance: 9.58, orbitPeriod: 10747, rotationPeriod: 0.44, tilt: 26.73, ecc: 0.057, incl: 2.5 }, rings: { innerKm: 74500, outerKm: 140220, color: {r:0.8,g:0.7,b:0.6} }, orbitColor: 0xbab178, type: 'planet' },
                    { name: 'Uranus', texture: 'textures/uranus.jpg', real: { radius: 25362, distance: 19.22, orbitPeriod: 30589, rotationPeriod: -0.72, tilt: 97.77, ecc: 0.046, incl: 0.8 }, rings: { innerKm: 38000, outerKm: 98000, color: {r:0.6,g:0.7,b:0.8}, opacity: 0.4, particleCount: 3000 }, orbitColor: 0x82a6b3, type: 'planet' },
                    { name: 'Neptune', texture: 'textures/neptune.jpg', real: { radius: 24622, distance: 30.05, orbitPeriod: 59800, rotationPeriod: 0.67, tilt: 28.32, ecc: 0.011, incl: 1.8 }, rings: { innerKm: 41900, outerKm: 62900, color: {r:0.5,g:0.6,b:0.9}, opacity: 0.5, particleCount: 1000 }, orbitColor: 0x566cb3, type: 'planet' }
                ];

                solarSystemData.forEach(data => {
                    const scaledRadius = data.name === 'Sun' ? data.real.radius * PLANET_SIZE_SCALE * SUN_VISUAL_SCALE : data.real.radius * PLANET_SIZE_SCALE;

                    const config = {
                        name: data.name, radius: scaledRadius,
                        distance: (data.real.distance || 0) * AU_IN_UNITS,
                        texture: data.texture, emissive: data.emissive || false,
                        orbitalSpeed: data.real.orbitPeriod ? 1 / data.real.orbitPeriod : 0,
                        rotationSpeed: data.real.rotationPeriod ? 1 / data.real.rotationPeriod : 0,
                        axialTilt: data.real.tilt || 0, eccentricity: data.real.ecc || 0,
                        inclination: data.real.incl || 0,
                        orbitColor: data.orbitColor,
                        type: data.type
                    };

                    if (data.rings) {
                        config.rings = { inner: data.rings.innerKm * PLANET_SIZE_SCALE, outer: data.rings.outerKm * PLANET_SIZE_SCALE,
                            color: data.rings.color, opacity: data.rings.opacity, particleCount: data.rings.particleCount
                        }
                    }

                    const body = this.createCelestialBody(config);

                    if (data.name === 'Sun') {
                        const pointLight = new THREE.PointLight(0xfff8dc, 1.5, 0, 0.5);
                        pointLight.power = 2000;
                        body.mesh.add(pointLight);
                    }
                });
                this.addMoons();
            }

            addMoons() {
                const moonsData = {
                    'Earth': [{ name: 'Moon', texture: 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon.jpg', real: { radius: 1737, distance: 384400, orbitPeriod: 27.3 }}],
                    'Mars': [{ name: 'Phobos', real: { radius: 11.2, distance: 9376, orbitPeriod: 0.3 } }, { name: 'Deimos', real: { radius: 6.2, distance: 23463, orbitPeriod: 1.26 } }],
                    'Jupiter': [{ name: 'Io', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/io.jpg', real: { radius: 1821, distance: 421700, orbitPeriod: 1.77 }},{ name: 'Europa', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/europa.jpg', real: { radius: 1560, distance: 671034, orbitPeriod: 3.55 }},{ name: 'Ganymede', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/ganymedee.jpg', real: { radius: 2634, distance: 1070412, orbitPeriod: 7.15 }},{ name: 'Callisto', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/callisto.jpg', real: { radius: 2410, distance: 1882709, orbitPeriod: 16.69 }}],
                    'Saturn': [{ name: 'Mimas', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/mimas.jpg', real: { radius: 198, distance: 185520, orbitPeriod: 0.9 }},{ name: 'Enceladus', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/enceladus.jpg', real: { radius: 252, distance: 238020, orbitPeriod: 1.4 }},{ name: 'Tethys', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/tethys.jpg', real: { radius: 533, distance: 294660, orbitPeriod: 1.9 }},{ name: 'Dione', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/dione.jpg', real: { radius: 561, distance: 377400, orbitPeriod: 2.7 }},{ name: 'Rhea', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/rhea.jpg', real: { radius: 764, distance: 527040, orbitPeriod: 4.5 }},{ name: 'Titan', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/titan.jpg', real: { radius: 2575, distance: 1221870, orbitPeriod: 15.9 }},{ name: 'Iapetus', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/iapetus.jpg', real: { radius: 735, distance: 3561300, orbitPeriod: 79.3 }}],
                    'Uranus': [{ name: 'Miranda', real: { radius: 235, distance: 129900, orbitPeriod: 1.4 }},{ name: 'Ariel', real: { radius: 578, distance: 190900, orbitPeriod: 2.5 }},{ name: 'Umbriel', real: { radius: 584, distance: 266000, orbitPeriod: 4.1 }},{ name: 'Titania', real: { radius: 788, distance: 436300, orbitPeriod: 8.7 }},{ name: 'Oberon', real: { radius: 761, distance: 583500, orbitPeriod: 13.4 }}],
                    'Neptune': [{ name: 'Triton', texture: 'https://raw.githubusercontent.com/devstronomy/nasa-3d-model-textures/master/2k/triton.jpg', real: { radius: 1353, distance: 354759, orbitPeriod: 5.8 }},{ name: 'Nereid', real: { radius: 170, distance: 5513818, orbitPeriod: 360 }}]
                };

                for (const [parentName, moonList] of Object.entries(moonsData)) {
                    const parentBody = this.celestialBodies.find(b => b.name === parentName);
                    if (!parentBody) continue;

                    moonList.forEach(moonData => {
                        const moonRadius = moonData.real.radius * PLANET_SIZE_SCALE;
                        const moonDistance = moonData.real.distance * MOON_DISTANCE_SCALE;

                        const pivot = new THREE.Object3D();
                        parentBody.mesh.add(pivot);

                        const moonGeo = new THREE.SphereGeometry(moonRadius, 32, 16);
                        let moonMat = (parentName !== 'Earth') ?
                             new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random() * 0xffffff) }) :
                             new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

                        const moonMesh = new THREE.Mesh(moonGeo, moonMat);

                        if (moonData.texture) {
                            this.textureLoader.load(moonData.texture, (texture) => {
                                moonMesh.material.map = texture;
                                moonMesh.material.needsUpdate = true;
                            });
                        }

                        moonMesh.position.x = moonDistance;
                        pivot.add(moonMesh);

                        const curve = new THREE.EllipseCurve(0, 0, moonDistance, moonDistance, 0, 2 * Math.PI, false, 0);
                        const orbitGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(100));
                        const moonOrbitLine = new THREE.Line(orbitGeometry, new THREE.LineBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.2 }));
                        moonOrbitLine.rotation.x = Math.PI / 2;
                        if (moonDistance > 10) pivot.add(moonOrbitLine);

                        const labelDiv = document.createElement('div');
                        labelDiv.className = 'planet-label';
                        labelDiv.textContent = moonData.name;
                        labelDiv.style.fontSize = '10px';
                        const label = new CSS2DObject(labelDiv);
                        label.position.set(0, moonRadius * 1.5, 0);
                        moonMesh.add(label);

                        this.celestialBodies.push({
                            name: moonData.name,
                            mesh: moonMesh,
                            pivot: pivot,
                            label,
                            type: 'moon',
                            data: {
                                orbitalSpeed: 1 / moonData.real.orbitPeriod,
                                rotationSpeed: 1 / (moonData.real.rotationPeriod || moonData.real.orbitPeriod)
                            }
                        });
                    });
                }
            }

            initUI() {
                const timeSlider = document.getElementById('time-slider');
                const speedDisplay = document.getElementById('speed-display');

                const timeScales = [
                    { scale: 0, text: 'Paused' },
                    { scale: 1, text: '1 Day/sec' },
                    { scale: 7, text: '1 Week/sec' },
                    { scale: 30, text: '1 Month/sec' },
                    { scale: 365, text: '1 Year/sec' },
                    { scale: 3650, text: '10 Years/sec' },
                    { scale: 36500, text: '100 Years/sec' }
                ];

                timeSlider.addEventListener('input', (e) => {
                    const value = parseInt(e.target.value);
                    this.timeScale = timeScales[value].scale;
                    this.isPaused = this.timeScale === 0;
                    speedDisplay.textContent = timeScales[value].text;
                });

                document.getElementById('live-btn').addEventListener('click', () => {
                    this.setMode('live');
                });

                document.getElementById('sim-btn').addEventListener('click', () => {
                    this.setMode('simulation');
                });

                document.getElementById('toggle-panels').addEventListener('click', (e) => {
                    this.panelsVisible = !this.panelsVisible;
                    const leftPanels = document.getElementById('left-panels');
                    const rightPanels = document.getElementById('right-panels');
                    leftPanels.classList.toggle('hidden', !this.panelsVisible);
                    rightPanels.classList.toggle('hidden', !this.panelsVisible);
                    e.target.textContent = this.panelsVisible ? 'Hide Panels' : 'Show Panels';
                });

                document.getElementById('toggle-orbits').addEventListener('click', (e) => {
                    this.isOrbitsVisible = !this.isOrbitsVisible;
                    e.target.classList.toggle('active', this.isOrbitsVisible);
                    this.updateObjectVisibility();
                });

                document.getElementById('toggle-labels').addEventListener('click', (e) => {
                    this.isLabelsVisible = !this.isLabelsVisible;
                    e.target.classList.toggle('active', this.isLabelsVisible);
                });

                document.getElementById('toggle-planets').addEventListener('click', (e) => {
                    this.showPlanets = !this.showPlanets;
                    e.target.classList.toggle('active', this.showPlanets);
                    this.updateObjectVisibility();
                });

                document.getElementById('toggle-moons').addEventListener('click', (e) => {
                    this.showMoons = !this.showMoons;
                    e.target.classList.toggle('active', this.showMoons);
                    this.updateObjectVisibility();
                });

                document.getElementById('toggle-spacecraft').addEventListener('click', (e) => {
                    this.showSpacecraft = !this.showSpacecraft;
                    e.target.classList.toggle('active', this.showSpacecraft);
                    this.updateObjectVisibility();
                });

                document.getElementById('toggle-comets').addEventListener('click', (e) => {
                    this.showComets = !this.showComets;
                    e.target.classList.toggle('active', this.showComets);
                    this.updateObjectVisibility();
                });

                document.getElementById('reset-view').addEventListener('click', () => {
                    this.focusTarget = null;
                    this.lastFocusPosition = null;
                    this.controls.target.set(0, 0, 0);
                    this.camera.position.set(0, 2500, 9000);
                    this.controls.minDistance = 0;
                });

                const searchBox = document.getElementById('search-box');
                const searchResults = document.getElementById('search-results');
                searchBox.addEventListener('input', () => {
                    const query = searchBox.value.toLowerCase();
                    searchResults.innerHTML = '';
                    if (!query) return;

                    const allObjects = [...this.celestialBodies, ...this.spacecraft, ...this.comets];
                    allObjects
                        .filter(b => b.name.toLowerCase().includes(query))
                        .forEach(match => {
                            const div = document.createElement('div');
                            div.className = 'search-result';
                            div.textContent = match.name;
                            div.onclick = () => {
                                this.focusAndFitObject(match.model || match.mesh);
                                searchBox.value = '';
                                searchResults.innerHTML = '';
                            };
                            searchResults.appendChild(div);
                        });
                });
            }

            updateObjectVisibility() {
                this.celestialBodies.forEach(body => {
                    let visible = true;
                    if (body.type === 'planet' && !this.showPlanets) visible = false;
                    if (body.type === 'moon' && !this.showMoons) visible = false;
                    if (body.type === 'star') visible = true; // Always show the Sun

                    body.mesh.visible = visible;
                    if (body.orbit) body.orbit.visible = visible && this.isOrbitsVisible;
                });

                this.spacecraft.forEach(craft => {
                    craft.model.visible = this.showSpacecraft;
                });

// This is the corrected code
this.comets.forEach(comet => {
    // This hides or shows the entire comet group (body and orbit)
    if (comet.plane) {
        comet.plane.visible = this.showComets;
    }
    // Now, the orbit visibility depends on BOTH controls
    if (comet.orbit) {
        comet.orbit.visible = this.showComets && this.isOrbitsVisible;
    }
});
            }

            setMode(mode) {
                document.querySelectorAll('.time-btn').forEach(btn => btn.classList.remove('active'));

                const statusDot = document.getElementById('status-dot');
                const statusText = document.getElementById('status-text');
                const timeSlider = document.getElementById('time-slider');
                const speedDisplay = document.getElementById('speed-display');

                switch(mode) {
                    case 'live':
                        this.isRealTime = true;
                        this.timeScale = 1 / (24 * 60 * 60);
                        document.getElementById('live-btn').classList.add('active');
                        statusText.textContent = 'LIVE';
                        statusDot.className = 'status-dot live';
                        speedDisplay.textContent = 'Real Time';
                        timeSlider.disabled = true;
                        this.currentDate = new Date();
                        if (this.apiConnected) {
                            this.fetchRealTimeData();
                        }
                        break;
                    case 'simulation':
                    default:
                        this.isRealTime = false;
                        document.getElementById('sim-btn').classList.add('active');
                        statusText.textContent = 'SIMULATION';
                        statusDot.className = 'status-dot';
                        timeSlider.disabled = false;
                        timeSlider.dispatchEvent(new Event('input'));
                        break;
                }

                this.updateDateDisplay();
            }

            updateDateDisplay(date = this.currentDate) {
                const dateElement = document.getElementById('current-date');
                const options = {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                };
                dateElement.textContent = date.toLocaleDateString('en-US', options);
            }

            focusAndFitObject(target) {
                this.focusTarget = target;
                this.lastFocusPosition = null;

                const celestialBody = this.celestialBodies.find(body => body.mesh === target);
                const spacecraft = this.spacecraft.find(craft => craft.model === target);
                let objectRadius;
                let fitDistance

                const box = new THREE.Box3().setFromObject(target);
                const sphere = new THREE.Sphere();
                box.getBoundingSphere(sphere);
                const radius = sphere.radius;
                const center = sphere.center;

                const fov = THREE.MathUtils.degToRad(this.camera.fov);
                const distance = radius / Math.tan(fov / 2);
                if (celestialBody){
                    const isPlanet = celestialBody.data.distance > 0;
                    const isMoon = celestialBody.pivot !== undefined;

                    if (isPlanet){
                        objectRadius = celestialBody.data.radius || 50;
                        fitDistance = objectRadius * 4.5;
                    }
                    else if (isMoon){
                        objectRadius = celestialBody.data.radius || 50;
                        fitDistance = objectRadius * 0.05;
                    }
                }
                if (spacecraft){
                    fitDistance = distance * 2; // Zoom out a bit more for spacecraft
                }

                const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
                offset.normalize().multiplyScalar(fitDistance);
                const newCameraPosition = center.clone().add(offset);

                this.camera.position.copy(newCameraPosition);
                this.controls.minDistance = fitDistance;
            }

            animate() {
                requestAnimationFrame(() => this.animate());

                const deltaTime = this.clock.getDelta();
                let effectiveDate;

                if (this.isRealTime) {
                    effectiveDate = new Date();
                    this.currentDate = effectiveDate;
                } else {
                    if (!this.isPaused) {
                        const millisecondsPerDay = 24 * 60 * 60 * 1000;
                        const daysAdvanced = deltaTime * this.timeScale;
                        this.currentDate = new Date(this.currentDate.getTime() + (daysAdvanced * millisecondsPerDay));
                    }
                    effectiveDate = this.currentDate;
                }

                this.updateDateDisplay(effectiveDate);
                this.updatePlanetPositions(effectiveDate);

                const timeFactor = deltaTime * this.timeScale * (2 * Math.PI);

                if (!this.isPaused) {
                    this.celestialBodies.forEach(body => {
                        if (body.pivot) {
                           body.pivot.rotation.y += body.data.orbitalSpeed * timeFactor;
                        }
                        body.mesh.rotation.y += body.data.rotationSpeed * timeFactor * 0.1;
                    });

                    this.spacecraft.forEach(craft => {
                        if (craft.pivot) {
                            craft.pivot.rotation.y += (1 / craft.data.period) * timeFactor;
                        } else {
                            craft.data.angle += craft.data.speed * timeFactor;
                            craft.model.position.x = Math.cos(craft.data.angle) * craft.data.distance;
                            craft.model.position.z = Math.sin(craft.data.angle) * craft.data.distance;
                        }
                        craft.model.rotation.y += 0.0;
                    });

                    this.comets.forEach(comet => {
                        comet.data.angle += comet.data.orbitalSpeed * timeFactor;
                        const a = comet.data.distance;
                        const e = comet.data.eccentricity;
                        const c = a * e;
                        const b = a * Math.sqrt(1 - e*e);
                        comet.mesh.position.x = Math.cos(comet.data.angle) * a + c;
                        comet.mesh.position.z = Math.sin(comet.data.angle) * b;

                        const sunDirection = new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0), comet.mesh.position).normalize();
                        comet.tail.lookAt(comet.mesh.position.clone().add(sunDirection));

                        const distanceFromSun = comet.mesh.position.length();
                        const maxTailOpacity = 0.4;
                        const minDistance = AU_IN_UNITS;
                        const maxDistance = AU_IN_UNITS * 10;
                        const opacity = maxTailOpacity * Math.max(0, (maxDistance - distanceFromSun) / (maxDistance - minDistance));
                        comet.tail.material.opacity = Math.min(maxTailOpacity, opacity);
                    });

                    if (this.mainBelt && this.asteroidData) {
                        const positions = this.mainBelt.geometry.attributes.position;
                        for (let i = 0; i < this.asteroidData.length; i++) {
                            const asteroid = this.asteroidData[i];
                            asteroid.angle += asteroid.speed * deltaTime * this.timeScale * 0.1;
                            positions.setX(i, Math.cos(asteroid.angle) * asteroid.radius);
                            positions.setZ(i, Math.sin(asteroid.angle) * asteroid.radius);
                        }
                        positions.needsUpdate = true;
                    }
                }

                if (this.focusTarget) {
                    const targetPosition = new THREE.Vector3();
                    this.focusTarget.getWorldPosition(targetPosition);

                    if (this.lastFocusPosition) {
                        const delta = new THREE.Vector3().subVectors(targetPosition, this.lastFocusPosition);
                        this.camera.position.add(delta);
                    } else {
                        this.lastFocusPosition = new THREE.Vector3();
                    }

                    this.controls.target.lerp(targetPosition, 0.1);
                    this.lastFocusPosition.copy(targetPosition);
                }

                this.controls.update();

                this.handleLabelClustering();

                this.renderer.render(this.scene, this.camera);
                this.labelRenderer.render(this.scene, this.camera);
            }

            handleLabelClustering() {
                const labeledObjects = [...this.celestialBodies, ...this.spacecraft, ...this.comets].filter(obj => obj.label);

                if (!this.isLabelsVisible) {
                    labeledObjects.forEach(obj => obj.label.visible = false);
                    return;
                }

                labeledObjects.forEach(obj => obj.label.visible = true);

                const labelData = [];
                const tempVec = new THREE.Vector3();

                for (const obj of labeledObjects) {
                    const object3d = obj.mesh || obj.model;

                    // Check visibility based on object type
                    let shouldShow = true;
                    if (obj.type === 'planet' && !this.showPlanets) shouldShow = false;
                    if (obj.type === 'moon' && !this.showMoons) shouldShow = false;
                    if (obj.type === 'spacecraft' && !this.showSpacecraft) shouldShow = false;
                    if (obj.type === 'comet' && !this.showComets) shouldShow = false;
                    if (obj.type === 'star') shouldShow = true; // Always show Sun label

                    if (!shouldShow) {
                        obj.label.visible = false;
                        continue;
                    }

                    object3d.getWorldPosition(tempVec);
                    const distanceToCamera = this.camera.position.distanceTo(tempVec);

                    tempVec.project(this.camera);

                    if (tempVec.z > 1) {
                        obj.label.visible = false;
                        continue;
                    }

                    labelData.push({
                        label: obj.label,
                        screenPos: new THREE.Vector2(tempVec.x, tempVec.y),
                        distance: distanceToCamera
                    });
                }

                const screenDistThreshold = 0.08;

                for (let i = 0; i < labelData.length; i++) {
                    if (!labelData[i].label.visible) continue;

                    for (let j = i + 1; j < labelData.length; j++) {
                        if (!labelData[j].label.visible) continue;

                        if (labelData[i].screenPos.distanceTo(labelData[j].screenPos) < screenDistThreshold) {
                            if (labelData[i].distance < labelData[j].distance) {
                                labelData[j].label.visible = false;
                            } else {
                                labelData[i].label.visible = false;
                                break;
                            }
                        }
                    }
                }
            }

            updatePlanetPositions(date) {
                const J2000 = new Date('2000-01-01T12:00:00Z');
                const daysSinceJ2000 = (date - J2000) / (1000 * 60 * 60 * 24);

                this.celestialBodies.forEach(body => {
                    if (body.plane && body.data.distance > 0) {
                        if (this.isRealTime && this.realTimePositions.has(body.name)) {
                             const realPos = this.realTimePositions.get(body.name);
                             body.mesh.position.x = realPos.x;
                             body.mesh.position.z = realPos.z;
                        } else {
                            const planet = body.data;
                            const period = planet.orbitalSpeed ? 1 / planet.orbitalSpeed : 0;
                            if (period === 0) return;

                            const meanAnomaly = (2 * Math.PI * daysSinceJ2000) / period;
                            const trueAnomaly = meanAnomaly + (2 * planet.eccentricity * Math.sin(meanAnomaly));

                            const a = planet.distance;
                            const e = planet.eccentricity;
                            const c = a * e;
                            const b = a * Math.sqrt(1 - e * e);

                            body.mesh.position.x = Math.cos(trueAnomaly) * a + c;
                            body.mesh.position.z = Math.sin(trueAnomaly) * b;
                        }
                    }
                });
            }

            onWindowResize() {
                this.camera.aspect = window.innerWidth / window.innerHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(window.innerWidth, window.innerHeight);
                this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
            }
        }

        new SolarSystem3D();
