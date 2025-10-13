import * as THREE from 'three';
import Component from '../../Component.js';

export default class SafeZone extends Component {
    constructor(scene) {
        super();
        this.name = 'SafeZone';
        this.scene = scene;
        this.safeZoneMesh = null;
        this.isActive = false;
        this.pulseTime = 0;
        this.currentPosition = null;
    }

    Initialize() {
        this.CreateSafeZoneVisual();
    }

    CreateSafeZoneVisual() {
        // Crear círculo base en el suelo (más plano y visible)
        const baseGeometry = new THREE.CircleGeometry(5, 64);
        const baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });

        this.safeZoneBase = new THREE.Mesh(baseGeometry, baseMaterial);
        this.safeZoneBase.rotation.x = -Math.PI / 2;
        this.safeZoneBase.position.y = 0.05;
        this.safeZoneBase.visible = false;

        // Crear círculo interior más brillante
        const innerGeometry = new THREE.CircleGeometry(3, 64);
        const innerMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        this.innerCircle = new THREE.Mesh(innerGeometry, innerMaterial);
        this.innerCircle.rotation.x = -Math.PI / 2;
        this.innerCircle.position.y = 0.08;
        this.innerCircle.visible = false;
        
        // Crear múltiples anillos concéntricos en el suelo
        this.safeZoneRings = [];
        for (let i = 0; i < 4; i++) {
            const ringGeometry = new THREE.RingGeometry(3 + i * 0.5, 3.3 + i * 0.5, 64);
            const ringMaterial = new THREE.MeshBasicMaterial({
                color: 0x00ff41,
                transparent: true,
                opacity: 0.9 - i * 0.15,
                side: THREE.DoubleSide
            });
            
            const ring = new THREE.Mesh(ringGeometry, ringMaterial);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.1 + i * 0.02;
            ring.visible = false;
            
            this.safeZoneRings.push(ring);
            this.scene.add(ring);
        }
        
        // Crear borde exterior brillante
        const outerRingGeometry = new THREE.RingGeometry(4.8, 5.2, 64);
        const outerRingMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide
        });
        
        this.outerRing = new THREE.Mesh(outerRingGeometry, outerRingMaterial);
        this.outerRing.rotation.x = -Math.PI / 2;
        this.outerRing.position.y = 0.2;
        this.outerRing.visible = false;
        
        // Crear efecto de partículas/luz central (más pequeño)
        const lightGeometry = new THREE.CylinderGeometry(0.2, 1, 4, 32);
        const lightMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 0.8
        });
        
        this.centralLight = new THREE.Mesh(lightGeometry, lightMaterial);
        this.centralLight.position.y = 2;
        this.centralLight.visible = false;
        
        // Crear haz de luz hacia arriba (más sutil)
        const beamGeometry = new THREE.CylinderGeometry(0.05, 0.5, 15, 16);
        const beamMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 0.4
        });
        
        this.lightBeam = new THREE.Mesh(beamGeometry, beamMaterial);
        this.lightBeam.position.y = 7.5;
        this.lightBeam.visible = false;
        
        this.scene.add(this.safeZoneBase);
        this.scene.add(this.innerCircle);
        this.scene.add(this.outerRing);
        this.scene.add(this.centralLight);
        this.scene.add(this.lightBeam);
    }

    ActivateAt(position) {
        if (this.safeZoneBase) {
            // Guardar posición actual
            this.currentPosition = [position[0], position[1], position[2]];
            
            // Posicionar todos los elementos
            this.safeZoneBase.position.set(position[0], position[1] + 0.05, position[2]);
            this.innerCircle.position.set(position[0], position[1] + 0.08, position[2]);
            this.outerRing.position.set(position[0], position[1] + 0.2, position[2]);
            this.centralLight.position.set(position[0], position[1] + 2, position[2]);
            this.lightBeam.position.set(position[0], position[1] + 7.5, position[2]);
            
            // Posicionar anillos
            this.safeZoneRings.forEach((ring, i) => {
                ring.position.set(position[0], position[1] + 0.1 + i * 0.02, position[2]);
                ring.visible = true;
            });
            
            // Hacer visible todo
            this.safeZoneBase.visible = true;
            this.innerCircle.visible = true;
            this.outerRing.visible = true;
            this.centralLight.visible = true;
            this.lightBeam.visible = true;
            this.isActive = true;
            this.pulseTime = 0;
        }
    }

    Deactivate() {
        if (this.safeZoneBase) {
            this.safeZoneBase.visible = false;
            this.innerCircle.visible = false;
            this.outerRing.visible = false;
            this.centralLight.visible = false;
            this.lightBeam.visible = false;
            
            this.safeZoneRings.forEach(ring => {
                ring.visible = false;
            });
            
            this.isActive = false;
        }
    }

    Update(deltaTime) {
        if (this.isActive && this.safeZoneBase) {
            // Efecto de pulsación
            this.pulseTime += deltaTime * 2;
            const pulse = (Math.sin(this.pulseTime) + 1) * 0.5;
            const fastPulse = (Math.sin(this.pulseTime * 4) + 1) * 0.5;
            
            // Variar la opacidad de la base
            this.safeZoneBase.material.opacity = 0.4 + pulse * 0.3;
            
            // Animar círculo interior
            this.innerCircle.material.opacity = 0.6 + pulse * 0.4;
            this.innerCircle.rotation.z -= deltaTime * 0.5;
            
            // Animar anillos concéntricos
            this.safeZoneRings.forEach((ring, i) => {
                ring.material.opacity = 0.7 + pulse * 0.3 - i * 0.1;
                ring.rotation.z += deltaTime * (0.3 + i * 0.1);
                
                // Efecto de escala pulsante
                const scale = 1 + fastPulse * 0.05;
                ring.scale.set(scale, scale, scale);
            });
            
            // Animar borde exterior
            this.outerRing.material.opacity = 0.8 + pulse * 0.2;
            this.outerRing.rotation.z -= deltaTime * 0.8;
            
            // Animar luz central
            this.centralLight.material.opacity = 0.6 + pulse * 0.4;
            this.centralLight.rotation.y += deltaTime * 3;
            
            // Animar haz de luz
            this.lightBeam.material.opacity = 0.3 + pulse * 0.2;
            this.lightBeam.rotation.y += deltaTime * 1.2;
            
            // Rotar base principal lentamente
            this.safeZoneBase.rotation.z += deltaTime * 0.2;
        }
    }

    Cleanup() {
        if (this.safeZoneBase) {
            this.scene.remove(this.safeZoneBase);
            this.scene.remove(this.innerCircle);
            this.scene.remove(this.outerRing);
            this.scene.remove(this.centralLight);
            this.scene.remove(this.lightBeam);
            
            this.safeZoneRings.forEach(ring => {
                this.scene.remove(ring);
            });
        }
    }
}