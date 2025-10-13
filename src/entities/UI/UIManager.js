import Component from '../../Component.js'
import ZoomUI from './ZoomUI.js'

export default class UIManager extends Component{
    constructor(){
        super();
        this.name = 'UIManager';
        this.survivalRadar = null;
        this.zoomUI = null;
    }

    SetAmmo(mag, rest){
        document.getElementById("current_ammo").innerText = mag;
        document.getElementById("max_ammo").innerText = rest;
    }

    SetMutantCount(count) {
        const mutantCountElement = document.getElementById("mutant_count");
        if (mutantCountElement) {
            mutantCountElement.innerText = count;
            
            // Cambiar color basado en la cantidad
            const counterElement = document.getElementById("mutant_counter");
            if (count === 0) {
                counterElement.style.borderColor = 'rgba(0, 255, 65, 0.6)';
                counterElement.style.color = '#00ff41';
                counterElement.style.textShadow = '0 0 10px rgba(0, 255, 65, 0.8)';
                counterElement.style.boxShadow = '0 0 20px rgba(0, 255, 65, 0.3)';
            } else if (count <= 3) {
                counterElement.style.borderColor = 'rgba(255, 165, 0, 0.6)';
                counterElement.style.color = '#ffa500';
                counterElement.style.textShadow = '0 0 10px rgba(255, 165, 0, 0.8)';
                counterElement.style.boxShadow = '0 0 20px rgba(255, 165, 0, 0.3)';
            } else {
                counterElement.style.borderColor = 'rgba(255, 107, 107, 0.6)';
                counterElement.style.color = '#ff6b6b';
                counterElement.style.textShadow = '0 0 10px rgba(255, 107, 107, 0.8)';
                counterElement.style.boxShadow = '0 0 20px rgba(255, 107, 107, 0.3)';
            }
        }
    }

    SetHealth(health){
        const healthBar = document.getElementById("health_progress");
        healthBar.style.width = `${health}%`;
        
        // Cambiar color según la salud
        if (health > 60) {
            healthBar.style.background = 'linear-gradient(90deg, #2ed573, #1e90ff)';
        } else if (health > 30) {
            healthBar.style.background = 'linear-gradient(90deg, #ffa502, #ff6348)';
        } else {
            healthBar.style.background = 'linear-gradient(90deg, #ff4757, #ff3838)';
        }
    }

    ShowSafeZoneIndicator(show = true) {
        const indicator = document.getElementById("safe_zone_indicator");
        indicator.style.display = show ? 'block' : 'none';
    }

    ShowCurrentWaveIndicator(show = true, waveNumber = 1) {
        const indicator = document.getElementById("current_wave_indicator");
        const waveNum = document.getElementById("wave_number");
        
        if (waveNum) {
            waveNum.textContent = waveNumber;
        }
        
        indicator.style.display = show ? 'block' : 'none';
    }

    ShowWaveSystem(show = true) {
        const waveSystem = document.getElementById("wave_system");
        waveSystem.style.display = show ? 'block' : 'none';
    }

    ShowSurvivalRadar(show = true) {
        const radar = document.getElementById("survival_radar");
        const direction = document.getElementById("safe_zone_direction");
        
        if (radar) radar.style.display = show ? 'block' : 'none';
        if (direction) direction.style.display = show ? 'block' : 'none';
    }

    UpdateRadar(playerPosition, safeZonePosition) {
        if (!playerPosition || !safeZonePosition) return;

        const safeZoneDot = document.getElementById('radar_safe_zone');
        const distanceText = document.getElementById('safe_zone_distance');
        const directionIndicator = document.getElementById('safe_zone_direction');

        if (!safeZoneDot) return;

        // Calcular posición relativa
        const deltaX = safeZonePosition[0] - playerPosition.x;
        const deltaZ = safeZonePosition[2] - playerPosition.z;
        const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

        // Convertir a coordenadas del radar (75px es el radio)
        const radarRadius = 75;
        const mapSize = 80;
        
        let radarX = (deltaX / mapSize) * radarRadius;
        let radarZ = (deltaZ / mapSize) * radarRadius;

        // Limitar a los bordes del radar
        const radarDistance = Math.sqrt(radarX * radarX + radarZ * radarZ);
        if (radarDistance > radarRadius - 10) {
            const scale = (radarRadius - 10) / radarDistance;
            radarX *= scale;
            radarZ *= scale;
        }

        // Posicionar el punto en el radar
        safeZoneDot.style.left = `${75 + radarX}px`;
        safeZoneDot.style.top = `${75 - radarZ}px`;

        // Actualizar distancia
        if (distanceText) {
            distanceText.textContent = `${Math.round(distance)}m`;
        }

        // Actualizar indicador de dirección
        if (directionIndicator && distance > 10) {
            const angle = Math.atan2(deltaX, deltaZ) * (180 / Math.PI);
            const arrow = directionIndicator.querySelector('.direction-arrow');
            
            if (arrow) {
                arrow.style.transform = `rotate(${angle}deg)`;
                
                // Cambiar color basado en distancia
                if (distance > 30) {
                    arrow.style.borderBottomColor = '#ff4757';
                } else if (distance > 15) {
                    arrow.style.borderBottomColor = '#ffa502';
                } else {
                    arrow.style.borderBottomColor = '#00ff41';
                }
            }
            
            directionIndicator.style.display = 'block';
        } else if (directionIndicator) {
            directionIndicator.style.display = 'none';
        }
    }

    UpdateZoomUI(zoomLevel, isZooming) {
        if (this.zoomUI) {
            this.zoomUI.UpdateZoomLevel(zoomLevel, isZooming);
        }
    }

    Update(deltaTime) {
        if (this.zoomUI) {
            this.zoomUI.Update(deltaTime);
        }
    }

    Initialize(){
        document.getElementById("game_hud").style.visibility = 'visible';
        
        // Inicializar UI de zoom
        this.zoomUI = new ZoomUI();
        this.zoomUI.Initialize();
        
        // Ocultar indicadores inicialmente
        this.ShowSafeZoneIndicator(false);
        this.ShowCurrentWaveIndicator(false);
        this.ShowWaveSystem(false);
        this.ShowSurvivalRadar(false);
    }
}