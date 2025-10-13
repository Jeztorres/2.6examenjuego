import {FiniteStateMachine, State} from '../../FiniteStateMachine.js'
import * as THREE from 'three'

export default class CharacterFSM extends FiniteStateMachine{
    constructor(proxy){
        super();
        this.proxy = proxy;
        this.Init();
    }

    Init(){
        this.AddState('idle', new IdleState(this));
        this.AddState('patrol', new PatrolState(this));
        this.AddState('chase', new ChaseState(this));
        this.AddState('attack', new AttackState(this));
        this.AddState('dead', new DeadState(this));
    }
}

class IdleState extends State{
    constructor(parent){
        super(parent);
        this.maxWaitTime = 2.0; // Reducido de 5.0 a 2.0
        this.minWaitTime = 0.5; // Reducido de 1.0 a 0.5
        this.waitTime = 0.0;
    }

    get Name(){return 'idle'}
    get Animation(){
        const anim = this.parent.proxy.animations['idle'];
        if (!anim) {
            console.error(`❌ Animación 'idle' no encontrada para ${this.parent.proxy.parent.name}`);
        }
        return anim;
    }

    Enter(prevState){
        this.parent.proxy.canMove = false;
        this.waitTime = Math.random() * (this.maxWaitTime - this.minWaitTime) + this.minWaitTime;
        
        console.log(`🧍 ${this.parent.proxy.parent.name}: Entrando en estado IDLE (esperará ${this.waitTime.toFixed(1)}s)`);
        
        const action = this.Animation.action;

        if(prevState){
            action.time = 0.0;
            action.enabled = true;
            action.crossFadeFrom(prevState.Animation.action, 0.5, true);
        }

        action.play();
    }

    Update(t){
        if(this.waitTime <= 0.0){
            console.log(`🚶 ${this.parent.proxy.parent.name}: Tiempo de espera terminado, cambiando a PATROL`);
            this.parent.SetState('patrol');
            return;
        }

        this.waitTime -= t;

        if(this.parent.proxy.CanSeeThePlayer()){
            console.log(`👁️ ${this.parent.proxy.parent.name}: ¡Jugador detectado! Cambiando a CHASE`);
            this.parent.SetState('chase');
        }
    }
}

class PatrolState extends State{
    constructor(parent){
        super(parent);
    }

    get Name(){return 'patrol'}
    get Animation(){
        const anim = this.parent.proxy.animations['walk'];
        if (!anim) {
            console.error(`❌ Animación 'walk' no encontrada para ${this.parent.proxy.parent.name}`);
            console.log(`Animaciones disponibles:`, Object.keys(this.parent.proxy.animations));
        }
        return anim;
    }

    PatrolEnd = ()=>{
        this.parent.SetState('idle');
    }

    Enter(prevState){
        console.log(`🚶 ${this.parent.proxy.parent.name}: Entrando en estado PATROL`);
        this.parent.proxy.canMove = true;
        const action = this.Animation.action;

        if(prevState){
            action.time = 0.0;
            action.enabled = true;
            action.crossFadeFrom(prevState.Animation.action, 0.5, true);
        }

        action.play();

        // Pequeño delay antes de navegar para asegurar que todo esté listo
        setTimeout(() => {
            this.parent.proxy.NavigateToRandomPoint();
        }, 100);
    }

    Update(t){
        if(this.parent.proxy.CanSeeThePlayer()){
            this.parent.SetState('chase');
        }else if(this.parent.proxy.path && this.parent.proxy.path.length == 0){
            this.parent.SetState('idle');
        }
    }
}

class ChaseState extends State{
    constructor(parent){
        super(parent);
        this.updateFrequency = 0.5;
        this.updateTimer = 0.0;
        this.attackDistance = 2.0;
        this.shouldRotate = false;
        this.switchDelay = 0.2;
    }

    get Name(){return 'chase'}
    get Animation(){return this.parent.proxy.animations['run']; }

    RunToPlayer(prevState){
        this.parent.proxy.canMove = true;
        const action = this.Animation.action;
        this.updateTimer = 0.0;
        
        if(prevState){
            action.time = 0.0;
            action.enabled = true;
            action.setEffectiveTimeScale(1.0);
            action.setEffectiveWeight(1.0);
            action.crossFadeFrom(prevState.Animation.action, 0.2, true);
        }

        action.timeScale = 1.5;
        action.play();
    }

    Enter(prevState){
        console.log(`🏃 ${this.parent.proxy.parent.name}: Entrando en estado CHASE - ¡Persiguiendo al jugador!`);
        this.RunToPlayer(prevState);
    }

    Update(t){
        if(this.updateTimer <= 0.0){
            this.parent.proxy.NavigateToPlayer();
            this.updateTimer = this.updateFrequency;
        }

        if(this.parent.proxy.IsCloseToPlayer){
            if(this.switchDelay <= 0.0){
                console.log("ChaseState: Cambiando a attack!");
                this.parent.SetState('attack');
            } else {
                console.log(`ChaseState: Esperando para atacar. Delay: ${this.switchDelay.toFixed(2)}`);
            }

            this.parent.proxy.ClearPath();
            this.switchDelay -= t;
        }else{
            this.switchDelay = 0.1;
        }

        this.updateTimer -= t;
    }
}

class AttackState extends State{
    constructor(parent){
        super(parent);
        this.attackTime = 0.0;
        this.canHit = true;
    }

    get Name(){return 'attack'}
    get Animation(){return this.parent.proxy.animations['attack']; }

    Enter(prevState){
        console.log("AttackState: ¡Entrando en modo de ataque!");
        this.parent.proxy.canMove = false;
        const action = this.Animation.action;
        this.attackTime = this.Animation.clip.duration;
        this.attackEvent = this.attackTime * 0.85;
        console.log(`AttackState: Duración de ataque: ${this.attackTime}, Evento en: ${this.attackEvent}`);

        if(prevState){
            action.time = 0.0;
            action.enabled = true;
            action.crossFadeFrom(prevState.Animation.action, 0.1, true);
        }

        action.play();
    }

    Update(t){
        this.parent.proxy.FacePlayer(t);

        if(!this.parent.proxy.IsCloseToPlayer && this.attackTime <= 0.0){
            this.parent.SetState('chase');
            return;
        }

        if(this.canHit && this.attackTime <= this.attackEvent && this.parent.proxy.IsPlayerInHitbox){
            console.log("AttackState: ¡Ejecutando ataque!");
            this.parent.proxy.HitPlayer();
            this.canHit = false;
        }

        if(this.attackTime <= 0.0){
            this.attackTime = this.Animation.clip.duration;
            this.canHit = true;
        }

        this.attackTime -= t;
    }
}

class DeadState extends State{
    constructor(parent){
        super(parent);
        this.deathComplete = false;
    }

    get Name(){return 'dead'}
    get Animation(){return this.parent.proxy.animations['die']; }

    Enter(prevState){
        console.log(`💀 ${this.parent.proxy.parent.name}: Entrando en estado DEAD - Reproduciendo animación de muerte`);
        
        // Detener cualquier movimiento
        this.parent.proxy.canMove = false;
        this.parent.proxy.ClearPath();
        
        const action = this.Animation.action;
        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;

        if(prevState){
            action.time = 0.0;
            action.enabled = true;
            action.crossFadeFrom(prevState.Animation.action, 0.2, true);
        }

        action.play();
        
        // Marcar como muerto después de que termine la animación
        setTimeout(() => {
            this.deathComplete = true;
            console.log(`⚰️ ${this.parent.proxy.parent.name}: Animación de muerte completada`);
        }, this.Animation.clip.duration * 1000);
    }

    Update(t){
        // No hacer nada más, el NPC está muerto
        if (this.deathComplete) {
            // Opcional: podríamos hacer que el cuerpo desaparezca después de un tiempo
        }
    }
}