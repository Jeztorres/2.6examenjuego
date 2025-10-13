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
        
        // Para modo clásico
        this.entityManager = null;
        
        // Supervivencia
        this.safeZoneActive = false;
        this.safeZoneTimer = 0;
        this.safeZoneDuration = 10; // 10 segundos de zona segura
        this.safeZoneInterval = 45; // Aparece cada 45 segundos
        this.safeZonePosition = null;
        this.safeZoneRadius = 5;
        this.nextSafeZoneTimer = this.safeZoneInterval;
        
        // Variables de dificultad progresiva para supervivencia
        this.survivalTime = 0; // Tiempo total sobrevivido
        this.mutantsKilled = 0; // NPCs eliminados
        this.difficultyLevel = 1; // Nivel de dificultad actual
        this.baseSpawnRate = 20; // Tiempo base entre spawns (segundos)
        this.baseMutantHealth = 30; // Vida base de mutantes
        this.baseMovementSpeed = 1.0; // Velocidad base de movimiento
        
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
        
        // Reset variables de supervivencia
        this.survivalTime = 0;
        this.mutantsKilled = 0;
        this.difficultyLevel = 1;
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
        // Actualizar contador de mutantes en todos los modos
        this.UpdateMutantCounter(entityManager);
        
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

    // Actualizar contador de mutantes en el HUD
    UpdateMutantCounter(entityManager) {
        const aliveMutants = this.CountAliveEnemies(entityManager);
        
        // Buscar UIManager y actualizar contador
        const uiManagerEntity = entityManager.Get("UIManager");
        if (uiManagerEntity) {
            const uiManager = uiManagerEntity.GetComponent("UIManager");
            if (uiManager) {
                uiManager.SetMutantCount(aliveMutants);
            }
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
        // Actualizar tiempo de supervivencia
        this.survivalTime += deltaTime;
        
        // Calcular nivel de dificultad basado en tiempo y kills
        this.UpdateDifficultyLevel();
        
        // En modo supervivencia, la zona segura siempre está activa pero se mueve
        if (!this.safeZoneActive) {
            this.ActivateSafeZone();
        }
        
        // Mover zona segura cada cierto tiempo (más frecuente en niveles altos)
        this.safeZoneTimer += deltaTime;
        const adjustedInterval = Math.max(30, this.safeZoneInterval - (this.difficultyLevel * 3));
        if (this.safeZoneTimer >= adjustedInterval) {
            this.MoveSafeZone();
            this.safeZoneTimer = 0;
            console.log(`🌀 SUPERVIVENCIA: Zona segura movida (Dificultad: ${this.difficultyLevel})`);
        }

        // Spawn continuo de enemigos con frecuencia creciente
        this.waveTimer += deltaTime;
        const spawnRate = Math.max(8, this.baseSpawnRate - (this.difficultyLevel * 2));
        if (this.waveTimer >= spawnRate) {
            this.SpawnSurvivalEnemies(entityManager);
            this.waveTimer = 0;
        }
        
        // Mostrar información de supervivencia en UI
        this.UpdateSurvivalUI();
    }

    // Calcular nivel de dificultad basado en progreso
    UpdateDifficultyLevel() {
        const timeFactor = Math.floor(this.survivalTime / 60); // +1 por cada minuto
        const killFactor = Math.floor(this.mutantsKilled / 5); // +1 por cada 5 kills
        const newLevel = Math.max(1, timeFactor + killFactor);
        
        if (newLevel > this.difficultyLevel) {
            this.difficultyLevel = newLevel;
            console.log(`⚡ SUPERVIVENCIA: ¡Dificultad aumentada a nivel ${this.difficultyLevel}!`);
            this.ShowDifficultyMessage();
        }
    }

    // Mostrar mensaje de aumento de dificultad
    ShowDifficultyMessage() {
        const diffMsg = document.createElement('div');
        diffMsg.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
                <span style="color: #ff6b6b; font-size: 18px; margin-right: 8px;">⚡</span>
                <span style="color: #ff6b6b; font-size: 20px; font-weight: bold;">DIFICULTAD NIVEL ${this.difficultyLevel}</span>
            </div>
        `;
        diffMsg.style.cssText = `
            position: fixed;
            top: 30%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            border: 2px solid #ff6b6b;
            border-radius: 10px;
            padding: 10px 20px;
            color: #ff6b6b;
            font-family: 'Arial', sans-serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            box-shadow: 0 0 20px rgba(255, 107, 107, 0.5);
            z-index: 10000;
            pointer-events: none;
            animation: difficultyPulse 3s ease-out forwards;
        `;
        
        // CSS para animación de dificultad
        if (!document.getElementById('difficulty-animation-style')) {
            const style = document.createElement('style');
            style.id = 'difficulty-animation-style';
            style.textContent = `
                @keyframes difficultyPulse {
                    0% { opacity: 1; transform: translate(-50%, -50%) scale(0.8); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(1) translateY(-20px); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(diffMsg);
        setTimeout(() => {
            if (diffMsg.parentNode) {
                diffMsg.parentNode.removeChild(diffMsg);
            }
        }, 3000);
    }

    // Actualizar UI de supervivencia
    UpdateSurvivalUI() {
        // Mostrar estadísticas de supervivencia
        const minutes = Math.floor(this.survivalTime / 60);
        const seconds = Math.floor(this.survivalTime % 60);
        
        // Si existe un elemento de estadísticas, actualizarlo
        let statsElement = document.getElementById('survival_stats');
        if (!statsElement) {
            statsElement = document.createElement('div');
            statsElement.id = 'survival_stats';
            statsElement.style.cssText = `
                position: fixed;
                top: 120px;
                right: 20px;
                background: rgba(0, 0, 0, 0.7);
                color: white;
                padding: 10px;
                border-radius: 5px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 1000;
                border: 1px solid #333;
            `;
            document.body.appendChild(statsElement);
        }
        
        statsElement.innerHTML = `
            <div><strong>📊 SUPERVIVENCIA</strong></div>
            <div>⏱️ Tiempo: ${minutes}:${seconds.toString().padStart(2, '0')}</div>
            <div>💀 Eliminados: ${this.mutantsKilled}</div>
            <div>⚡ Dificultad: ${this.difficultyLevel}</div>
        `;
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
        // Número de enemigos aumenta con la dificultad
        let enemyCount = 1;
        if (this.difficultyLevel >= 3) enemyCount = Math.random() > 0.3 ? 2 : 1;
        if (this.difficultyLevel >= 5) enemyCount = Math.random() > 0.5 ? 3 : 2;
        if (this.difficultyLevel >= 8) enemyCount = Math.random() > 0.7 ? 4 : 3;
        
        console.log(`👹 SUPERVIVENCIA: Spawneando ${enemyCount} enemigos (Nivel ${this.difficultyLevel})`);
        
        for (let i = 0; i < enemyCount; i++) {
            this.SpawnEnhancedEnemy(entityManager);
        }
    }

    // Spawn enemigos mejorados según dificultad
    SpawnEnhancedEnemy(entityManager) {
        const location = this.GetRandomSpawnLocation();
        entityManager.SpawnMutant(location);
        
        // Obtener el mutante recién spawneado y mejorarlo
        setTimeout(() => {
            this.EnhanceMutantForSurvival(entityManager);
        }, 100); // Pequeño delay para asegurar que el mutante esté inicializado
    }

    // Mejorar mutantes según nivel de dificultad
    EnhanceMutantForSurvival(entityManager) {
        // Buscar el mutante más recientemente creado
        const mutants = entityManager.entities.filter(entity => 
            entity.name && entity.name.startsWith('Mutant')
        );
        
        if (mutants.length === 0) return;
        
        // Tomar el último mutante spawneado
        const mutant = mutants[mutants.length - 1];
        const controller = mutant.GetComponent('CharacterController');
        
        if (!controller) return;
        
        // Calcular mejoras basadas en dificultad
        const healthBonus = (this.difficultyLevel - 1) * 10; // +10 HP por nivel
        const speedMultiplier = 1.0 + (this.difficultyLevel * 0.1); // +10% velocidad por nivel
        
        // Aplicar mejoras
        controller.maxHealth = this.baseMutantHealth + healthBonus;
        controller.health = controller.maxHealth;
        
        // Actualizar barra de vida con nueva vida máxima
        if (controller.healthBar) {
            controller.healthBar.maxHealth = controller.maxHealth;
            controller.healthBar.currentHealth = controller.maxHealth;
            controller.healthBar.UpdateHealth(controller.maxHealth);
        }
        
        // Mejorar velocidad de movimiento (aplicar al root motion)
        if (controller.rootBone) {
            controller.speedMultiplier = speedMultiplier;
        }
        
        console.log(`💪 SUPERVIVENCIA: Mutante mejorado - Vida: ${controller.maxHealth}, Velocidad: x${speedMultiplier.toFixed(1)}`);
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
                if (controller && !controller.isDead && controller.health > 0) {
                    count++;
                }
            }
        });
        return count;
    }

    GetCurrentMode() {
        return this.currentMode;
    }

    // Método para configurar el EntityManager (llamado desde entry.js)
    SetEntityManager(entityManager) {
        this.entityManager = entityManager;
    }

    // Manejar muerte de mutantes en modo clásico
    HandleMutantDeath(mutantEntity) {
        // Actualizar contador inmediatamente
        if (this.entityManager) {
            this.UpdateMutantCounter(this.entityManager);
        }
        
        if (this.currentMode === GameModes.CLASSIC) {
            console.log(`GameModeManager: Mutante ${mutantEntity.name} murió en modo clásico. Spawneando nuevo mutante...`);
            
            // Obtener ubicación de spawn aleatoria
            const spawnLocation = this.GetRandomSpawnLocation();
            
            // Spawneear nuevo mutante
            if (this.entityManager) {
                this.entityManager.SpawnMutant(spawnLocation);
                console.log(`GameModeManager: Nuevo mutante spawneado en ${spawnLocation}`);
            }
        } else if (this.currentMode === GameModes.SURVIVAL) {
            console.log(`GameModeManager: Mutante ${mutantEntity.name} murió en modo supervivencia. Verificando curación...`);
            this.mutantsKilled++; // Incrementar contador de muertes
            this.HandleSurvivalMutantKill();
        }
    }

    // Manejar muerte de mutantes en modo supervivencia - dar vida al jugador si está bajo
    HandleSurvivalMutantKill() {
        if (!this.entityManager) return;
        
        // Buscar al jugador
        const player = this.entityManager.Get("Player");
        if (!player) return;
        
        const playerHealth = player.GetComponent("PlayerHealth");
        if (!playerHealth) return;
        
        // Cantidad de curación disminuye con la dificultad para balancear
        const baseHealAmount = 25;
        const healReduction = Math.max(0, (this.difficultyLevel - 1) * 2);
        const healAmount = Math.max(15, baseHealAmount - healReduction); // Mínimo 15 HP
        
        // Umbral de vida baja se vuelve más estricto con la dificultad
        const baseThreshold = 0.3;
        const thresholdReduction = Math.min(0.15, (this.difficultyLevel - 1) * 0.02);
        const healthThreshold = Math.max(0.15, baseThreshold - thresholdReduction); // Mínimo 15%
        
        console.log(`💚 SUPERVIVENCIA: Verificando curación (Umbral: ${(healthThreshold*100).toFixed(0)}%, Curación: ${healAmount} HP, Dificultad: ${this.difficultyLevel})`);
        
        // Verificar si el jugador tiene poca vida
        if (playerHealth.IsLowHealth(healthThreshold)) {
            // Usar el método oficial de curación
            if (playerHealth.Heal(healAmount)) {
                console.log(`💚 SUPERVIVENCIA: ¡Jugador curado por eliminar mutante! +${healAmount} HP (Kill #${this.mutantsKilled})`);
                
                // Mostrar mensaje visual en pantalla
                this.ShowHealMessage(healAmount);
                
                // Reproducir sonido de curación si está disponible
                if (this.audioManager) {
                    this.audioManager.playHealthRegenSound();
                }
            }
        } else {
            console.log(`💚 SUPERVIVENCIA: Mutante eliminado, pero jugador tiene suficiente vida (${playerHealth.health}/${playerHealth.maxHealth})`);
        }
    }

    // Mostrar mensaje visual de curación
    ShowHealMessage(healAmount) {
        // Crear elemento temporal para mostrar el mensaje
        const healMsg = document.createElement('div');
        healMsg.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center;">
                <span style="color: #00ff00; font-size: 18px; margin-right: 8px;">❤️</span>
                <span style="color: #00ff00; font-size: 24px; font-weight: bold;">+${healAmount} VIDA</span>
            </div>
        `;
        healMsg.style.cssText = `
            position: fixed;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.7);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 10px 20px;
            color: #00ff00;
            font-family: 'Arial', sans-serif;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
            z-index: 10000;
            pointer-events: none;
            animation: healPulse 2.5s ease-out forwards;
        `;
        
        // Agregar CSS para la animación si no existe
        if (!document.getElementById('heal-animation-style')) {
            const style = document.createElement('style');
            style.id = 'heal-animation-style';
            style.textContent = `
                @keyframes healPulse {
                    0% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(0.8); 
                        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                    }
                    20% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1.1); 
                        box-shadow: 0 0 30px rgba(0, 255, 0, 0.8);
                    }
                    80% { 
                        opacity: 1; 
                        transform: translate(-50%, -50%) scale(1); 
                        box-shadow: 0 0 20px rgba(0, 255, 0, 0.5);
                    }
                    100% { 
                        opacity: 0; 
                        transform: translate(-50%, -50%) scale(1) translateY(-30px); 
                        box-shadow: 0 0 10px rgba(0, 255, 0, 0.2);
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(healMsg);
        
        // Remover el mensaje después de la animación
        setTimeout(() => {
            if (healMsg.parentNode) {
                healMsg.parentNode.removeChild(healMsg);
            }
        }, 2500);
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