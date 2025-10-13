import Component from '../../Component';

export default class SurvivalRadar extends Component {
    constructor() {
        super();
        this.name = 'SurvivalRadar';
        this.radarElement = null;
        this.safeZoneDot = null;
        this.directionIndicator = null;
        this.distanceText = null;
        this.radarRadius = 75; // Radio del radar en píxeles
        this.mapSize = 80; // Tamaño del mapa del juego
    }

    Initialize() {
        this.radarElement = document.getElementById('survival_radar');
        this.safeZoneDot = document.getElementById('radar_safe_zone');
        this.directionIndicator = document.getElementById('safe_zone_direction');
        this.distanceText = document.getElementById('safe_zone_distance');
        
        // Mostrar radar solo en modo supervivencia
        this.ShowRadar(true);
    }

    ShowRadar(show = true) {
        if (this.radarElement) {
            this.radarElement.style.display = show ? 'block' : 'none';
        }
        if (this.directionIndicator) {
            this.directionIndicator.style.display = show ? 'block' : 'none';
        }
    }

    UpdateRadar(playerPosition, safeZonePosition) {
        if (!playerPosition || !safeZonePosition || !this.safeZoneDot) return;

        // Calcular posición relativa de la zona segura respecto al jugador
        const deltaX = safeZonePosition[0] - playerPosition.x;
        const deltaZ = safeZonePosition[2] - playerPosition.z;
        const distance = Math.sqrt(deltaX * deltaX + deltaZ * deltaZ);

        // Convertir coordenadas del mundo a coordenadas del radar
        const radarX = (deltaX / this.mapSize) * this.radarRadius;
        const radarZ = (deltaZ / this.mapSize) * this.radarRadius;

        // Limitar a los bordes del radar
        const radarDistance = Math.sqrt(radarX * radarX + radarZ * radarZ);
        let finalX = radarX;
        let finalZ = radarZ;

        if (radarDistance > this.radarRadius - 10) {
            const scale = (this.radarRadius - 10) / radarDistance;
            finalX = radarX * scale;
            finalZ = radarZ * scale;
        }

        // Posicionar el punto de la zona segura en el radar
        this.safeZoneDot.style.left = `${75 + finalX}px`; // 75 es el centro del radar
        this.safeZoneDot.style.top = `${75 - finalZ}px`;  // Invertir Z para que coincida con la vista

        // Actualizar indicador de dirección
        this.UpdateDirectionIndicator(deltaX, deltaZ, distance);
        
        // Actualizar distancia
        if (this.distanceText) {
            this.distanceText.textContent = `${Math.round(distance)}m`;
        }
    }

    UpdateDirectionIndicator(deltaX, deltaZ, distance) {
        if (!this.directionIndicator) return;

        // Calcular ángulo hacia la zona segura
        const angle = Math.atan2(deltaX, deltaZ) * (180 / Math.PI);
        
        // Rotar la flecha hacia la zona segura
        const arrow = this.directionIndicator.querySelector('.direction-arrow');
        if (arrow) {
            arrow.style.transform = `rotate(${angle}deg)`;
        }

        // Mostrar/ocultar indicador basado en la distancia
        if (distance > 10) { // Solo mostrar si está lejos
            this.directionIndicator.style.display = 'block';
            
            // Cambiar color basado en la distancia
            if (distance > 30) {
                arrow.style.borderBottomColor = '#ff4757'; // Rojo si está muy lejos
            } else if (distance > 15) {
                arrow.style.borderBottomColor = '#ffa502'; // Naranja si está moderadamente lejos
            } else {
                arrow.style.borderBottomColor = '#00ff41'; // Verde si está cerca
            }
        } else {
            this.directionIndicator.style.display = 'none';
        }
    }

    Update(deltaTime) {
        // El radar se actualiza desde el juego principal
    }

    Cleanup() {
        this.ShowRadar(false);
    }
}