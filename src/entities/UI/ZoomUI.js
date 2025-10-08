import Component from '../../Component.js';

export default class ZoomUI extends Component {
    constructor() {
        super();
        this.name = 'ZoomUI';
        this.zoomLevelElement = null;
        this.zoomValueElement = null;
        this.zoomControlsElement = null;
        this.showControlsTimer = 0;
        this.controlsVisible = false;
    }

    Initialize() {
        this.zoomLevelElement = document.getElementById('zoom_level');
        this.zoomValueElement = document.getElementById('zoom_value');
        this.zoomControlsElement = document.getElementById('zoom_controls');
        
        // Mostrar controles inicialmente por unos segundos
        this.ShowControls();
        this.showControlsTimer = 5; // Mostrar por 5 segundos
    }

    UpdateZoomLevel(zoomLevel, isZooming) {
        if (this.zoomValueElement) {
            this.zoomValueElement.textContent = `${zoomLevel.toFixed(1)}x`;
        }
        
        if (this.zoomLevelElement) {
            this.zoomLevelElement.style.display = isZooming ? 'block' : 'none';
        }
        
        // Mostrar controles cuando se usa el zoom
        if (isZooming && !this.controlsVisible) {
            this.ShowControls();
            this.showControlsTimer = 3; // Mostrar por 3 segundos más
        }
    }

    ShowControls() {
        if (this.zoomControlsElement) {
            this.zoomControlsElement.style.display = 'block';
            this.controlsVisible = true;
        }
    }

    HideControls() {
        if (this.zoomControlsElement) {
            this.zoomControlsElement.style.display = 'none';
            this.controlsVisible = false;
        }
    }

    Update(deltaTime) {
        // Auto-ocultar controles después del timer
        if (this.controlsVisible && this.showControlsTimer > 0) {
            this.showControlsTimer -= deltaTime;
            if (this.showControlsTimer <= 0) {
                this.HideControls();
            }
        }
    }

    Cleanup() {
        this.HideControls();
        if (this.zoomLevelElement) {
            this.zoomLevelElement.style.display = 'none';
        }
    }
}