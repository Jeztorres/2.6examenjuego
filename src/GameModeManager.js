/**
 * GameModeManager.js
 * 
 * Gestiona los diferentes modos de juego: Clásico, Supervivencia y Oleadas
 */

export const GameModes = {
    CLASSIC: 'classic',
    SURVIVAL: 'survival',
    WAVES: 'waves'
};

export default class GameModeManager {
    constructor(audioManager = null) {
        this.currentMode = GameModes.CLASSIC;
        this.waveNumber = 1;
        this.enemiesPerWave = 3;
        this.waveTimer = 0;
        this.waveDelay = 30; // 30 segundos entre oleadas
        this.isWaveActive = false;
        this.audioManager = audioManager;
        
        // Supervivencia
        this.safeZoneActive = false;
        this.safeZoneTimer = 0;
        this.safeZoneDuration = 10; // 10 segundos de zona segura
        this.safeZoneInterval = 45; // Aparece cada 45 segundos
        this.safeZonePosition = null;
        this.safeZoneRadius = 5;
        this.nextSafeZoneTimer = this.safeZoneInterval;
        
        this.mutantSpawnLocations = [
            [10.8, 0.0, 22.0],
            [25.0, 0.0, 15.0],
            [15.0, 0.0, 35.0],
            [35.0, 0.0, 25.0],
            [5.0, 0.0, 30.0],
            [30.0, 0.0, 5.0],
            [20.0, 0.0, 40.0],
            [40.0, 0.0, 20.0]
        ];
    }

    SetMode(mode) {
        this.currentMode = mode;
        this.Reset();
    }

    Reset() {
        this.waveNumber = 1;
        this.waveTimer = 0;
        this.isWaveActive = false;
        this.safeZoneActive = false;
        this.safeZoneTimer = 0;
        this.nextSafeZoneTimer = this.safeZoneInterval;
        this.enemiesPerWave = 3;
    }

    GetRandomSpawnLocation() {
        const index = Math.floor(Math.random() * this.mutantSpawnLocations.length);
        return this.mutantSpawnLocations[index];
    }

    GetSafeZonePosition() {
        // Generar posición aleatoria para la zona segura
        const mapSize = 40;
        const x = (Math.random() - 0.5) * mapSize;
        const z = (Math.random() - 0.5) * mapSize;
        return [x, 0.5, z];
    }

    IsPlayerInSafeZone(playerPosition) {
        if (!this.safeZoneActive || !this.safeZonePosition) return false;
        
        const dx = playerPosition.x - this.safeZonePosition[0];
        const dz = playerPosition.z - this.safeZonePosition[2];
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        return distance <= this.safeZoneRadius;
    }

    Update(deltaTime, entityManager) {
        switch (this.currentMode) {
            case GameModes.WAVES:
                this.UpdateWaveMode(deltaTime, entityManager);
                break;
            case GameModes.SURVIVAL:
                this.UpdateSurvivalMode(deltaTime, entityManager);
                break;
            case GameModes.CLASSIC:
                // Modo clásico no necesita actualizaciones especiales
                break;
        }
    }

    UpdateWaveMode(deltaTime, entityManager) {
        if (!this.isWaveActive) {
            this.waveTimer += deltaTime;
            
            // Mostrar countdown
            const timeLeft = Math.ceil(this.waveDelay - this.waveTimer);
            this.ShowWaveCountdown(timeLeft);
            
            if (this.waveTimer >= this.waveDelay) {
                this.StartWave(entityManager);
                this.waveTimer = 0;
            }
        } else {
            // Verificar si todos los enemigos han sido eliminados
            const aliveEnemies = this.CountAliveEnemies(entityManager);
            if (aliveEnemies === 0) {
                this.EndWave();
            }
        }
    }

    UpdateSurvivalMode(deltaTime, entityManager) {
        // En modo supervivencia, la zona segura siempre está activa pero se mueve
        if (!this.safeZoneActive) {
            this.ActivateSafeZone();
        }
        
        // Mover zona segura cada cierto tiempo
        this.safeZoneTimer += deltaTime;
        if (this.safeZoneTimer >= this.safeZoneInterval) {
            this.MoveSafeZone();
            this.safeZoneTimer = 0;
        }

        // Spawn continuo de enemigos (menos frecuente que oleadas)
        this.waveTimer += deltaTime;
        if (this.waveTimer >= 20) { // Cada 20 segundos
            this.SpawnSurvivalEnemies(entityManager);
            this.waveTimer = 0;
        }
    }

    StartWave(entityManager) {
        this.isWaveActive = true;
        
        // Ocultar countdown y mostrar anuncio de oleada
        this.HideWaveCountdown();
        this.ShowWaveAnnouncement();
        
        // Mostrar indicador de oleada actual
        const waveIndicator = document.getElementById('current_wave_indicator');
        const waveNumber = document.getElementById('wave_number');
        waveNumber.textContent = this.waveNumber;
        waveIndicator.style.display = 'block';
        
        // Spawn enemigos
        for (let i = 0; i < this.enemiesPerWave; i++) {
            setTimeout(() => {
                this.SpawnEnemy(entityManager);
            }, i * 1000); // 1 segundo entre cada spawn
        }
    }

    EndWave() {
        this.isWaveActive = false;
        this.waveNumber++;
        this.enemiesPerWave = Math.min(8, 3 + Math.floor(this.waveNumber / 2)); // Incrementar enemigos gradualmente
        
        // Mostrar mensaje de oleada completada
        this.ShowWaveCompleted();
        
        // Ocultar indicador de oleada actual después de un momento
        setTimeout(() => {
            const waveIndicator = document.getElementById('current_wave_indicator');
            waveIndicator.style.display = 'none';
        }, 3000);
        
        // Resetear timer para próxima oleada
        this.waveTimer = 0;
    }

    SpawnSurvivalEnemies(entityManager) {
        // En supervivencia, spawn 1-2 enemigos cada vez
        const enemyCount = Math.random() > 0.5 ? 2 : 1;
        for (let i = 0; i < enemyCount; i++) {
            this.SpawnEnemy(entityManager);
        }
    }

    SpawnEnemy(entityManager) {
        const location = this.GetRandomSpawnLocation();
        entityManager.SpawnMutant(location);
    }

    ActivateSafeZone() {
        this.safeZoneActive = true;
        this.safeZoneTimer = 0;
        this.safeZonePosition = this.GetSafeZonePosition();
        this.nextSafeZoneTimer = this.safeZoneInterval;
        
        // Reproducir sonido de zona segura
        if (this.audioManager) {
            this.audioManager.playSafeZoneSound();
        }
    }

    MoveSafeZone() {
        // Mover la zona segura a una nueva posición
        this.safeZonePosition = this.GetSafeZonePosition();
        
        // Reproducir sonido de movimiento de zona
        if (this.audioManager) {
            this.audioManager.playSafeZoneSound();
        }
    }

    DeactivateSafeZone() {
        this.safeZoneActive = false;
        this.safeZonePosition = null;
        
        // Ocultar indicador
        const indicator = document.getElementById('safe_zone_indicator');
        indicator.style.display = 'none';
    }

    CountAliveEnemies(entityManager) {
        let count = 0;
        entityManager.entities.forEach(entity => {
            if (entity.name && entity.name.startsWith('Mutant')) {
                const controller = entity.GetComponent('CharacterController');
                if (controller && controller.health > 0) {
                    count++;
                }
            }
        });
        return count;
    }

    GetCurrentMode() {
        return this.currentMode;
    }

    GetWaveNumber() {
        return this.waveNumber;
    }

    IsSafeZoneActive() {
        return this.safeZoneActive;
    }

    GetSafeZoneInfo() {
        return {
            active: this.safeZoneActive,
            position: this.safeZonePosition,
            radius: this.safeZoneRadius
        };
    }

    ShowWaveCountdown(timeLeft) {
        const waveSystem = document.getElementById('wave_system');
        const announcement = document.getElementById('wave_announcement');
        const timer = document.getElementById('wave_timer');
        
        if (timeLeft > 0) {
            waveSystem.style.display = 'block';
            announcement.textContent = `SE ACERCA OLEADA ${this.waveNumber}`;
            timer.textContent = `${timeLeft}`;
            
            // Efecto de sonido mental para los últimos 5 segundos
            if (timeLeft <= 5) {
                if (timeLeft <= 3) {
                    timer.style.color = '#ff0080';
                    timer.style.fontSize = '3.2em';
                    // Sonido más intenso para los últimos 3 segundos
                    if (this.audioManager && Math.floor(this.waveTimer * 10) % 10 === 0) {
                        this.audioManager.playFinalCountdownBeep();
                    }
                } else {
                    timer.style.color = '#ffff00';
                    timer.style.fontSize = '2.8em';
                    // Sonido normal para 4-5 segundos
                    if (this.audioManager && Math.floor(this.waveTimer * 10) % 10 === 0) {
                        this.audioManager.playCountdownBeep();
                    }
                }
            } else {
                timer.style.color = '#00ffff';
                timer.style.fontSize = '2.5em';
            }
        }
    }

    HideWaveCountdown() {
        const waveSystem = document.getElementById('wave_system');
        waveSystem.style.display = 'none';
    }

    ShowWaveAnnouncement() {
        const waveSystem = document.getElementById('wave_system');
        const announcement = document.getElementById('wave_announcement');
        const timer = document.getElementById('wave_timer');
        
        waveSystem.style.display = 'block';
        announcement.textContent = `¡OLEADA ${this.waveNumber} INICIADA!`;
        timer.textContent = 'ELIMINA A TODOS LOS ENEMIGOS';
        timer.style.color = '#ff0080';
        timer.style.fontSize = '1.8em';
        
        // Reproducir sonido de inicio de oleada
        if (this.audioManager) {
            this.audioManager.playWaveStartSound();
        }
        
        // Ocultar después de 3 segundos
        setTimeout(() => {
            waveSystem.style.display = 'none';
        }, 3000);
    }

    ShowWaveCompleted() {
        const waveSystem = document.getElementById('wave_system');
        const announcement = document.getElementById('wave_announcement');
        const timer = document.getElementById('wave_timer');
        
        waveSystem.style.display = 'block';
        announcement.textContent = `¡OLEADA ${this.waveNumber - 1} COMPLETADA!`;
        timer.textContent = `PRÓXIMA OLEADA EN ${this.waveDelay} SEGUNDOS`;
        timer.style.color = '#00ff41';
        timer.style.fontSize = '1.8em';
        
        // Reproducir sonido de oleada completada
        if (this.audioManager) {
            this.audioManager.playWaveCompleteSound();
        }
        
        // Ocultar después de 4 segundos
        setTimeout(() => {
            waveSystem.style.display = 'none';
        }, 4000);
    }
}