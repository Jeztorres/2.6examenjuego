import * as THREE from 'three';
import Component from '../../Component.js';

export default class HealthBar extends Component {
    constructor(scene, maxHealth = 50) {
        super();
        this.name = 'HealthBar';
        this.scene = scene;
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.healthBarGroup = null;
        this.healthBarFill = null;
        this.healthBarBackground = null;
        this.healthBarGlow = null;
        this.isVisible = false;
        this.hideTimer = 0;
        this.hideDelay = 4; // Ocultar después de 4 segundos sin daño
        this.pulseTime = 0;
        this.damageFlashTime = 0;
    }

    Initialize() {
        this.CreateHealthBar();
    }

    CreateHealthBar() {
        // Crear grupo para la barra de vida
        this.healthBarGroup = new THREE.Group();
        
        // Crear fondo de la barra (negro/gris)
        const backgroundGeometry = new THREE.PlaneGeometry(2.5, 0.3);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x222222,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.healthBarGroup.add(this.healthBarBackground);
        
        // Crear borde de la barra
        const borderGeometry = new THREE.PlaneGeometry(2.6, 0.4);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = -0.002;
        this.healthBarGroup.add(border);
        
        // Crear relleno de la barra (vida actual)
        const fillGeometry = new THREE.PlaneGeometry(2.4, 0.25);
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        
        this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
        this.healthBarFill.position.z = 0.001;
        this.healthBarGroup.add(this.healthBarFill);
        
        // Crear efecto de brillo
        const glowGeometry = new THREE.PlaneGeometry(2.4, 0.25);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });
        
        this.healthBarGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.healthBarGlow.position.z = 0.002;
        this.healthBarGlow.scale.set(1.1, 1.5, 1);
        this.healthBarGroup.add(this.healthBarGlow);
        
        // Posicionar la barra sobre el mutante
        this.healthBarGroup.position.y = 3.5;
        this.healthBarGroup.visible = false;
        
        this.scene.add(this.healthBarGroup);
    }

    UpdateHealth(newHealth) {
        const oldHealth = this.currentHealth;
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, newHealth));
        
        // Activar efecto de flash si recibió daño
        if (this.currentHealth < oldHealth) {
            this.damageFlashTime = 0.3; // Flash por 0.3 segundos
        }
        
        // Mostrar barra cuando recibe daño
        this.ShowHealthBar();
        
        // Actualizar escala del relleno
        const healthPercentage = this.currentHealth / this.maxHealth;
        this.healthBarFill.scale.x = healthPercentage;
        
        // Cambiar color basado en la vida restante
        let color, glowColor;
        if (healthPercentage > 0.6) {
            color = 0x00ff41; // Verde brillante
            glowColor = 0x00ff41;
        } else if (healthPercentage > 0.3) {
            color = 0xffa502; // Naranja
            glowColor = 0xffa502;
        } else {
            color = 0xff4757; // Rojo
            glowColor = 0xff4757;
        }
        
        this.healthBarFill.material.color.setHex(color);
        this.healthBarGlow.material.color.setHex(glowColor);
        
        // Ajustar escala del brillo también
        this.healthBarGlow.scale.x = healthPercentage * 1.1;
        
        // Ajustar posición para que se mantenga alineada a la izquierda
        this.healthBarFill.position.x = -1.2 + (healthPercentage * 1.2);
        this.healthBarGlow.position.x = -1.2 + (healthPercentage * 1.2);
    }

    ShowHealthBar() {
        this.isVisible = true;
        this.hideTimer = 0;
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = true;
        }
    }

    HideHealthBar() {
        this.isVisible = false;
        if (this.healthBarGroup) {
            this.healthBarGroup.visible = false;
        }
    }

    UpdatePosition(position) {
        if (this.healthBarGroup) {
            this.healthBarGroup.position.x = position.x;
            this.healthBarGroup.position.z = position.z;
        }
    }

    Update(deltaTime, camera) {
        if (this.isVisible && this.healthBarGroup) {
            // Hacer que la barra siempre mire hacia la cámara
            this.healthBarGroup.lookAt(camera.position);
            
            // Efecto de pulsación sutil
            this.pulseTime += deltaTime * 2;
            const pulse = 1 + Math.sin(this.pulseTime) * 0.05;
            this.healthBarGlow.scale.y = 1.5 * pulse;
            
            // Efecto de flash cuando recibe daño
            if (this.damageFlashTime > 0) {
                this.damageFlashTime -= deltaTime;
                const flashIntensity = this.damageFlashTime / 0.3;
                
                // Flash blanco
                this.healthBarFill.material.color.lerp(new THREE.Color(0xffffff), flashIntensity * 0.8);
                this.healthBarGlow.material.opacity = 0.3 + flashIntensity * 0.7;
            } else {
                // Restaurar opacidad normal
                this.healthBarGlow.material.opacity = 0.3;
            }
            
            // Auto-ocultar después del delay
            this.hideTimer += deltaTime;
            if (this.hideTimer >= this.hideDelay && this.currentHealth > 0) {
                this.HideHealthBar();
            }
            
            // Ocultar si el mutante está muerto
            if (this.currentHealth <= 0) {
                this.HideHealthBar();
            }
        }
    }

    Cleanup() {
        if (this.healthBarGroup) {
            this.scene.remove(this.healthBarGroup);
        }
    }
}