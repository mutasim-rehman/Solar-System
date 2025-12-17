// Post-processing effects system (Bloom, Lens Flare, etc.)
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { Lensflare, LensflareElement } from 'three/addons/objects/Lensflare.js';

export class PostProcessing {
    constructor(renderer, scene, camera) {
        this.renderer = renderer;
        this.scene = scene;
        this.camera = camera;
        this.composer = null;
        this.bloomPass = null;
        this.enabled = true;
        this.init();
    }

    init() {
        // Create effect composer
        this.composer = new EffectComposer(this.renderer);
        
        // Render pass
        const renderPass = new RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);
        
        // Bloom pass for stars and bright objects
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            1.5,  // strength
            0.4,  // radius
            0.85  // threshold
        );
        this.composer.addPass(this.bloomPass);
        
        // Color grading pass
        const colorGradingPass = this.createColorGradingPass();
        if (colorGradingPass) {
            this.composer.addPass(colorGradingPass);
        }
    }

    createColorGradingPass() {
        // Simple color grading shader
        const colorGradingShader = {
            uniforms: {
                tDiffuse: { value: null },
                exposure: { value: 1.0 },
                contrast: { value: 1.0 },
                saturation: { value: 1.0 }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D tDiffuse;
                uniform float exposure;
                uniform float contrast;
                uniform float saturation;
                varying vec2 vUv;
                
                void main() {
                    vec4 texel = texture2D(tDiffuse, vUv);
                    vec3 color = texel.rgb;
                    
                    // Exposure
                    color *= exposure;
                    
                    // Contrast
                    color = (color - 0.5) * contrast + 0.5;
                    
                    // Saturation
                    float gray = dot(color, vec3(0.299, 0.587, 0.114));
                    color = mix(vec3(gray), color, saturation);
                    
                    gl_FragColor = vec4(color, texel.a);
                }
            `
        };
        
        const pass = new ShaderPass(colorGradingShader);
        pass.renderToScreen = true;
        return pass;
    }

    addLensFlare(light, color = 0xffffff, size = 100) {
        const textureLoader = new THREE.TextureLoader();
        const textureFlare0 = textureLoader.load('textures/lensflare/lensflare0.png');
        const textureFlare3 = textureLoader.load('textures/lensflare/lensflare3.png');
        
        const lensflare = new Lensflare();
        
        lensflare.addElement(new LensflareElement(textureFlare0, 512, 0, color));
        lensflare.addElement(new LensflareElement(textureFlare3, 60, 0.6, color));
        lensflare.addElement(new LensflareElement(textureFlare3, 70, 0.7, color));
        lensflare.addElement(new LensflareElement(textureFlare3, 120, 0.9, color));
        lensflare.addElement(new LensflareElement(textureFlare3, 70, 1.0, color));
        
        light.add(lensflare);
        return lensflare;
    }

    setBloomStrength(strength) {
        if (this.bloomPass) {
            this.bloomPass.strength = strength;
        }
    }

    setBloomRadius(radius) {
        if (this.bloomPass) {
            this.bloomPass.radius = radius;
        }
    }

    setBloomThreshold(threshold) {
        if (this.bloomPass) {
            this.bloomPass.threshold = threshold;
        }
    }

    resize(width, height) {
        if (this.composer) {
            this.composer.setSize(width, height);
        }
    }

    render() {
        if (this.enabled && this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    dispose() {
        if (this.composer) {
            this.composer.dispose();
        }
    }
}

