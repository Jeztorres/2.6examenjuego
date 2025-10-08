import Component from "../../Component.js";

export default class PlayerHealth extends Component{
    constructor(audioManager = null, deathManager = null){
        super();

        this.health = 100;
        this.maxHealth = 100;
        this.regenerationRate = 20; // HP por segundo en zona segura
        this.isInSafeZone = false;
        this.audioManager = audioManager;
        this.deathManager = deathManager;
        this.regenSoundTimer = 0;
        this.isDead = false;
    }

    TakeHit = e =>{
        if (this.isDead) return;
        
        this.health = Math.max(0, this.health - 10);
        this.uimanager.SetHealth(this.health);
        
        // Verificar si el jugador ha muerto
        if (this.health <= 0 && !this.isDead) {
            this.isDead = true;
            this.Die();
        }
    }

    Die() {
        // Mostrar pantalla de muerte
        if (this.deathManager) {
            this.deathManager.ShowDeathScreen();
        }
        
        // Broadcast death event
        this.parent.Broadcast({topic: 'player_death'});
    }

    Revive() {
        this.isDead = false;
        this.health = this.maxHealth;
        this.uimanager.SetHealth(this.health);
    }

    SetInSafeZone(inSafeZone) {
        this.isInSafeZone = inSafeZone;
    }

    RegenerateHealth(deltaTime) {
        if (this.isInSafeZone && this.health < this.maxHealth) {
            this.health = Math.min(this.maxHealth, this.health + this.regenerationRate * deltaTime);
            this.uimanager.SetHealth(this.health);
            
            // Reproducir sonido de regeneración cada 0.5 segundos
            this.regenSoundTimer += deltaTime;
            if (this.regenSoundTimer >= 0.5 && this.audioManager) {
                this.audioManager.playHealthRegenSound();
                this.regenSoundTimer = 0;
            }
        } else {
            this.regenSoundTimer = 0;
        }
    }

    Initialize(){
        this.uimanager = this.FindEntity("UIManager").GetComponent("UIManager");
        this.parent.RegisterEventHandler(this.TakeHit, "hit");
        this.uimanager.SetHealth(this.health);
    }

    Update(deltaTime) {
        this.RegenerateHealth(deltaTime);
    }
}