import * as THREE from 'three';
import Component from '../../Component.js';

export default class PlayerModel extends Component {
    constructor(scene, ak47Asset) {
        super();
        this.name = 'PlayerModel';
        this.scene = scene;
        this.ak47Asset = ak47Asset;
        this.playerModel = null;
        this.weaponModel = null;
        this.isVisible = false;
    }

    Initialize() {
        this.CreatePlayerModel();
    }

    CreatePlayerModel() {
        // Crear grupo principal para el jugador (vacío - no mostrar nada)
        this.playerModel = new THREE.Group();
        
        // No crear nada - el jugador debe ser invisible cuando se aleja la cámara
        
        // Inicialmente invisible
        this.playerModel.visible = false;
        this.scene.add(this.playerModel);
    }

    CreateRealWeapon() {
        // No crear arma - el jugador debe ser completamente invisible
        this.weaponModel = null;
    }

    CreateSimpleWeapon() {
        // Crear arma simple como fallback
        this.weaponModel = new THREE.Group();
        
        const weaponGeometry = new THREE.BoxGeometry(0.6, 0.08, 0.04);
        const weaponMaterial = new THREE.MeshLambertMaterial({
            color: 0x2c2c2c,
        });
        
        const weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weaponModel.add(weapon);
        
        this.weaponModel.position.set(0.4, 1.2, 0.1);
        this.weaponModel.rotation.set(0, 0.1, -0.2);
        
        this.playerModel.add(this.weaponModel);
    }

    ShowModel(show = true) {
        this.isVisible = show;
        if (this.playerModel) {
            this.playerModel.visible = show;
        }
    }

    UpdatePosition(playerPosition, playerRotation) {
        if (this.playerModel && this.isVisible) {
            // Posicionar el modelo en la posición del jugador
            this.playerModel.position.set(playerPosition.x, playerPosition.y, playerPosition.z);
            
            // Rotar el modelo según la orientación del jugador
            if (playerRotation) {
                this.playerModel.rotation.y = playerRotation.y;
            }
        }
    }

    Update(deltaTime) {
        // No hay nada que animar - el jugador es invisible
    }

    Cleanup() {
        if (this.playerModel) {
            this.scene.remove(this.playerModel);
        }
    }
}