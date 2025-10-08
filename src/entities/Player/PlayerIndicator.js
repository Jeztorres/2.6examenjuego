import * as THREE from 'three';
import Component from '../../Component';

export default class PlayerIndicator extends Component {
    constructor(scene) {
        super();
        this.name = 'PlayerIndicator';
        this.scene = scene;
        this.indicatorGroup = null;
        this.isVisible = false;
        this.pulseTime = 0;
    }

    Initialize() {
        this.CreatePlayerIndicator();
    }

    CreatePlayerIndicator() {
        // Crear grupo para el indicador del jugador
        this.indicatorGroup = new THREE.Group();
        
        // Crear círculo base para marcar la posición del jugador
        const baseGeometry = new THREE.CircleGeometry(0.8, 16);
        const baseMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.7,
            side: THREE.DoubleSide
        });
        
        this.playerBase = new THREE.Mesh(baseGeometry, baseMaterial);
        this.playerBase.rotation.x = -Math.PI / 2;
        this.playerBase.position.y = 0.1;
        this.indicatorGroup.add(this.playerBase);
        
        // Crear anillo exterior pulsante
        const ringGeometry = new THREE.RingGeometry(0.9, 1.2, 16);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        
        this.playerRing = new THREE.Mesh(ringGeometry, ringMaterial);
        this.playerRing.rotation.x = -Math.PI / 2;
        this.playerRing.position.y = 0.15;
        this.indicatorGroup.add(this.playerRing);
        
        // Crear flecha direccional para mostrar hacia dónde mira el jugador
        const arrowGeometry = new THREE.ConeGeometry(0.3, 1, 8);
        const arrowMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9
        });
        
        this.playerArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        this.playerArrow.rotation.x = -Math.PI / 2;
        this.playerArrow.position.y = 0.5;
        this.indicatorGroup.add(this.playerArrow);
        
        // Inicialmente invisible
        this.indicatorGroup.visible = false;
        this.scene.add(this.indicatorGroup);
    }

    ShowIndicator(show = true) {
        this.isVisible = show;
        if (this.indicatorGroup) {
            this.indicatorGroup.visible = show;
        }
    }

    UpdatePosition(playerPosition, playerRotation) {
        if (this.indicatorGroup && this.isVisible) {
            // Posicionar el indicador en la posición del jugador
            this.indicatorGroup.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
            
            // Rotar la flecha para mostrar la dirección del jugador
            if (this.playerArrow && playerRotation) {
                this.playerArrow.rotation.z = -playerRotation.y; // Rotar según la orientación del jugador
            }
        }
    }

    Update(deltaTime) {
        if (this.isVisible && this.indicatorGroup) {
            // Efecto de pulsación
            this.pulseTime += deltaTime * 3;
            const pulse = (Math.sin(this.pulseTime) + 1) * 0.5;
            
            // Animar el anillo exterior
            this.playerRing.material.opacity = 0.3 + pulse * 0.4;
            this.playerRing.rotation.z += deltaTime * 2;
            
            // Animar la base con pulsación sutil
            this.playerBase.material.opacity = 0.6 + pulse * 0.2;
            
            // Hacer que la flecha pulse ligeramente
            const arrowScale = 1 + pulse * 0.1;
            this.playerArrow.scale.set(arrowScale, arrowScale, arrowScale);
        }
    }

    Cleanup() {
        if (this.indicatorGroup) {
            this.scene.remove(this.indicatorGroup);
        }
    }
}