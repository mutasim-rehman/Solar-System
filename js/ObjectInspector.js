import * as THREE from 'three';

export class ObjectInspector {
    constructor(solarSystem) {
        this.solarSystem = solarSystem;
        this.isActive = false;
        this.currentObject = null;
        this.originalPosition = null;
        this.originalParent = null;
        this.inspectionGroup = null;
        this.rotationSpeed = 0.01;
        this.init();
    }

    init() {
        // Create inspection container
        const container = document.createElement('div');
        container.id = 'object-inspector';
        container.className = 'object-inspector hidden';
        container.innerHTML = `
            <div class="inspector-left">
                <div class="inspector-3d-view" id="inspector-3d-view">
                    <canvas id="inspector-canvas"></canvas>
                </div>
                <button class="inspector-close" id="inspector-close">×</button>
            </div>
            <div class="inspector-right">
                <div class="inspector-header">
                    <h2 id="inspector-title">Object Details</h2>
                </div>
                <div class="inspector-tabs">
                    <button class="inspector-tab active" data-tab="stats">Stats</button>
                    <button class="inspector-tab" data-tab="history">History</button>
                    <button class="inspector-tab" data-tab="literature">Literature</button>
                    <button class="inspector-tab" data-tab="missions">Missions</button>
                </div>
                <div class="inspector-content">
                    <div class="tab-content active" id="tab-stats"></div>
                    <div class="tab-content" id="tab-history"></div>
                    <div class="tab-content" id="tab-literature"></div>
                    <div class="tab-content" id="tab-missions"></div>
                </div>
            </div>
        `;
        document.body.appendChild(container);
        this.container = container;

        // Setup close button
        document.getElementById('inspector-close').addEventListener('click', () => {
            this.close();
        });

        // Setup tabs
        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchTab(tabName);
            });
        });

        // Create separate scene for inspector
        this.setupInspectorScene();
    }

    setupInspectorScene() {
        // Create a separate Three.js scene for the inspector view
        const canvas = document.getElementById('inspector-canvas');
        this.inspectorScene = new THREE.Scene();
        this.inspectorCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
        this.inspectorRenderer = new THREE.WebGLRenderer({ 
            canvas: canvas, 
            antialias: true,
            alpha: true 
        });
        this.inspectorRenderer.setSize(400, 400);
        this.inspectorRenderer.setPixelRatio(window.devicePixelRatio);

        // Lighting for inspector
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.inspectorScene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 5, 5);
        this.inspectorScene.add(dirLight);

        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, -5, -5);
        this.inspectorScene.add(pointLight);

        this.inspectorCamera.position.set(0, 0, 10);
        this.inspectorCamera.lookAt(0, 0, 0);

        // Animation loop for inspector
        this.animateInspector();
    }

    animateInspector() {
        requestAnimationFrame(() => this.animateInspector());
        
        if (this.inspectionGroup && this.isActive) {
            this.inspectionGroup.rotation.y += this.rotationSpeed;
            this.inspectorRenderer.render(this.inspectorScene, this.inspectorCamera);
        }
    }

    inspect(object, data) {
        this.currentObject = object;
        this.isActive = true;
        this.container.classList.remove('hidden');

        // Clone the object for inspection
        const clonedObject = object.clone();
        
        // Calculate bounding box to center and scale
        const box = new THREE.Box3().setFromObject(clonedObject);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxSize = Math.max(size.x, size.y, size.z, 1e-6);
        
        // Scale to fit in view
        const scale = 8 / maxSize;
        // First move the object so its center is at the origin, then scale
        clonedObject.position.sub(center);
        clonedObject.scale.multiplyScalar(scale);
        
        // Create group for rotation
        this.inspectionGroup = new THREE.Group();
        this.inspectionGroup.add(clonedObject);
        this.inspectorScene.clear();
        
        // Re-add lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.inspectorScene.add(ambientLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(5, 5, 5);
        this.inspectorScene.add(dirLight);
        const pointLight = new THREE.PointLight(0xffffff, 0.5);
        pointLight.position.set(-5, -5, -5);
        this.inspectorScene.add(pointLight);
        
        this.inspectorScene.add(this.inspectionGroup);

        // Update information panels
        this.updateInfo(data);
    }

    updateInfo(data) {
        document.getElementById('inspector-title').textContent = data.name || 'Unknown Object';

        // Stats tab
        this.updateStatsTab(data);
        
        // History tab
        this.updateHistoryTab(data);
        
        // Literature tab
        this.updateLiteratureTab(data);
        
        // Missions tab
        this.updateMissionsTab(data);
    }

    updateStatsTab(data) {
        const statsContent = document.getElementById('tab-stats');
        let html = '<div class="stats-grid">';

        if (data.real) {
            if (data.real.radius) {
                html += `<div class="stat-item">
                    <div class="stat-label">Radius</div>
                    <div class="stat-value">${data.real.radius.toLocaleString()} km</div>
                </div>`;
            }
            if (data.real.distance !== undefined) {
                html += `<div class="stat-item">
                    <div class="stat-label">Distance from Sun</div>
                    <div class="stat-value">${data.real.distance} AU</div>
                </div>`;
            }
            if (data.real.orbitPeriod) {
                html += `<div class="stat-item">
                    <div class="stat-label">Orbital Period</div>
                    <div class="stat-value">${data.real.orbitPeriod} days</div>
                </div>`;
            }
            if (data.real.rotationPeriod) {
                html += `<div class="stat-item">
                    <div class="stat-label">Rotation Period</div>
                    <div class="stat-value">${Math.abs(data.real.rotationPeriod)} days</div>
                </div>`;
            }
            if (data.real.ecc) {
                html += `<div class="stat-item">
                    <div class="stat-label">Orbital Eccentricity</div>
                    <div class="stat-value">${data.real.ecc.toFixed(3)}</div>
                </div>`;
            }
            if (data.real.incl) {
                html += `<div class="stat-item">
                    <div class="stat-label">Inclination</div>
                    <div class="stat-value">${data.real.incl}°</div>
                </div>`;
            }
            if (data.real.tilt) {
                html += `<div class="stat-item">
                    <div class="stat-label">Axial Tilt</div>
                    <div class="stat-value">${data.real.tilt}°</div>
                </div>`;
            }
        }

        if (data.info) {
            if (data.info.mass) {
                html += `<div class="stat-item">
                    <div class="stat-label">Mass</div>
                    <div class="stat-value">${data.info.mass}</div>
                </div>`;
            }
            if (data.info.composition) {
                html += `<div class="stat-item">
                    <div class="stat-label">Composition</div>
                    <div class="stat-value">${data.info.composition}</div>
                </div>`;
            }
            if (data.info.temperature) {
                html += `<div class="stat-item">
                    <div class="stat-label">Temperature</div>
                    <div class="stat-value">${data.info.temperature}</div>
                </div>`;
            }
            if (data.info.moons !== undefined) {
                html += `<div class="stat-item">
                    <div class="stat-label">Moons</div>
                    <div class="stat-value">${data.info.moons}</div>
                </div>`;
            }
        }

        html += '</div>';
        statsContent.innerHTML = html;
    }

    updateHistoryTab(data) {
        const historyContent = document.getElementById('tab-history');
        let html = '';

        const historyData = this.getHistoryData(data.name, data.type);
        
        html += `<div class="history-section">
            <h3>Discovery</h3>
            <p>${historyData.discovery}</p>
        </div>`;

        if (historyData.timeline && historyData.timeline.length > 0) {
            html += `<div class="history-section">
                <h3>Timeline</h3>
                <ul class="timeline">`;
            historyData.timeline.forEach(event => {
                html += `<li>
                    <strong>${event.year}:</strong> ${event.event}
                </li>`;
            });
            html += `</ul></div>`;
        }

        historyContent.innerHTML = html;
    }

    updateLiteratureTab(data) {
        const literatureContent = document.getElementById('tab-literature');
        let html = '';

        const litData = this.getLiteratureData(data.name, data.type);
        
        if (litData.mythology) {
            html += `<div class="literature-section">
                <h3>Mythology & Culture</h3>
                <p>${litData.mythology}</p>
            </div>`;
        }

        if (litData.literature && litData.literature.length > 0) {
            html += `<div class="literature-section">
                <h3>In Literature</h3>
                <ul>`;
            litData.literature.forEach(ref => {
                html += `<li>${ref}</li>`;
            });
            html += `</ul></div>`;
        }

        if (litData.significance) {
            html += `<div class="literature-section">
                <h3>Cultural Significance</h3>
                <p>${litData.significance}</p>
            </div>`;
        }

        literatureContent.innerHTML = html || '<p>No literature data available.</p>';
    }

    updateMissionsTab(data) {
        const missionsContent = document.getElementById('tab-missions');
        let html = '';

        const missions = this.getMissionsData(data.name, data.type);
        
        if (missions.length > 0) {
            html += '<div class="missions-list">';
            missions.forEach(mission => {
                html += `<div class="mission-item">
                    <h4>${mission.name}</h4>
                    <p><strong>Year:</strong> ${mission.year}</p>
                    <p><strong>Type:</strong> ${mission.type}</p>
                    <p>${mission.description}</p>
                </div>`;
            });
            html += '</div>';
        } else {
            html = '<p>No specific missions recorded for this object.</p>';
        }

        missionsContent.innerHTML = html;
    }

    getHistoryData(name, type) {
        const history = {
            'Sun': {
                discovery: 'The Sun has been observed since ancient times. It was recognized as a star by ancient Greek astronomers.',
                timeline: [
                    { year: '1610', event: 'Galileo observes sunspots with a telescope' },
                    { year: '1843', event: 'Heinrich Schwabe discovers the sunspot cycle' },
                    { year: '1957', event: 'First space-based solar observations begin' }
                ]
            },
            'Mercury': {
                discovery: 'Mercury has been known since at least the time of the Sumerians (3rd millennium BC).',
                timeline: [
                    { year: '1631', event: 'First observed transit by Pierre Gassendi' },
                    { year: '1974', event: 'Mariner 10 becomes first spacecraft to visit Mercury' },
                    { year: '2011', event: 'MESSENGER becomes first spacecraft to orbit Mercury' }
                ]
            },
            'Venus': {
                discovery: 'Venus has been known since prehistoric times. It is the brightest object in the sky after the Sun and Moon.',
                timeline: [
                    { year: '1610', event: 'Galileo observes phases of Venus' },
                    { year: '1962', event: 'Mariner 2 becomes first successful Venus mission' },
                    { year: '1970', event: 'Venera 7 makes first successful landing on Venus' }
                ]
            },
            'Earth': {
                discovery: 'Our home planet, known since the dawn of humanity.',
                timeline: [
                    { year: '1957', event: 'Sputnik 1 - First artificial satellite' },
                    { year: '1961', event: 'Yuri Gagarin becomes first human in space' },
                    { year: '1969', event: 'Apollo 11 - First humans on the Moon' }
                ]
            },
            'Mars': {
                discovery: 'Mars has been known since ancient times. Its red color led to it being named after the Roman god of war.',
                timeline: [
                    { year: '1877', event: 'Asaph Hall discovers Phobos and Deimos' },
                    { year: '1965', event: 'Mariner 4 provides first close-up images' },
                    { year: '1976', event: 'Viking 1 and 2 land on Mars' },
                    { year: '2021', event: 'Perseverance rover lands and Ingenuity helicopter flies' }
                ]
            },
            'Jupiter': {
                discovery: 'Jupiter has been known since ancient times. It is named after the king of the Roman gods.',
                timeline: [
                    { year: '1610', event: 'Galileo discovers the four largest moons' },
                    { year: '1973', event: 'Pioneer 10 becomes first spacecraft to visit Jupiter' },
                    { year: '1995', event: 'Galileo spacecraft arrives and studies Jupiter for 8 years' },
                    { year: '2016', event: 'Juno spacecraft arrives to study Jupiter\'s atmosphere' }
                ]
            },
            'Saturn': {
                discovery: 'Saturn has been known since ancient times. It is the farthest planet visible to the naked eye.',
                timeline: [
                    { year: '1610', event: 'Galileo first observes Saturn\'s rings (though he thought they were moons)' },
                    { year: '1655', event: 'Christiaan Huygens correctly identifies Saturn\'s rings' },
                    { year: '1980-81', event: 'Voyager 1 and 2 fly by Saturn' },
                    { year: '2004', event: 'Cassini-Huygens arrives and studies Saturn for 13 years' }
                ]
            },
            'Uranus': {
                discovery: 'Discovered by William Herschel on March 13, 1781. First planet discovered with a telescope.',
                timeline: [
                    { year: '1781', event: 'William Herschel discovers Uranus' },
                    { year: '1986', event: 'Voyager 2 becomes the only spacecraft to visit Uranus' }
                ]
            },
            'Neptune': {
                discovery: 'Discovered on September 23, 1846 by Johann Galle, based on predictions by Urbain Le Verrier.',
                timeline: [
                    { year: '1846', event: 'Neptune discovered through mathematical prediction' },
                    { year: '1989', event: 'Voyager 2 becomes the only spacecraft to visit Neptune' }
                ]
            },
            'Moon': {
                discovery: 'The Moon has been observed since prehistoric times. It is Earth\'s only natural satellite.',
                timeline: [
                    { year: '1609', event: 'Galileo makes first telescopic observations' },
                    { year: '1959', event: 'Luna 2 becomes first human-made object to reach the Moon' },
                    { year: '1969', event: 'Apollo 11 - First humans land on the Moon' }
                ]
            },
            'ISS': {
                discovery: 'International Space Station - Construction began in 1998.',
                timeline: [
                    { year: '1998', event: 'First module (Zarya) launched' },
                    { year: '2000', event: 'First crew arrives (Expedition 1)' },
                    { year: '2011', event: 'Construction completed' }
                ]
            },
            'Hubble': {
                discovery: 'Hubble Space Telescope - Launched in 1990.',
                timeline: [
                    { year: '1990', event: 'Launched aboard Space Shuttle Discovery' },
                    { year: '1993', event: 'First servicing mission fixes optical flaw' },
                    { year: '2022', event: 'James Webb Space Telescope launched as successor' }
                ]
            },
            'James Webb': {
                discovery: 'James Webb Space Telescope - Launched in 2021.',
                timeline: [
                    { year: '2021', event: 'Launched on December 25' },
                    { year: '2022', event: 'First images released, begins science operations' }
                ]
            },
            'Voyager 1': {
                discovery: 'Voyager 1 - Launched in 1977.',
                timeline: [
                    { year: '1977', event: 'Launched to study outer planets' },
                    { year: '1979', event: 'Flyby of Jupiter' },
                    { year: '1980', event: 'Flyby of Saturn' },
                    { year: '2012', event: 'Enters interstellar space' }
                ]
            },
            'Voyager 2': {
                discovery: 'Voyager 2 - Launched in 1977.',
                timeline: [
                    { year: '1977', event: 'Launched to study outer planets' },
                    { year: '1979', event: 'Flyby of Jupiter' },
                    { year: '1981', event: 'Flyby of Saturn' },
                    { year: '1986', event: 'Flyby of Uranus' },
                    { year: '1989', event: 'Flyby of Neptune' },
                    { year: '2018', event: 'Enters interstellar space' }
                ]
            }
        };

        return history[name] || { discovery: 'Historical information not available.', timeline: [] };
    }

    getLiteratureData(name, type) {
        const literature = {
            'Sun': {
                mythology: 'In many cultures, the Sun is a deity or divine being. In Greek mythology, Helios drives the sun chariot across the sky. In Egyptian mythology, Ra is the sun god.',
                literature: [
                    'Featured in countless myths and legends across all cultures',
                    'Central to many creation stories',
                    'Inspiration for solar deities in religions worldwide'
                ],
                significance: 'The Sun has been worshipped and revered throughout human history as the source of life and light.'
            },
            'Mercury': {
                mythology: 'Named after the Roman messenger god Mercury (Hermes in Greek mythology), known for speed and communication.',
                literature: [
                    'Associated with communication, travel, and commerce',
                    'Appears in astrology as the planet of intellect'
                ],
                significance: 'Mercury\'s rapid movement across the sky led to its association with the swift messenger god.'
            },
            'Venus': {
                mythology: 'Named after the Roman goddess of love and beauty (Aphrodite in Greek). Known as both the Morning Star and Evening Star.',
                literature: [
                    'The "Evening Star" and "Morning Star" in poetry and literature',
                    'Symbol of beauty and love in many cultures',
                    'Featured in Dante\'s Divine Comedy'
                ],
                significance: 'Venus has been a symbol of beauty and femininity across cultures, inspiring art and literature for millennia.'
            },
            'Mars': {
                mythology: 'Named after the Roman god of war (Ares in Greek) due to its red color, reminiscent of blood.',
                literature: [
                    '"The War of the Worlds" by H.G. Wells',
                    '"The Martian Chronicles" by Ray Bradbury',
                    '"The Martian" by Andy Weir',
                    'Countless science fiction stories about Mars colonization'
                ],
                significance: 'Mars has captured human imagination as a potential home for life and future colonization, inspiring generations of science fiction.'
            },
            'Jupiter': {
                mythology: 'Named after the king of the Roman gods (Zeus in Greek), the ruler of the sky and thunder.',
                literature: [
                    'Associated with power, authority, and expansion',
                    'Featured in astrology as the planet of luck and growth'
                ],
                significance: 'Jupiter\'s massive size and prominence in the night sky led to its association with the king of gods.'
            },
            'Saturn': {
                mythology: 'Named after the Roman god of agriculture and time (Cronus in Greek), who was the father of Jupiter.',
                literature: [
                    'Associated with time, discipline, and structure',
                    'Featured in astrology as the planet of limitations and lessons'
                ],
                significance: 'Saturn\'s distinctive rings and slower movement led to associations with time and structure.'
            },
            'Moon': {
                mythology: 'The Moon appears in mythology worldwide. In Greek mythology, Selene drives the moon chariot. Many cultures have moon goddesses.',
                literature: [
                    '"From the Earth to the Moon" by Jules Verne',
                    '"The First Men in the Moon" by H.G. Wells',
                    'Countless poems about the moon',
                    'Lunar imagery in literature throughout history'
                ],
                significance: 'The Moon has been a source of inspiration for poets, artists, and dreamers throughout human history.'
            }
        };

        return literature[name] || { mythology: '', literature: [], significance: '' };
    }

    getMissionsData(name, type) {
        const missions = {
            'Mercury': [
                { name: 'Mariner 10', year: '1974-1975', type: 'Flyby', description: 'First spacecraft to visit Mercury, mapped 45% of the surface.' },
                { name: 'MESSENGER', year: '2011-2015', type: 'Orbiter', description: 'First spacecraft to orbit Mercury, completed detailed mapping and studies.' },
                { name: 'BepiColombo', year: '2025', type: 'Orbiter', description: 'Joint ESA-JAXA mission to study Mercury in detail.' }
            ],
            'Venus': [
                { name: 'Venera Program', year: '1961-1984', type: 'Landers/Orbiters', description: 'Soviet program that achieved first successful landing and surface images.' },
                { name: 'Magellan', year: '1989-1994', type: 'Orbiter', description: 'Mapped 98% of Venus surface using radar.' },
                { name: 'Venus Express', year: '2005-2014', type: 'Orbiter', description: 'ESA mission studying Venus atmosphere and climate.' }
            ],
            'Mars': [
                { name: 'Viking Program', year: '1976', type: 'Landers', description: 'First successful Mars landings, searched for signs of life.' },
                { name: 'Mars Rovers', year: '1997-present', type: 'Rovers', description: 'Sojourner, Spirit, Opportunity, Curiosity, and Perseverance rovers.' },
                { name: 'Mars Reconnaissance Orbiter', year: '2005-present', type: 'Orbiter', description: 'High-resolution imaging and atmospheric studies.' }
            ],
            'Jupiter': [
                { name: 'Pioneer 10 & 11', year: '1973-1974', type: 'Flyby', description: 'First spacecraft to visit Jupiter.' },
                { name: 'Voyager 1 & 2', year: '1979', type: 'Flyby', description: 'Detailed studies of Jupiter and its moons.' },
                { name: 'Galileo', year: '1995-2003', type: 'Orbiter', description: 'First spacecraft to orbit Jupiter, studied for 8 years.' },
                { name: 'Juno', year: '2016-present', type: 'Orbiter', description: 'Studying Jupiter\'s atmosphere, magnetic field, and interior structure.' }
            ],
            'Saturn': [
                { name: 'Pioneer 11', year: '1979', type: 'Flyby', description: 'First spacecraft to visit Saturn.' },
                { name: 'Voyager 1 & 2', year: '1980-1981', type: 'Flyby', description: 'Detailed studies of Saturn and its rings.' },
                { name: 'Cassini-Huygens', year: '2004-2017', type: 'Orbiter/Lander', description: 'Studied Saturn for 13 years, Huygens landed on Titan.' }
            ],
            'Uranus': [
                { name: 'Voyager 2', year: '1986', type: 'Flyby', description: 'Only spacecraft to visit Uranus, discovered 10 new moons.' }
            ],
            'Neptune': [
                { name: 'Voyager 2', year: '1989', type: 'Flyby', description: 'Only spacecraft to visit Neptune, discovered 6 new moons and rings.' }
            ],
            'Moon': [
                { name: 'Apollo Program', year: '1969-1972', type: 'Manned Landings', description: '6 successful manned landings, 12 astronauts walked on the Moon.' },
                { name: 'Lunar Reconnaissance Orbiter', year: '2009-present', type: 'Orbiter', description: 'High-resolution mapping of the lunar surface.' },
                { name: 'Artemis Program', year: '2024+', type: 'Manned Missions', description: 'NASA program to return humans to the Moon and establish a base.' }
            ]
        };

        return missions[name] || [];
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.inspector-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabName}`);
        });
    }

    close() {
        this.isActive = false;
        this.container.classList.add('hidden');
        
        // Clean up inspector scene
        if (this.inspectionGroup) {
            this.inspectorScene.remove(this.inspectionGroup);
            this.inspectionGroup = null;
        }
        
        this.currentObject = null;
    }
}

