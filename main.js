import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Raycaster } from 'three';

import { Config } from './js/Config.js';
import { PerformanceMonitor } from './js/PerformanceMonitor.js';
import { KeyboardControls } from './js/KeyboardControls.js';
import { InfoPanel } from './js/InfoPanel.js';
import { BookmarkManager } from './js/BookmarkManager.js';
import { DistanceTool } from './js/DistanceTool.js';
import { ComparisonTool } from './js/ComparisonTool.js';
import { Screenshot } from './js/Screenshot.js';
import { DatePicker } from './js/DatePicker.js';
import { Tooltip } from './js/Tooltip.js';
import { SpeedIndicator } from './js/SpeedIndicator.js';
import { EducationalOverlay } from './js/EducationalOverlay.js';
import { DataExport } from './js/DataExport.js';
import { ObjectInspector } from './js/ObjectInspector.js';
import { OrbitalWorker } from './js/OrbitalWorker.js';
import { LODSystem } from './js/LODSystem.js';
import { PBRMaterials } from './js/PBRMaterials.js';
import { PostProcessing } from './js/PostProcessing.js';
import { AtmosphericScattering } from './js/AtmosphericScattering.js';
import { ParticleSystems } from './js/ParticleSystems.js';
import { MultiSourceAPI } from './js/MultiSourceAPI.js';
import { MissionPathVisualizer } from './js/MissionPathVisualizer.js';
import { ConstellationOverlay } from './js/ConstellationOverlay.js';

class SolarSystem3D {
    constructor() {
        this.config = null;
        this.container = document.getElementById('canvas-container');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
        this.labelRenderer = new CSS2DRenderer();
        this.clock = new THREE.Clock();
        this.raycaster = new Raycaster();

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

        // Modules
        this.performanceMonitor = new PerformanceMonitor();
        this.infoPanel = null;
        this.bookmarkManager = null;
        this.distanceTool = null;
        this.comparisonTool = null;
        this.screenshot = null;
        this.datePicker = null;
        this.keyboardControls = null;
        this.tooltip = null;
        this.speedIndicator = null;
        this.educationalOverlay = null;
        this.dataExport = null;
        this.objectInspector = null;
        this.orbitalWorker = null;
        this.lodSystem = null;
        this.pbrMaterials = null;
        this.postProcessing = null;
        this.atmosphericScattering = null;
        this.particleSystems = null;
        this.multiSourceAPI = null;
        this.missionPathVisualizer = null;
        this.constellationOverlay = null;

        this.init();
    }

    async init() {
        try {
            // Load configuration
            this.config = await Config.load();
            const scaling = this.config.scaling;
            
            // Set constants from config
            this.PLANET_SIZE_SCALE = scaling.PLANET_SIZE_SCALE;
            this.SUN_VISUAL_SCALE = scaling.SUN_VISUAL_SCALE;
            this.AU_IN_UNITS = scaling.AU_IN_UNITS;
            this.MOON_DISTANCE_SCALE = scaling.MOON_DISTANCE_SCALE;
            this.MIN_SPACECRAFT_SCALE = scaling.MIN_SPACECRAFT_SCALE;
            this.COMET_SCALE = scaling.COMET_SCALE;

            this.initLoadingManager();
            this.setupRenderer();
            this.setupControls();
            this.setupLoaders();
            this.setupLighting();
            this.createStarfield();
            await this.createSolarSystem();
            this.createMainAsteroidBelt();
            this.createComets();
            this.initModules();
            this.initUI();
            this.initApiModal();
            this.updateDateDisplay();
            // Start in LIVE mode by default
            this.setMode('live');
            // Ensure initial visibility state (comets off by default)
            this.updateObjectVisibility();

            window.addEventListener('resize', () => this.onWindowResize());
            this.animate();
        } catch (error) {
            console.error('Initialization error:', error);
            console.error('Error stack:', error.stack);
            console.error('Error details:', {
                message: error.message,
                name: error.name,
                fileName: error.fileName,
                lineNumber: error.lineNumber
            });
            this.showError(`Failed to initialize: ${error.message}. Check console for details.`);
        }
    }

    initModules() {
        this.infoPanel = new InfoPanel();
        this.bookmarkManager = new BookmarkManager(this);
        this.distanceTool = new DistanceTool(this);
        this.comparisonTool = new ComparisonTool(this);
        this.screenshot = new Screenshot(this);
        this.datePicker = new DatePicker(this);
        this.keyboardControls = new KeyboardControls(this);
        this.tooltip = new Tooltip();
        this.speedIndicator = new SpeedIndicator(this);
        this.educationalOverlay = new EducationalOverlay();
        this.dataExport = new DataExport(this);
        this.objectInspector = new ObjectInspector(this);
        this.orbitalWorker = new OrbitalWorker();
        this.lodSystem = new LODSystem(this);
        try {
            this.pbrMaterials = new PBRMaterials(this.textureLoader);
        } catch (error) {
            console.warn('PBRMaterials initialization failed:', error);
        }
        
        try {
            this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
        } catch (error) {
            console.warn('PostProcessing initialization failed:', error);
        }
        
        try {
            this.atmosphericScattering = new AtmosphericScattering();
        } catch (error) {
            console.warn('AtmosphericScattering initialization failed:', error);
        }
        
        try {
            this.particleSystems = new ParticleSystems(this.scene);
        } catch (error) {
            console.warn('ParticleSystems initialization failed:', error);
        }
        
        try {
            this.multiSourceAPI = new MultiSourceAPI();
        } catch (error) {
            console.warn('MultiSourceAPI initialization failed:', error);
        }
        
        try {
            this.missionPathVisualizer = new MissionPathVisualizer(this.scene);
        } catch (error) {
            console.warn('MissionPathVisualizer initialization failed:', error);
        }
        
        try {
            this.constellationOverlay = new ConstellationOverlay(this.scene, this.camera);
        } catch (error) {
            console.warn('ConstellationOverlay initialization failed:', error);
        }
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/service-worker.js').catch(err => {
                console.log('Service worker registration failed:', err);
            });
        }
    }

    setupRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        // Enable shadows for better spacecraft detail
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.domElement.style.position = 'absolute';
        this.labelRenderer.domElement.style.top = '0px';
        this.container.appendChild(this.labelRenderer.domElement);

        this.camera.position.set(0, 2500, 9000);
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.labelRenderer.domElement);
        this.controls.enableDamping = true;
        this.controls.maxDistance = 500000;
        // Allow very close zoom for detailed spacecraft inspection
        this.controls.minDistance = 0.1;
    }

    setupLoaders() {
        this.textureLoader = new THREE.TextureLoader(this.loadingManager);
        this.textureLoader.setCrossOrigin('anonymous');
        
        this.gltfLoader = new GLTFLoader(this.loadingManager);
        const dracoLoader = new DRACOLoader();
        dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
        this.gltfLoader.setDRACOLoader(dracoLoader);
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0x404040, 0.5));
        const hemiLight = new THREE.HemisphereLight(0x404040, 0x202040, 0.3);
        this.scene.add(hemiLight);
        
        // Add directional light for better spacecraft detail visibility
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(1000, 1000, 1000);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        this.scene.add(dirLight);
        
        // Add point light near camera for close-up viewing
        this.cameraLight = new THREE.PointLight(0xffffff, 1, 100);
        this.camera.add(this.cameraLight);
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
                }, { once: true });
            }, 500);
        };

        this.loadingManager.onError = (url) => {
            console.error(`Error loading ${url}`);
            loadingText.textContent = `ERROR: ${url.split('/').pop()}`;
            progressBar.style.background = '#ff6b6b';
        };
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 8px;
            z-index: 10000;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);
    }

    createStarfield() {
        const starCount = this.config?.performance?.STAR_COUNT || 20000;
        const starVertices = [];
        for (let i = 0; i < starCount; i++) {
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

    async createSolarSystem() {
        const planets = this.config.planets || [];
        
        for (const data of planets) {
            const scaledRadius = data.name === 'Sun' 
                ? data.real.radius * this.PLANET_SIZE_SCALE * this.SUN_VISUAL_SCALE 
                : data.real.radius * this.PLANET_SIZE_SCALE;

            const config = {
                name: data.name,
                radius: scaledRadius,
                distance: (data.real.distance || 0) * this.AU_IN_UNITS,
                texture: data.texture,
                emissive: data.emissive || false,
                orbitalSpeed: data.real.orbitPeriod ? 1 / data.real.orbitPeriod : 0,
                rotationSpeed: data.real.rotationPeriod ? 1 / data.real.rotationPeriod : 0,
                axialTilt: data.real.tilt || 0,
                eccentricity: data.real.ecc || 0,
                inclination: data.real.incl || 0,
                orbitColor: data.orbitColor,
                type: data.type,
                info: data.info,
                real: data.real
            };

            if (data.rings) {
                config.rings = {
                    inner: data.rings.innerKm * this.PLANET_SIZE_SCALE,
                    outer: data.rings.outerKm * this.PLANET_SIZE_SCALE,
                    color: data.rings.color,
                    opacity: data.rings.opacity,
                    particleCount: data.rings.particleCount
                };
            }

            const body = this.createCelestialBody(config);

            if (data.name === 'Sun') {
                const pointLight = new THREE.PointLight(0xfff8dc, 1.5, 0, 0.5);
                pointLight.power = 2000;
                body.mesh.add(pointLight);
            }
        }
        
        await this.addMoons();
    }

    createCelestialBody(config) {
        const orbitalPlane = new THREE.Object3D();
        if (config.inclination) {
            orbitalPlane.rotation.x = THREE.MathUtils.degToRad(config.inclination);
        }
        this.scene.add(orbitalPlane);

        const geometry = new THREE.SphereGeometry(config.radius, 64, 32);
        let material = config.emissive
            ? new THREE.MeshBasicMaterial({ color: 0xffffff })
            : new THREE.MeshStandardMaterial({ color: 0x888888 });

        const mesh = new THREE.Mesh(geometry, material);
        if (config.axialTilt) {
            mesh.rotation.z = THREE.MathUtils.degToRad(config.axialTilt);
        }
        orbitalPlane.add(mesh);

        // Make mesh clickable
        mesh.userData = { config, type: config.type || 'planet', name: config.name };

        if (config.texture) {
            this.textureLoader.load(
                config.texture,
                (texture) => {
                    material = config.emissive
                        ? new THREE.MeshBasicMaterial({ map: texture, emissive: 0xffffff, emissiveMap: texture })
                        : new THREE.MeshStandardMaterial({ map: texture });
                    mesh.material = material;
                },
                undefined,
                (err) => console.warn(`Could not load texture for ${config.name}: ${config.texture}`)
            );
        }

        if (config.rings) {
            const ringSystem = this.createParticleRings(config.rings);
            mesh.add(ringSystem);
        }

        const a = config.distance;
        const e = config.eccentricity || 0;
        const c = a * e;
        const b = a * Math.sqrt(1 - e * e);

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
        labelDiv.style.cursor = 'pointer';
        const label = new CSS2DObject(labelDiv);
        label.position.set(0, config.radius * 1.5, 0);
        mesh.add(label);

        // Add click handler
        labelDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.objectInspector) {
                this.objectInspector.inspect(mesh, config);
            } else if (this.infoPanel) {
                this.infoPanel.show(mesh, config);
            }
        });

        const body = {
            name: config.name,
            mesh,
            orbit: orbitLine,
            label,
            plane: orbitalPlane,
            data: config,
            type: config.type || 'planet',
            currentAngle: Math.random() * 2 * Math.PI
        };
        this.celestialBodies.push(body);
        return body;
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

    async addMoons() {
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
                const moonRadius = moonData.real.radius * this.PLANET_SIZE_SCALE;
                const moonDistance = moonData.real.distance * this.MOON_DISTANCE_SCALE;

                const pivot = new THREE.Object3D();
                parentBody.mesh.add(pivot);

                const moonGeo = new THREE.SphereGeometry(moonRadius, 32, 16);
                let moonMat = (parentName !== 'Earth') ?
                     new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random() * 0xffffff) }) :
                     new THREE.MeshStandardMaterial({ color: 0xaaaaaa });

                const moonMesh = new THREE.Mesh(moonGeo, moonMat);
                moonMesh.userData = { type: 'moon', name: moonData.name, real: moonData.real };

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
                labelDiv.style.cursor = 'pointer';
                const label = new CSS2DObject(labelDiv);
                label.position.set(0, moonRadius * 1.5, 0);
                moonMesh.add(label);

                labelDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (this.objectInspector) {
                        this.objectInspector.inspect(moonMesh, { name: moonData.name, real: moonData.real, type: 'moon' });
                    } else if (this.infoPanel) {
                        this.infoPanel.show(moonMesh, { name: moonData.name, real: moonData.real, type: 'moon' });
                    }
                });

                this.celestialBodies.push({
                    name: moonData.name,
                    mesh: moonMesh,
                    pivot: pivot,
                    label,
                    type: 'moon',
                    data: {
                        orbitalSpeed: 1 / moonData.real.orbitPeriod,
                        rotationSpeed: 1 / (moonData.real.rotationPeriod || moonData.real.orbitPeriod),
                        radius: moonRadius,
                        distance: moonDistance
                    }
                });
            });
        }
    }

    createMainAsteroidBelt() {
        const asteroidCount = this.config?.performance?.ASTEROID_COUNT || 25000;
        const positions = [];
        this.asteroidData = [];
        const innerRadius = 2.2 * this.AU_IN_UNITS;
        const outerRadius = 3.2 * this.AU_IN_UNITS;
        const beltThickness = 25;

        for (let i = 0; i < asteroidCount; i++) {
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
        const comets = this.config.comets || [];
        
        comets.forEach(cometData => {
            const nucleusGeometry = new THREE.SphereGeometry(this.COMET_SCALE * 2, 16, 12);
            const nucleusMaterial = new THREE.MeshStandardMaterial({
                color: 0x555555,
                roughness: 0.6,
                metalness: 0.25,
                emissive: 0x111111,
                emissiveIntensity: 0.35
            });
            const nucleus = new THREE.Mesh(nucleusGeometry, nucleusMaterial);
            nucleus.userData = { type: 'comet', name: cometData.name, info: cometData.info };

            const comaGeometry = new THREE.SphereGeometry(this.COMET_SCALE * 8, 16, 12);
            const comaMaterial = new THREE.MeshStandardMaterial({
                color: 0xcfffff,
                transparent: true,
                opacity: 0.35,
                emissive: 0x003366,
                emissiveIntensity: 0.25
            });
            const coma = new THREE.Mesh(comaGeometry, comaMaterial);
            nucleus.add(coma);

            const tailGeometry = new THREE.ConeGeometry(this.COMET_SCALE * 3, this.COMET_SCALE * 30, 24);
            const tailMaterial = new THREE.MeshBasicMaterial({
                color: 0x99ddff,
                transparent: true,
                opacity: 0.28,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            });
            const tail = new THREE.Mesh(tailGeometry, tailMaterial);
            tail.rotation.z = Math.PI / 2;
            tail.position.x = this.COMET_SCALE * 15;
            nucleus.add(tail);

            const distance = cometData.distance * this.AU_IN_UNITS;
            const angle = Math.random() * Math.PI * 2;
            nucleus.position.x = Math.cos(angle) * distance;
            nucleus.position.z = Math.sin(angle) * distance;

            const orbitalPlane = new THREE.Object3D();
            orbitalPlane.rotation.x = THREE.MathUtils.degToRad(cometData.inclination);
            orbitalPlane.add(nucleus);
            this.scene.add(orbitalPlane);

            const a = distance;
            const e = cometData.eccentricity;
            const c = a * e;
            const b = a * Math.sqrt(1 - e * e);

            const curve = new THREE.EllipseCurve(c, 0, a, b, 0, 2 * Math.PI, false, 0);
            const points = curve.getPoints(500);
            const orbitGeometry = new THREE.BufferGeometry().setFromPoints(points);
            const orbitMaterial = new THREE.LineBasicMaterial({
                color: 0x66c2ff,
                transparent: true,
                opacity: 0.25
            });
            const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
            orbitLine.rotation.x = Math.PI / 2;
            orbitalPlane.add(orbitLine);

            const labelDiv = document.createElement('div');
            labelDiv.className = 'planet-label';
            labelDiv.textContent = cometData.name;
            labelDiv.style.fontSize = '10px';
            labelDiv.style.cursor = 'pointer';
            const label = new CSS2DObject(labelDiv);
            label.position.set(0, this.COMET_SCALE * 12, 0);
            nucleus.add(label);

            labelDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                const comet = this.comets.find(c => c.mesh === nucleus);
                if (this.objectInspector && comet) {
                    this.objectInspector.inspect(nucleus, { name: cometData.name, info: cometData.info, type: 'comet', real: comet.data });
                } else if (this.infoPanel) {
                    this.infoPanel.show(nucleus, { name: cometData.name, info: cometData.info, type: 'comet', distance: cometData.distance, eccentricity: cometData.eccentricity, period: cometData.period });
                }
            });

            const cometObj = {
                name: cometData.name,
                mesh: nucleus,
                tail: tail,
                orbit: orbitLine,
                label: label,
                plane: orbitalPlane,
                type: 'comet',
                data: {
                    distance: distance,
                    eccentricity: cometData.eccentricity,
                    orbitalSpeed: 1 / cometData.period,
                    angle: angle,
                    inclination: cometData.inclination
                }
            };

            // Respect initial visibility (comets off at startup)
            const shouldShow = this.showComets;
            nucleus.visible = shouldShow;
            if (orbitLine) orbitLine.visible = shouldShow && this.isOrbitsVisible;
            if (orbitalPlane) orbitalPlane.visible = true; // plane used for rotation, keep but hide children
            if (tail) tail.visible = shouldShow;
            if (label) label.visible = shouldShow;

            this.comets.push(cometObj);
        });
    }

    async fetchSpacecraftData() {
        if (!this.apiConnected) return;

        const earthRadiusKm = 6371;
        const issAltitudeKm = 408;
        const hubbleAltitudeKm = 540;

        const issOrbitRadius = (earthRadiusKm + issAltitudeKm) * this.PLANET_SIZE_SCALE;
        const hubbleOrbitRadius = (earthRadiusKm + hubbleAltitudeKm) * this.PLANET_SIZE_SCALE;

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

    async loadSpacecraftModel(craft) {
        return new Promise((resolve, reject) => {
            this.gltfLoader.load(craft.modelFile, (gltf) => {
                const model = gltf.scene;
                const intendedScale = craft.scale || 0.5;
                // Use larger scale for better visibility - spacecrafts are the focus
                const finalScale = Math.max(intendedScale * 2, this.MIN_SPACECRAFT_SCALE * 2);
                model.scale.setScalar(finalScale);
                model.userData = { type: 'spacecraft', name: craft.name };
                
                // Improve spacecraft rendering quality
                model.traverse((child) => {
                    if (child.isMesh) {
                        // Enable better lighting and shadows for detail
                        child.castShadow = true;
                        child.receiveShadow = true;
                        // Improve material quality
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => {
                                    if (mat) {
                                        mat.needsUpdate = true;
                                        mat.roughness = 0.7;
                                        mat.metalness = 0.3;
                                    }
                                });
                            } else {
                                child.material.needsUpdate = true;
                                child.material.roughness = 0.7;
                                child.material.metalness = 0.3;
                            }
                        }
                    }
                });

                const labelDiv = document.createElement('div');
                labelDiv.className = 'planet-label';
                labelDiv.textContent = craft.name;
                labelDiv.style.cursor = 'pointer';
                labelDiv.style.fontSize = '14px';
                labelDiv.style.fontWeight = '600';
                labelDiv.style.color = '#00ff88';
                labelDiv.style.textShadow = '0 0 10px rgba(0, 255, 136, 0.8)';
                const label = new CSS2DObject(labelDiv);
                // Position label higher for better visibility
                label.position.set(0, 20, 0);
                model.add(label);
                
                // Add a subtle glow/emissive effect to make spacecrafts stand out
                const glowGeometry = new THREE.SphereGeometry(5, 16, 16);
                const glowMaterial = new THREE.MeshBasicMaterial({
                    color: 0x00ff88,
                    transparent: true,
                    opacity: 0.2,
                    side: THREE.BackSide
                });
                const glow = new THREE.Mesh(glowGeometry, glowMaterial);
                glow.scale.setScalar(1.5);
                model.add(glow);

                labelDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const spacecraft = this.spacecraft.find(s => s.model === model);
                    if (this.objectInspector && spacecraft) {
                        this.objectInspector.inspect(model, { name: craft.name, type: 'spacecraft', real: spacecraft.data });
                    } else if (this.infoPanel) {
                        this.infoPanel.show(model, { name: craft.name, type: 'spacecraft' });
                    }
                });

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
                    const distance = craft.orbit.semiMajorAxis * this.AU_IN_UNITS;
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
        mesh.userData = { type: 'spacecraft', name: craft.name };

        const distance = craft.orbit.semiMajorAxis * this.AU_IN_UNITS;
        const angle = Math.random() * Math.PI * 2;
        mesh.position.x = Math.cos(angle) * distance;
        mesh.position.z = Math.sin(angle) * distance;
        this.scene.add(mesh);

        const labelDiv = document.createElement('div');
        labelDiv.className = 'planet-label';
        labelDiv.textContent = craft.name + ' (Placeholder)';
        labelDiv.style.cursor = 'pointer';
        const label = new CSS2DObject(labelDiv);
        label.position.set(0, 5, 0);
        mesh.add(label);

        labelDiv.addEventListener('click', (e) => {
            e.stopPropagation();
            const spacecraft = this.spacecraft.find(s => s.model === mesh);
            if (this.objectInspector && spacecraft) {
                this.objectInspector.inspect(mesh, { name: craft.name, type: 'spacecraft', real: spacecraft.data });
            } else if (this.infoPanel) {
                this.infoPanel.show(mesh, { name: craft.name, type: 'spacecraft' });
            }
        });

        this.spacecraft.push({
            name: craft.name,
            model: mesh,
            label: label,
            type: 'spacecraft',
            data: {
                distance: distance,
                angle: angle,
                speed: 1 / (craft.orbit.period * 365.25),
                semiMajorAxis: craft.orbit.semiMajorAxis,
                eccentricity: craft.orbit.eccentricity,
                inclination: craft.orbit.inclination
            }
        });
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
            this.controls.minDistance = 0.1;
        });

        // Camera presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const preset = btn.dataset.preset;
                const presets = this.config?.cameraPresets || {};
                if (presets[preset]) {
                    const p = presets[preset];
                    this.camera.position.set(p.position[0], p.position[1], p.position[2]);
                    this.controls.target.set(p.target[0], p.target[1], p.target[2]);
                    this.focusTarget = null;
                }
            });
        });

        // Tools
        document.getElementById('toggle-distance-tool')?.addEventListener('click', () => {
            if (this.distanceTool) {
                this.distanceTool.toggle();
            }
        });

        document.getElementById('toggle-comparison')?.addEventListener('click', () => {
            if (this.comparisonTool) {
                this.comparisonTool.toggle();
            }
        });

        document.getElementById('screenshot-btn')?.addEventListener('click', () => {
            if (this.screenshot) {
                this.screenshot.capture();
            }
        });

        document.getElementById('export-json-btn')?.addEventListener('click', () => {
            if (this.dataExport) {
                this.dataExport.exportToJSON();
            }
        });

        document.getElementById('export-csv-btn')?.addEventListener('click', () => {
            if (this.dataExport) {
                this.dataExport.exportToCSV();
            }
        });

        // Theme toggle
        document.getElementById('theme-toggle')?.addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
            const btn = document.getElementById('theme-toggle');
            btn.textContent = document.body.classList.contains('light-theme') ? '🌞 Light' : '🌙 Dark';
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

        // Click handler for objects (planets, moons, spacecraft, comets)
        this.labelRenderer.domElement.addEventListener('click', (e) => {
            const mouse = new THREE.Vector2();
            mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(
                [
                    ...this.celestialBodies.map(b => b.mesh),
                    ...this.spacecraft.map(s => s.model),
                    ...this.comets.map(c => c.mesh)
                ],
                true
            );

            if (intersects.length === 0) {
                if (this.speedIndicator) this.speedIndicator.hide();
                return;
            }

            // Walk up the hierarchy to find the root object that has userData
            let picked = intersects[0].object;
            while (picked.parent && picked.parent !== this.scene && (!picked.userData || !picked.userData.type)) {
                picked = picked.parent;
            }

            const data = picked.userData;
            if (!data) {
                return;
            }

            const targetObject = picked;

            if (this.objectInspector) {
                // Use inspector for all objects
                if (data.type === 'planet' || data.type === 'star') {
                    const body = this.celestialBodies.find(b => b.mesh === targetObject);
                    if (body) {
                        this.objectInspector.inspect(targetObject, body.data);
                    }
                } else if (data.type === 'moon') {
                    this.objectInspector.inspect(targetObject, { name: data.name, real: data.real, type: 'moon' });
                } else if (data.type === 'comet') {
                    const comet = this.comets.find(c => c.mesh === targetObject);
                    if (comet) {
                        this.objectInspector.inspect(targetObject, { name: data.name, info: data.info, type: 'comet', real: comet.data });
                    }
                } else if (data.type === 'spacecraft') {
                    const spacecraft = this.spacecraft.find(s => s.model === targetObject);
                    if (spacecraft) {
                        this.objectInspector.inspect(targetObject, { name: data.name, type: 'spacecraft', real: spacecraft.data });
                    }
                }

                if (this.speedIndicator) this.speedIndicator.update(targetObject);
            } else if (this.infoPanel) {
                // Fallback to info panel if inspector is not available
                if (data.type === 'planet' || data.type === 'star') {
                    const body = this.celestialBodies.find(b => b.mesh === targetObject);
                    if (body) {
                        this.infoPanel.show(targetObject, body.data);
                        if (this.speedIndicator) this.speedIndicator.update(targetObject);
                    }
                } else if (data.type === 'moon') {
                    this.infoPanel.show(targetObject, { name: data.name, real: data.real, type: 'moon' });
                    if (this.speedIndicator) this.speedIndicator.update(targetObject);
                } else if (data.type === 'comet') {
                    const comet = this.comets.find(c => c.mesh === targetObject);
                    if (comet) {
                        this.infoPanel.show(targetObject, { name: data.name, info: data.info, type: 'comet' });
                        if (this.speedIndicator) this.speedIndicator.update(targetObject);
                    }
                } else if (data.type === 'spacecraft') {
                    this.infoPanel.show(targetObject, { name: data.name, type: 'spacecraft' });
                    if (this.speedIndicator) this.speedIndicator.update(targetObject);
                }
            }
        });
    }

    updateObjectVisibility() {
        this.celestialBodies.forEach(body => {
            let visible = true;
            if (body.type === 'planet' && !this.showPlanets) visible = false;
            if (body.type === 'moon' && !this.showMoons) visible = false;
            if (body.type === 'star') visible = true;

            body.mesh.visible = visible;
            if (body.orbit) body.orbit.visible = visible && this.isOrbitsVisible;
        });

        this.spacecraft.forEach(craft => {
            craft.model.visible = this.showSpacecraft;
        });

        this.comets.forEach(comet => {
            // Keep orbital plane for motion math, but hide visible parts
            if (comet.plane) {
                comet.plane.visible = true;
            }
            comet.mesh.visible = this.showComets;
            if (comet.tail) comet.tail.visible = this.showComets;
            if (comet.label) comet.label.visible = this.showComets;
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

        const box = new THREE.Box3().setFromObject(target);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        const radius = sphere.radius;
        const center = sphere.center;

        const fov = THREE.MathUtils.degToRad(this.camera.fov);
        let fitDistance = radius / Math.tan(fov / 2) * 2;

        const celestialBody = this.celestialBodies.find(body => body.mesh === target);
        const spacecraft = this.spacecraft.find(craft => craft.model === target);

        if (celestialBody) {
            const isPlanet = celestialBody.data.distance > 0;
            const isMoon = celestialBody.pivot !== undefined;

            if (isPlanet) {
                const objectRadius = celestialBody.data.radius || 50;
                fitDistance = objectRadius * 4.5;
            } else if (isMoon) {
                const objectRadius = celestialBody.data.radius || 50;
                fitDistance = objectRadius * 0.05;
            }
        }
        if (spacecraft) {
            // Allow much closer zoom for spacecrafts - they're the focus of the project
            const spacecraftBox = new THREE.Box3().setFromObject(target);
            const spacecraftSize = spacecraftBox.getSize(new THREE.Vector3());
            const maxSize = Math.max(spacecraftSize.x, spacecraftSize.y, spacecraftSize.z);
            // Zoom to 3x the size of the spacecraft for detailed viewing
            fitDistance = maxSize * 3;
            // Ensure minimum zoom distance is very small for close inspection
            this.controls.minDistance = 0.1;
        }

        const offset = new THREE.Vector3().subVectors(this.camera.position, this.controls.target);
        offset.normalize().multiplyScalar(fitDistance);
        const newCameraPosition = center.clone().add(offset);

        this.camera.position.copy(newCameraPosition);
        // For spacecrafts, allow much closer zoom (0.1 minimum)
        // For other objects, use calculated fitDistance
        if (spacecraft) {
            this.controls.minDistance = 0.1;
        } else {
            this.controls.minDistance = Math.max(fitDistance * 0.1, 0.1);
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.performanceMonitor.update();
        const fps = this.performanceMonitor.getFPS();
        const fpsElement = document.getElementById('fps-counter');
        if (fpsElement) {
            fpsElement.textContent = `FPS: ${fps}`;
        }

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
                const minDistance = this.AU_IN_UNITS;
                const maxDistance = this.AU_IN_UNITS * 10;
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
        
        // Update camera light position for close-up spacecraft viewing
        if (this.cameraLight) {
            this.cameraLight.position.set(0, 0, 0);
        }
        
        // Update LOD system
        if (this.lodSystem) {
            this.lodSystem.updateAll(this.camera.position);
        }
        
        // Update particle systems
        if (this.particleSystems) {
            this.particleSystems.update(deltaTime);
        }
        
        // Update constellation overlay
        if (this.constellationOverlay) {
            this.constellationOverlay.update(this.clock.getElapsedTime());
        }
        
        // Update mission paths
        if (this.missionPathVisualizer) {
            this.missionPathVisualizer.updateAll(effectiveDate);
        }
        
        this.handleLabelClustering();
        
        // Use post-processing if available
        if (this.postProcessing) {
            this.postProcessing.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
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

            let shouldShow = true;
            if (obj.type === 'planet' && !this.showPlanets) shouldShow = false;
            if (obj.type === 'moon' && !this.showMoons) shouldShow = false;
            if (obj.type === 'spacecraft' && !this.showSpacecraft) shouldShow = false;
            if (obj.type === 'comet' && !this.showComets) shouldShow = false;
            if (obj.type === 'star') shouldShow = true;

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
        const apiKeyBtn = document.getElementById('api-key-btn');

        const storedApiKey = localStorage.getItem('nasaApiKey');
        if (storedApiKey) {
            this.nasaApiKey = storedApiKey;
            this.connectToNasaApi();
        }

        // Button to open API key modal
        if (apiKeyBtn) {
            apiKeyBtn.addEventListener('click', () => {
                this.showApiModal();
            });
        }

        apiKeySubmit.addEventListener('click', () => {
            const key = apiKeyInput.value.trim();
            if (key) {
                this.nasaApiKey = key;
                localStorage.setItem('nasaApiKey', key);
                this.connectToNasaApi();
                this.hideApiModal();
            }
        });

        apiKeyInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') apiKeySubmit.click();
        });

        // Allow closing modal by clicking outside
        apiKeyModal.addEventListener('click', (e) => {
            if (e.target === apiKeyModal) {
                this.hideApiModal();
            }
        });
    }

    showApiModal() {
        const apiKeyModal = document.getElementById('api-key-modal');
        const apiKeyInput = document.getElementById('api-key-input');
        const storedApiKey = localStorage.getItem('nasaApiKey');
        
        if (apiKeyModal) {
            // Pre-fill with existing key if available
            if (storedApiKey && apiKeyInput) {
                apiKeyInput.value = storedApiKey;
            } else if (apiKeyInput) {
                apiKeyInput.value = '';
            }
            
            apiKeyModal.style.visibility = 'visible';
            apiKeyModal.style.opacity = '1';
            if (apiKeyInput) {
                setTimeout(() => apiKeyInput.focus(), 100);
            }
        }
    }

    hideApiModal() {
        const apiKeyModal = document.getElementById('api-key-modal');
        if (apiKeyModal) {
            apiKeyModal.style.opacity = '0';
            apiKeyModal.addEventListener('transitionend', () => {
                apiKeyModal.style.visibility = 'hidden';
            }, { once: true });
        }
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

                const distance = planet.distance * this.AU_IN_UNITS;
                const x = Math.cos(trueAnomaly) * distance;
                const z = Math.sin(trueAnomaly) * distance;

                this.realTimePositions.set(planet.name, { x, z, angle: trueAnomaly });
            });

        } catch (error) {
            console.error('Failed to fetch real-time data:', error);
        }
    }

    updateMissionStatus() {
        const totalObjects = this.celestialBodies.length + this.spacecraft.length + this.comets.length;
        document.getElementById('object-count').textContent = totalObjects;
        document.getElementById('spacecraft-count').textContent = this.spacecraft.length;
        document.getElementById('comet-count').textContent = this.comets.length;
        document.getElementById('data-source').textContent = this.apiConnected ? 'NASA/JPL (Live)' : 'Simulation';
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.labelRenderer.setSize(window.innerWidth, window.innerHeight);
        
        // Resize post-processing
        if (this.postProcessing) {
            this.postProcessing.resize(window.innerWidth, window.innerHeight);
        }
    }
}

new SolarSystem3D();

