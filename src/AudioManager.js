/**
 * AudioManager.js
 * 
 * Gestiona efectos de sonido para el juego
 */

export default class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.masterVolume = 0.5;
        
        // Inicializar contexto de audio
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API no soportada');
        }
    }

    // Crear sonidos sintéticos para efectos
    createBeepSound(frequency = 800, duration = 0.2, type = 'sine') {
        if (!this.audioContext) return null;

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        oscillator.type = type;
        
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
        
        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
        
        return oscillator;
    }

    // Sonido de countdown
    playCountdownBeep() {
        this.createBeepSound(1000, 0.1, 'square');
    }

    // Sonido de countdown final (más intenso)
    playFinalCountdownBeep() {
        this.createBeepSound(1500, 0.2, 'sawtooth');
    }

    // Sonido de oleada iniciada
    playWaveStartSound() {
        // Crear un sonido más complejo
        setTimeout(() => this.createBeepSound(600, 0.3, 'square'), 0);
        setTimeout(() => this.createBeepSound(800, 0.3, 'square'), 100);
        setTimeout(() => this.createBeepSound(1000, 0.4, 'square'), 200);
    }

    // Sonido de oleada completada
    playWaveCompleteSound() {
        // Sonido de victoria
        setTimeout(() => this.createBeepSound(800, 0.2, 'sine'), 0);
        setTimeout(() => this.createBeepSound(1000, 0.2, 'sine'), 150);
        setTimeout(() => this.createBeepSound(1200, 0.3, 'sine'), 300);
    }

    // Sonido de zona segura activada
    playSafeZoneSound() {
        this.createBeepSound(400, 0.5, 'sine');
        setTimeout(() => this.createBeepSound(600, 0.3, 'sine'), 200);
    }

    // Sonido de regeneración de vida
    playHealthRegenSound() {
        this.createBeepSound(300, 0.1, 'sine');
    }

    // Sonido de muerte del jugador
    playDeathSound() {
        // Crear un sonido dramático de muerte
        setTimeout(() => this.createBeepSound(200, 0.8, 'sawtooth'), 0);
        setTimeout(() => this.createBeepSound(150, 1.0, 'square'), 200);
        setTimeout(() => this.createBeepSound(100, 1.2, 'sawtooth'), 500);
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}