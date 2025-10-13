/**
 * DeathManager.js
 * 
 * Gestiona la muerte del jugador y la pantalla de game over
 */

export default class DeathManager {
    constructor(audioManager = null, gameApp = null) {
        this.audioManager = audioManager;
        this.gameApp = gameApp;
        this.isPlayerDead = false;
        this.deathScreenVisible = false;
        
        this.SetupEventListeners();
    }

    SetupEventListeners() {
        // Botón de reintentar
        document.getElementById('retry_button').addEventListener('click', () => {
            this.RetryGame();
        });
        
        // Botón de menú principal
        document.getElementById('main_menu_button').addEventListener('click', () => {
            this.GoToMainMenu();
        });
        
        // Botón de salir del juego
        document.getElementById('exit_game_button').addEventListener('click', () => {
            this.ExitToMainMenu();
        });
    }

    ShowDeathScreen() {
        if (this.deathScreenVisible) return;
        
        this.isPlayerDead = true;
        this.deathScreenVisible = true;
        
        // Reproducir sonido de muerte
        if (this.audioManager) {
            this.audioManager.playDeathSound();
        }
        
        // Mostrar pantalla de muerte con efecto de sangre
        const deathScreen = document.getElementById('death_screen');
        deathScreen.style.display = 'block';
        
        // Ocultar HUD del juego
        const gameHud = document.getElementById('game_hud');
        gameHud.style.visibility = 'hidden';
        
        // Pausar el juego
        if (this.gameApp) {
            this.gameApp.PauseGame();
        }
    }

    HideDeathScreen() {
        this.deathScreenVisible = false;
        
        const deathScreen = document.getElementById('death_screen');
        deathScreen.style.display = 'none';
        
        // Mostrar HUD del juego
        const gameHud = document.getElementById('game_hud');
        gameHud.style.visibility = 'visible';
    }

    RetryGame() {
        this.HideDeathScreen();
        this.isPlayerDead = false;
        
        // Reiniciar el juego con el mismo modo
        if (this.gameApp) {
            this.gameApp.RestartCurrentGame();
        }
    }

    GoToMainMenu() {
        this.HideDeathScreen();
        this.isPlayerDead = false;
        
        // Volver al menú principal
        if (this.gameApp) {
            this.gameApp.ShowMainMenu();
        }
    }

    ExitToMainMenu() {
        this.isPlayerDead = false;
        this.deathScreenVisible = false;
        
        // Ocultar pantalla de muerte si está visible
        const deathScreen = document.getElementById('death_screen');
        deathScreen.style.display = 'none';
        
        // Volver al menú principal
        if (this.gameApp) {
            this.gameApp.ShowMainMenu();
        }
    }

    ShowExitButton() {
        const exitButton = document.getElementById('exit_game_button');
        exitButton.style.display = 'block';
    }

    HideExitButton() {
        const exitButton = document.getElementById('exit_game_button');
        exitButton.style.display = 'none';
    }

    IsPlayerDead() {
        return this.isPlayerDead;
    }

    Reset() {
        this.isPlayerDead = false;
        this.deathScreenVisible = false;
        this.HideDeathScreen();
        this.HideExitButton();
        
        // Asegurar que todos los elementos del HUD estén ocultos
        const gameHud = document.getElementById('game_hud');
        gameHud.style.visibility = 'hidden';
        
        // Ocultar elementos específicos
        document.getElementById('safe_zone_indicator').style.display = 'none';
        document.getElementById('current_wave_indicator').style.display = 'none';
        document.getElementById('wave_system').style.display = 'none';
        document.getElementById('survival_radar').style.display = 'none';
        document.getElementById('safe_zone_direction').style.display = 'none';
        document.getElementById('zoom_level').style.display = 'none';
        document.getElementById('zoom_controls').style.display = 'none';
    }
}