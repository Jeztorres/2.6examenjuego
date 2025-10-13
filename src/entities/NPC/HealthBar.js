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
        
        // Crear fondo de la barra con gradiente oscuro
        const backgroundGeometry = new THREE.PlaneGeometry(2.5, 0.3);
        const backgroundMaterial = new THREE.MeshBasicMaterial({
            color: 0x1a1a1a,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
        this.healthBarGroup.add(this.healthBarBackground);
        
        // Crear borde brillante con efecto neón
        const borderGeometry = new THREE.PlaneGeometry(2.6, 0.4);
        const borderMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ffff,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
        });
        
        const border = new THREE.Mesh(borderGeometry, borderMaterial);
        border.position.z = -0.002;
        this.healthBarGroup.add(border);
        
        // Crear relleno de la barra con gradiente de vida
        const fillGeometry = new THREE.PlaneGeometry(2.3, 0.25);
        const fillMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 1.0,
            side: THREE.DoubleSide
        });
        
        this.healthBarFill = new THREE.Mesh(fillGeometry, fillMaterial);
        this.healthBarFill.position.z = 0.001;
        this.healthBarGroup.add(this.healthBarFill);
        
        // Crear efecto de brillo/glow
        const glowGeometry = new THREE.PlaneGeometry(2.3, 0.25);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff41,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending
        });
        
        this.healthBarGlow = new THREE.Mesh(glowGeometry, glowMaterial);
        this.healthBarGlow.position.z = 0.002;
        this.healthBarGlow.scale.set(1.2, 1.5, 1);
        this.healthBarGroup.add(this.healthBarGlow);
        
        // Posicionar la barra arriba del mutante
        this.healthBarGroup.position.y = 3.5;
        this.healthBarGroup.visible = false; // Ocultar inicialmente
        
        this.scene.add(this.healthBarGroup);
    }

    UpdateHealth(newHealth) {
        const oldHealth = this.currentHealth;
        this.currentHealth = Math.max(0, Math.min(this.maxHealth, newHealth));
        
        // Activar efecto de flash si recibió daño
        if (this.currentHealth < oldHealth) {
            this.damageFlashTime = 0.5;
        }
        
        // Mostrar barra cuando recibe daño y resetear timer
        this.ShowHealthBar();
        this.hideTimer = 0;
        
        // Actualizar escala del relleno
        const healthPercentage = this.currentHealth / this.maxHealth;
        this.healthBarFill.scale.x = healthPercentage;
        
        // Cambiar color basado en la vida restante
        let color, glowColor;
        if (healthPercentage > 0.7) {
            color = 0x00ff41; // Verde neón
            glowColor = 0x00ff41;
        } else if (healthPercentage > 0.4) {
            color = 0xffd700; // Dorado
            glowColor = 0xffd700;
        } else if (healthPercentage > 0.2) {
            color = 0xff6600; // Naranja
            glowColor = 0xff6600;
        } else {
            color = 0xff1744; // Rojo intenso
            glowColor = 0xff1744;
        }
        
        this.healthBarFill.material.color.setHex(color);
        if (this.healthBarGlow) {
            this.healthBarGlow.material.color.setHex(glowColor);
            this.healthBarGlow.scale.x = healthPercentage * 1.2;
        }
        
        // Ajustar posición para que se mantenga alineada a la izquierda
        this.healthBarFill.position.x = -1.15 + (healthPercentage * 1.15);
        if (this.healthBarGlow) {
            this.healthBarGlow.position.x = -1.15 + (healthPercentage * 1.15);
        }
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
            this.healthBarGroup.position.y = position.y + 3.5;
            this.healthBarGroup.position.z = position.z;
        }
    }

    Update(deltaTime, camera) {
        if (this.healthBarGroup) {
            // Hacer que la barra siempre mire hacia la cámara
            if (camera) {
                this.healthBarGroup.lookAt(camera.position);
            }
            
            // Actualizar efectos de pulso y flash de daño
            this.pulseTime += deltaTime;
            
            // Efecto de pulso sutil en el glow
            if (this.healthBarGlow) {
                const pulseIntensity = 0.3 + Math.sin(this.pulseTime * 3) * 0.1;
                this.healthBarGlow.material.opacity = pulseIntensity;
            }
            
            // Flash de daño
            if (this.damageFlashTime > 0) {
                this.damageFlashTime -= deltaTime;
                const flashIntensity = this.damageFlashTime / 0.5;
                
                // Hacer que la barra parpadee en blanco cuando recibe daño
                if (Math.floor(this.damageFlashTime * 10) % 2 === 0) {
                    this.healthBarFill.material.color.setHex(0xffffff);
                    if (this.healthBarGlow) {
                        this.healthBarGlow.material.opacity = 0.8;
                    }
                } else {
                    // Restaurar color original basado en la vida
                    const healthPercentage = this.currentHealth / this.maxHealth;
                    let color;
                    if (healthPercentage > 0.7) {
                        color = 0x00ff41;
                    } else if (healthPercentage > 0.4) {
                        color = 0xffd700;
                    } else if (healthPercentage > 0.2) {
                        color = 0xff6600;
                    } else {
                        color = 0xff1744;
                    }
                    this.healthBarFill.material.color.setHex(color);
                }
            }
            
            // Auto-ocultar después de un tiempo sin daño
            if (this.isVisible && this.damageFlashTime <= 0) {
                this.hideTimer += deltaTime;
                if (this.hideTimer > this.hideDelay) {
                    this.HideHealthBar();
                }
            }
        }
    }

    Cleanup() {
        if (this.healthBarGroup) {
            this.scene.remove(this.healthBarGroup);
        }
    }
}