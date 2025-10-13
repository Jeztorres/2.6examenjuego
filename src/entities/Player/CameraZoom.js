import * as THREE from 'three';
import Component from '../../Component.js';
import Input from '../../Input.js';

export default class CameraZoom extends Component {
    constructor(camera, scene, renderer) {
        super();
        this.name = 'CameraZoom';
        this.camera = camera;
        this.scene = scene;
        this.renderer = renderer;
        
        // Configuración de zoom
        this.minZoom = 1;
        this.maxZoom = 10;
        this.currentZoom = 1;
        this.zoomSpeed = 0.1;
        this.smoothZoom = 1;
        this.zoomSmoothness = 5;
        
        // Configuración de niebla mejorada para cubrir todo el mapa
        this.baseFogNear = 8;
        this.baseFogFar = 40;
        this.maxFogNear = 15;
        this.maxFogFar = 120;
        
        // Posición original de la cámara
        this.originalCameraPosition = new THREE.Vector3();
        this.targetCameraPosition = new THREE.Vector3();
        this.cameraOffset = new THREE.Vector3(0, 0, 0);
        
        // Estado del jugador
        this.playerPosition = new THREE.Vector3();
        this.isZooming = false;
        
        // Navegación con mouse en modo zoom
        this.cameraLookOffset = new THREE.Vector3(0, 0, 0);
        this.mouseSensitivity = 0.5;
        this.maxLookDistance = 50; // Aumentado para más libertad de movimiento
        
        // Navegación con teclas en modo zoom
        this.keyboardMoveSpeed = 10;
        this.cameraFreePosition = new THREE.Vector3(0, 0, 0);
        
        // Referencias para ocultar elementos en zoom
        this.weaponModel = null;
    }

    Initialize() {
        this.SetupFog();
        this.SetupInput();
        
        // Guardar posición original de la cámara
        this.originalCameraPosition.copy(this.camera.position);
        
        // Buscar el arma en los hijos de la cámara
        this.FindWeaponModel();
    }

    FindWeaponModel() {
        // Buscar el modelo del arma que está attachado a la cámara
        this.camera.traverse((child) => {
            if (child.isGroup || child.isMesh) {
                // El arma suele ser el primer grupo/mesh hijo de la cámara
                if (!this.weaponModel && child !== this.camera) {
                    this.weaponModel = child;
                }
            }
        });
    }

    SetupFog() {
        // Usar niebla exponencial para mejor cobertura del mapa
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);
        
        // Configurar renderer para niebla
        this.renderer.setClearColor(0x87CEEB, 1);
        
        // Asegurar que la niebla se aplique a todos los materiales
        this.scene.traverse((child) => {
            if (child.material) {
                child.material.fog = true;
            }
        });
    }

    SetupInput() {
        // Escuchar teclas para zoom
        Input.AddKeyDownListner(this.OnKeyDown);
        Input.AddKeyUpListner(this.OnKeyUp);
        
        // Escuchar movimiento del mouse para navegación en zoom
        Input.AddMouseMoveListner(this.OnMouseMoveZoom);
        
        // Variables para zoom continuo con teclas
        this.zoomInPressed = false;
        this.zoomOutPressed = false;
    }



    OnKeyDown = (event) => {
        // Zoom con solo 2 teclas simples
        if (event.code === 'KeyT') { // T para Zoom In (acercar)
            this.zoomInPressed = true;
        } else if (event.code === 'KeyG') { // G para Zoom Out (alejar)
            this.zoomOutPressed = true;
        }
    }

    OnKeyUp = (event) => {
        // Resetear zoom con R (más intuitivo - Reset)
        if (event.code === 'KeyR') {
            this.currentZoom = 1;
            this.isZooming = false;
            this.cameraLookOffset.set(0, 0, 0); // Reset navegación con mouse
            this.cameraFreePosition.set(0, 0, 0); // Reset navegación con teclas
        }
        
        // Detener zoom continuo
        if (event.code === 'KeyT') {
            this.zoomInPressed = false;
        } else if (event.code === 'KeyG') {
            this.zoomOutPressed = false;
        }
    }

    OnMouseMoveZoom = (event) => {
        // Solo permitir navegación con mouse si estamos en modo zoom
        if (!this.IsZooming()) return;
        
        // Verificar si el pointer está bloqueado (jugando)
        if (!document.pointerLockElement) return;
        
        const { movementX, movementY } = event;
        
        // Actualizar offset de la cámara basado en el movimiento del mouse
        this.cameraLookOffset.x += movementX * this.mouseSensitivity * 0.1;
        this.cameraLookOffset.z += movementY * this.mouseSensitivity * 0.1;
        
        // Limitar el rango de navegación (más amplio)
        this.cameraLookOffset.x = Math.max(-this.maxLookDistance, Math.min(this.maxLookDistance, this.cameraLookOffset.x));
        this.cameraLookOffset.z = Math.max(-this.maxLookDistance, Math.min(this.maxLookDistance, this.cameraLookOffset.z));
    }

    UpdateKeyboardMovement(deltaTime) {
        // Solo permitir movimiento con teclas si estamos en modo zoom
        if (!this.IsZooming()) return;
        
        // Obtener input de teclas WASD
        const forwardPressed = Input.GetKeyDown("KeyW");
        const backwardPressed = Input.GetKeyDown("KeyS");
        const leftPressed = Input.GetKeyDown("KeyA");
        const rightPressed = Input.GetKeyDown("KeyD");
        
        // Calcular dirección de movimiento
        const moveSpeed = this.keyboardMoveSpeed * deltaTime;
        
        if (forwardPressed) {
            this.cameraFreePosition.z -= moveSpeed;
        }
        if (backwardPressed) {
            this.cameraFreePosition.z += moveSpeed;
        }
        if (leftPressed) {
            this.cameraFreePosition.x -= moveSpeed;
        }
        if (rightPressed) {
            this.cameraFreePosition.x += moveSpeed;
        }
        
        // Limitar el rango de movimiento
        this.cameraFreePosition.x = Math.max(-this.maxLookDistance, Math.min(this.maxLookDistance, this.cameraFreePosition.x));
        this.cameraFreePosition.z = Math.max(-this.maxLookDistance, Math.min(this.maxLookDistance, this.cameraFreePosition.z));
    }

    UpdateCameraPosition(playerPosition) {
        this.playerPosition.copy(playerPosition);
        
        // Suavizar el zoom
        this.smoothZoom = THREE.MathUtils.lerp(this.smoothZoom, this.currentZoom, this.zoomSmoothness * 0.016);
        
        const isZoomingNow = this.isZooming || this.smoothZoom > 1.01;
        
        if (isZoomingNow) {
            // Modo zoom: cámara se aleja hacia arriba y atrás (altura muy reducida)
            const zoomHeight = this.smoothZoom * 2; // Reducido a 2 para estar mucho más bajo
            const zoomDistance = this.smoothZoom * 1.5; // Reducido a 1.5 para estar muy cerca
            
            // Aplicar offset de navegación con mouse y teclas
            this.targetCameraPosition.set(
                playerPosition.x + this.cameraLookOffset.x + this.cameraFreePosition.x,
                playerPosition.y + zoomHeight,
                playerPosition.z + zoomDistance + this.cameraLookOffset.z + this.cameraFreePosition.z
            );
            
            // Hacer que la cámara mire hacia el jugador (siempre visible)
            const lookAtTarget = new THREE.Vector3(
                playerPosition.x, 
                playerPosition.y + 1, // Mirar un poco arriba del jugador para verlo mejor
                playerPosition.z
            );
            this.camera.lookAt(lookAtTarget);
            
            // Ocultar el arma en modo zoom
            this.HideWeapon(true);
            
        } else {
            // Modo normal: cámara en primera persona
            this.targetCameraPosition.copy(playerPosition);
            this.targetCameraPosition.y += 0.5; // Offset de altura del jugador
            
            // Mostrar el arma en modo normal
            this.HideWeapon(false);
        }
        
        // Suavizar movimiento de cámara
        this.camera.position.lerp(this.targetCameraPosition, 0.1);
    }

    HideWeapon(hide) {
        if (this.weaponModel) {
            this.weaponModel.visible = !hide;
        }
        
        // También buscar y ocultar todos los modelos de arma en la cámara
        this.camera.traverse((child) => {
            if (child.isMesh || child.isGroup) {
                if (child !== this.camera && child.parent === this.camera) {
                    child.visible = !hide;
                }
            }
        });
    }

    UpdateFog() {
        if (!this.scene.fog) return;
        
        // Calcular intensidad de niebla basada en el zoom
        const fogIntensity = Math.pow((this.smoothZoom - 1) / (this.maxZoom - 1), 0.6);
        
        // Ajustar densidad de niebla exponencial para cubrir todo el mapa
        const baseDensity = 0.008; // Niebla base muy sutil
        const maxDensity = 0.045;  // Niebla máxima que cubre todo
        const fogDensity = THREE.MathUtils.lerp(baseDensity, maxDensity, fogIntensity);
        
        this.scene.fog.density = fogDensity;
        
        // Cambiar color de niebla de manera más gradual y atmosférica
        const fogColor = new THREE.Color();
        if (fogIntensity > 0.8) {
            // Niebla muy densa y gris muy oscuro - casi no se ve nada lejano
            fogColor.setHex(0x2a2a2a);
        } else if (fogIntensity > 0.6) {
            // Niebla densa gris oscuro
            fogColor.setHex(0x3a3a3a);
        } else if (fogIntensity > 0.4) {
            // Niebla gris medio
            fogColor.setHex(0x4a4a4a);
        } else if (fogIntensity > 0.2) {
            // Niebla gris azulada
            fogColor.setHex(0x5a5a6a);
        } else if (fogIntensity > 0.05) {
            // Niebla azul grisácea
            fogColor.setHex(0x6a7080);
        } else {
            // Niebla azul clara normal
            fogColor.setHex(0x87CEEB);
        }
        
        this.scene.fog.color.copy(fogColor);
        this.renderer.setClearColor(fogColor, 1);
    }

    GetZoomLevel() {
        return this.currentZoom;
    }

    IsZooming() {
        return this.isZooming || this.smoothZoom > 1.01;
    }

    Update(deltaTime) {
        // Zoom continuo con teclas mantenidas presionadas
        if (this.zoomInPressed) {
            this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom + this.zoomSpeed * 3 * deltaTime * 60));
            this.isZooming = this.currentZoom > 1;
        }
        
        if (this.zoomOutPressed) {
            this.currentZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.currentZoom - this.zoomSpeed * 3 * deltaTime * 60));
            this.isZooming = this.currentZoom > 1;
        }
        
        // Actualizar movimiento con teclas en modo zoom
        this.UpdateKeyboardMovement(deltaTime);
        
        this.UpdateFog();
    }

    Cleanup() {
        // Restaurar niebla original
        if (this.scene.fog) {
            if (this.scene.fog.isFogExp2) {
                this.scene.fog.density = 0.008;
            } else {
                this.scene.fog.near = this.baseFogNear;
                this.scene.fog.far = this.baseFogFar;
            }
            this.scene.fog.color.setHex(0x87CEEB);
        }
        this.renderer.setClearColor(0x87CEEB, 1);
        
        // Asegurar que el arma esté visible al limpiar
        this.HideWeapon(false);
    }
}