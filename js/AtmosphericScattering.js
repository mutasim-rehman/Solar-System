import * as THREE from 'three';

// Atmospheric scattering shader for realistic planet atmospheres
export class AtmosphericScattering {
    constructor() {
        this.shader = null;
    }

    createAtmosphereShader(planetRadius, atmosphereHeight, sunPosition) {
        return {
            uniforms: {
                'cameraPosition': { value: new THREE.Vector3() },
                'lightDirection': { value: new THREE.Vector3() },
                'planetRadius': { value: planetRadius },
                'atmosphereRadius': { value: planetRadius + atmosphereHeight },
                'rayleighCoefficient': { value: new THREE.Vector3(5.8e-6, 13.5e-6, 33.1e-6) },
                'mieCoefficient': { value: 21e-6 },
                'mieDirectionalG': { value: 0.758 },
                'sunIntensity': { value: 20.0 },
                'exposure': { value: 0.6 }
            },
            vertexShader: `
                varying vec3 vWorldPosition;
                varying vec3 vWorldNormal;
                
                void main() {
                    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                    vWorldPosition = worldPosition.xyz;
                    vWorldNormal = normalize(normalMatrix * normal);
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 cameraPosition;
                uniform vec3 lightDirection;
                uniform float planetRadius;
                uniform float atmosphereRadius;
                uniform vec3 rayleighCoefficient;
                uniform float mieCoefficient;
                uniform float mieDirectionalG;
                uniform float sunIntensity;
                uniform float exposure;
                
                varying vec3 vWorldPosition;
                varying vec3 vWorldNormal;
                
                const int numSamples = 16;
                const float numSamplesf = float(numSamples);
                
                float scale(float cos) {
                    float x = 1.0 - cos;
                    return 0.25 * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
                }
                
                void main() {
                    vec3 direction = normalize(vWorldPosition - cameraPosition);
                    vec3 normal = normalize(vWorldNormal);
                    
                    float cameraHeight = length(cameraPosition);
                    float rayLength = length(vWorldPosition - cameraPosition);
                    
                    vec3 rayStart = cameraPosition;
                    vec3 rayDir = direction;
                    
                    float cosAngle = dot(rayDir, lightDirection);
                    float rayleighPhase = 0.75 * (1.0 + cosAngle * cosAngle);
                    float g = mieDirectionalG;
                    float miePhase = 1.5 * ((1.0 - g * g) / (2.0 + g * g)) * 
                                    (1.0 + cosAngle * cosAngle) / pow(abs(1.0 + g * g - 2.0 * g * cosAngle), 1.5);
                    
                    vec3 rayleigh = vec3(0.0);
                    float mie = 0.0;
                    
                    float sampleLength = rayLength / numSamplesf;
                    float scaledLength = sampleLength / atmosphereRadius;
                    vec3 sampleRay = rayDir * sampleLength;
                    vec3 samplePoint = rayStart + sampleRay * 0.5;
                    
                    for(int i = 0; i < numSamples; i++) {
                        float height = length(samplePoint);
                        float density = 0.0;
                        
                        if(height < atmosphereRadius) {
                            float h = height - planetRadius;
                            density = exp(-h / 8.0);
                        }
                        
                        float sunAngle = dot(normalize(samplePoint), lightDirection);
                        float sunAngle2 = sunAngle * sunAngle;
                        float sunAngle4 = sunAngle2 * sunAngle2;
                        
                        rayleigh += density * scaledLength * rayleighCoefficient;
                        mie += density * scaledLength * mieCoefficient;
                        
                        samplePoint += sampleRay;
                    }
                    
                    vec3 color = rayleigh * rayleighPhase * sunIntensity + 
                                vec3(mie) * miePhase * sunIntensity;
                    
                    color = 1.0 - exp(-1.0 * exposure * color);
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `
        };
    }

    createAtmosphereMesh(planetRadius, atmosphereHeight, segments = 32) {
        const geometry = new THREE.SphereGeometry(
            planetRadius + atmosphereHeight,
            segments,
            segments
        );
        
        const material = new THREE.ShaderMaterial({
            uniforms: this.createAtmosphereShader(planetRadius, atmosphereHeight, new THREE.Vector3(0, 0, 0)).uniforms,
            vertexShader: this.createAtmosphereShader(planetRadius, atmosphereHeight, new THREE.Vector3(0, 0, 0)).vertexShader,
            fragmentShader: this.createAtmosphereShader(planetRadius, atmosphereHeight, new THREE.Vector3(0, 0, 0)).fragmentShader,
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        return mesh;
    }

    updateUniforms(mesh, cameraPosition, sunPosition) {
        if (mesh.material && mesh.material.uniforms) {
            mesh.material.uniforms.cameraPosition.value.copy(cameraPosition);
            mesh.material.uniforms.lightDirection.value.copy(sunPosition).normalize();
        }
    }
}

