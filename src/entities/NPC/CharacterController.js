import * as THREE from 'three'
import Component from '../../Component.js'
import {Ammo, AmmoHelper, CollisionFilterGroups} from '../../AmmoLib.js'
import CharacterFSM from './CharacterFSM.js'
import HealthBar from './HealthBar.js'

import DebugShapes from '../../DebugShapes.js'


export default class CharacterController extends Component{
    constructor(model, clips, scene, physicsWorld){
        super();
        this.name = 'CharacterController';
        this.physicsWorld = physicsWorld;
        this.scene = scene;
        this.mixer = null;
        this.clips = clips;
        this.animations = {};
        this.model = model;
        this.dir = new THREE.Vector3();
        this.forwardVec = new THREE.Vector3(0,0,1);
        this.pathDebug = new DebugShapes(scene);
        this.path = [];
        this.tempRot = new THREE.Quaternion();

        this.viewAngle = Math.cos(Math.PI / 4.0);
        this.maxViewDistance = 20.0 * 20.0;
        this.tempVec = new THREE.Vector3();
        this.attackDistance = 2.2;

        this.canMove = true;
        this.maxHealth = 30; // Vida balanceada: muere en 3-4 disparos
        this.health = this.maxHealth;
        this.healthBar = null;
        this.isDead = false;
        
        // Variables para detectar si el NPC está atascado
        this.lastKnownPosition = new THREE.Vector3();
        this.stuckTimer = 0;
        this.stuckThreshold = 3.0; // Segundos sin moverse para considerarse atascado
        
        // Multiplicador de velocidad para modo supervivencia
        this.speedMultiplier = 1.0;
    }

    SetAnim(name, clip){
        const action = this.mixer.clipAction(clip);
        this.animations[name] = {clip, action};
    }

    SetupAnimations(){
        if (this.clips && typeof this.clips === 'object') {
            Object.keys(this.clips).forEach(key=>{this.SetAnim(key, this.clips[key])});
        } else {
            console.warn(`${this.parent.name}: this.clips no está definido o no es un objeto válido`);
        }
    }

    Initialize(){
        this.stateMachine = new CharacterFSM(this);
        
        // Intentar obtener navmesh con reintentos
        this.InitializeNavmesh();
        
        this.hitbox = this.GetComponent('AttackTrigger');
        this.player = this.FindEntity("Player");

        this.parent.RegisterEventHandler(this.TakeHit, 'hit');
        console.log(`✅ ${this.parent.name} listo para combate (Vida: ${this.health})`);

        const scene = this.model;

        scene.scale.setScalar(0.01);
        scene.position.copy(this.parent.position);
        
        this.mixer = new THREE.AnimationMixer( scene );

        scene.traverse(child => {
            if ( !child.isSkinnedMesh  ) {
                return;
            }

            child.frustumCulled = false;
            child.castShadow = true;
            child.receiveShadow = true;
            this.skinnedmesh = child;
            this.rootBone = child.skeleton.bones.find(bone => bone.name == 'MutantHips');
            this.rootBone.refPos = this.rootBone.position.clone();
            this.lastPos = this.rootBone.position.clone();
        });

        this.SetupAnimations();

        this.scene.add(scene);
        
        // Crear barra de vida
        this.healthBar = new HealthBar(this.scene, this.maxHealth);
        this.healthBar.SetParent(this);
        this.healthBar.Initialize();
        
        if (this.healthBar) {
            this.healthBar.UpdatePosition(this.model.position);
            // Mostrar la barra de vida inmediatamente
            this.healthBar.ShowHealthBar();
            console.log(`❤️ ${this.parent.name}: Barra de vida inicializada y visible`);
        }
        
        // Inicializar con un pequeño delay y luego forzar movimiento
        setTimeout(() => {
            console.log(`🚀 ${this.parent.name}: Forzando inicio de patrullaje...`);
            this.VerifyHealthBarSetup(); // Verificar que la barra de vida esté funcionando
            this.stateMachine.SetState('patrol');
        }, 500 + Math.random() * 1000); // Delay aleatorio entre 0.5 y 1.5 segundos
    }

    // Método para verificar que la barra de vida esté configurada correctamente
    VerifyHealthBarSetup() {
        if (this.healthBar) {
            console.log(`✅ ${this.parent.name}: Barra de vida OK (${this.health}/${this.maxHealth})`);
            // Mostrar brevemente la barra para confirmar que funciona
            this.healthBar.ShowHealthBar();
        } else {
            console.error(`❌ ${this.parent.name}: ¡FALTA BARRA DE VIDA!`);
            // Intentar crear una nueva barra de vida
            this.healthBar = new HealthBar(this.scene, this.maxHealth);
            this.healthBar.SetParent(this);
            this.healthBar.Initialize();
            this.healthBar.ShowHealthBar();
            console.log(`🔧 ${this.parent.name}: Barra de vida creada de emergencia`);
        }
    }

    InitializeNavmesh() {
        const levelEntity = this.FindEntity('Level');
        if (levelEntity) {
            this.navmesh = levelEntity.GetComponent('Navmesh');
            if (this.navmesh) {
                console.log(`🗺️ ${this.parent.name}: Navmesh inicializado correctamente`);
            } else {
                console.warn(`⚠️ ${this.parent.name}: No se pudo encontrar el componente Navmesh`);
                // Reintentar después de un momento
                setTimeout(() => {
                    this.InitializeNavmesh();
                }, 1000);
            }
        } else {
            console.warn(`⚠️ ${this.parent.name}: No se pudo encontrar la entidad Level`);
            // Reintentar después de un momento
            setTimeout(() => {
                this.InitializeNavmesh();
            }, 1000);
        }
    }

    UpdateDirection(){
        this.dir.copy(this.forwardVec);
        this.dir.applyQuaternion(this.parent.rotation);
    }

    CanSeeThePlayer(){
        const playerPos = this.player.Position.clone();
        const modelPos = this.model.position.clone();
        modelPos.y += 1.35;
        const charToPlayer = playerPos.sub(modelPos);

        if(playerPos.lengthSq() > this.maxViewDistance){
            return;
        }

        charToPlayer.normalize();
        const angle = charToPlayer.dot(this.dir);

        if(angle < this.viewAngle){
            return false;
        }

        const rayInfo = {};
        const collisionMask = CollisionFilterGroups.AllFilter & ~CollisionFilterGroups.SensorTrigger;
        
        if(AmmoHelper.CastRay(this.physicsWorld, modelPos, this.player.Position, rayInfo, collisionMask)){
            const body = Ammo.castObject( rayInfo.collisionObject, Ammo.btRigidBody );

            if(body == this.player.GetComponent('PlayerPhysics').body){
                return true;
            }
        }

        return false;
    }

    NavigateToRandomPoint(){
        if (!this.navmesh) {
            console.log(`❌ ${this.parent.name}: No hay navmesh disponible, usando navegación directa...`);
            this.NavigateToRandomPointDirect();
            return;
        }
        
        try {
            const node = this.navmesh.GetRandomNode(this.model.position, 50);
            if (!node) {
                console.warn(`⚠️ ${this.parent.name}: No se pudo obtener nodo aleatorio, probando con rango menor`);
                const closerNode = this.navmesh.GetRandomNode(this.model.position, 20);
                if (closerNode) {
                    this.path = this.navmesh.FindPath(this.model.position, closerNode);
                } else {
                    console.warn(`⚠️ ${this.parent.name}: Navmesh falló, usando navegación directa`);
                    this.NavigateToRandomPointDirect();
                    return;
                }
            } else {
                this.path = this.navmesh.FindPath(this.model.position, node);
            }
            
            if (this.path && this.path.length > 0) {
                console.log(`🗺️ ${this.parent.name}: Navegando a punto aleatorio. Path length: ${this.path.length}`);
                console.log(`📍 Desde: (${this.model.position.x.toFixed(1)}, ${this.model.position.z.toFixed(1)}) Hacia: (${node.x.toFixed(1)}, ${node.z.toFixed(1)})`);
            } else {
                console.warn(`⚠️ ${this.parent.name}: Path vacío, usando navegación directa`);
                this.NavigateToRandomPointDirect();
            }
        } catch (error) {
            console.error(`❌ ${this.parent.name}: Error en navegación, usando navegación directa:`, error);
            this.NavigateToRandomPointDirect();
        }
    }

    // Método de navegación simple sin navmesh como respaldo
    NavigateDirectly(targetPosition) {
        console.log(`🎯 ${this.parent.name}: Navegación directa activada hacia (${targetPosition.x.toFixed(1)}, ${targetPosition.z.toFixed(1)})`);
        
        // Crear un path simple con solo el destino
        this.path = [targetPosition.clone()];
        
        // Asegurar que el NPC puede moverse
        this.canMove = true;
        
        return true;
    }

    NavigateToRandomPointDirect() {
        // Si el navmesh falla, crear un punto aleatorio simple
        const currentPos = this.model.position;
        const randomAngle = Math.random() * Math.PI * 2;
        const randomDistance = 5 + Math.random() * 10; // Entre 5 y 15 unidades
        
        const targetPos = new THREE.Vector3(
            currentPos.x + Math.cos(randomAngle) * randomDistance,
            currentPos.y,
            currentPos.z + Math.sin(randomAngle) * randomDistance
        );
        
        console.log(`🎲 ${this.parent.name}: Navegación directa aleatoria activada`);
        return this.NavigateDirectly(targetPos);
    }

    NavigateToPlayer(){
        if (!this.navmesh) {
            console.log(`❌ ${this.parent.name}: No hay navmesh para perseguir, usando navegación directa`);
            this.NavigateDirectly(this.player.Position);
            return;
        }
        
        try {
            this.tempVec.copy(this.player.Position);
            this.tempVec.y = 0.5;
            this.path = this.navmesh.FindPath(this.model.position, this.tempVec);

            if (!this.path || this.path.length === 0) {
                console.warn(`⚠️ ${this.parent.name}: No se pudo crear path al jugador, usando navegación directa`);
                this.NavigateDirectly(this.player.Position);
            }
        } catch (error) {
            console.error(`❌ ${this.parent.name}: Error navegando al jugador, usando navegación directa:`, error);
            this.NavigateDirectly(this.player.Position);
        }

        /*
        if(this.path){
            this.pathDebug.Clear();
            for(const point of this.path){
                this.pathDebug.AddPoint(point, "blue");
            }
        }
        */
    }

    FacePlayer(t, rate = 3.0){
        this.tempVec.copy(this.player.Position).sub(this.model.position);
        this.tempVec.y = 0.0;
        this.tempVec.normalize();

        this.tempRot.setFromUnitVectors(this.forwardVec, this.tempVec);
        this.model.quaternion.rotateTowards(this.tempRot, rate * t);
    }

    get IsCloseToPlayer(){
        this.tempVec.copy(this.player.Position).sub(this.model.position);
        const distance = this.tempVec.length();
        return distance <= this.attackDistance;
    }

    get IsPlayerInHitbox(){
        if (!this.hitbox) {
            return false;
        }
        
        const inHitbox = this.hitbox.overlapping;
        return inHitbox;
    }

    HitPlayer(){
        // Enviar daño específico cuando el mutante ataca al jugador
        // 20 de daño significa que el jugador muere en 5 ataques (100/20=5)
        this.player.Broadcast({topic: 'hit', from: this.parent, amount: 20});
    }

    TakeHit = msg => {
        // No recibir más daño si ya está muerto
        if (this.isDead) {
            return;
        }

        console.log(`💥 ${this.parent.name} RECIBIÓ DAÑO: ${msg.amount} (Vida: ${this.health}→${this.health - msg.amount})`);
        
        // Aplicar daño
        const damage = msg.amount;
        this.health = Math.max(0, this.health - damage);

        // Actualizar y mostrar barra de vida
        if (this.healthBar) {
            this.healthBar.UpdateHealth(this.health);
            this.healthBar.ShowHealthBar(); // Mostrar la barra cuando recibe daño
            console.log(`❤️ ${this.parent.name}: Barra de vida actualizada (${this.health}/${this.maxHealth})`);
        }

        // Verificar muerte
        if(this.health <= 0 && !this.isDead){
            console.log(`💀 ${this.parent.name} MURIÓ! (Daño final: ${damage})`);
            this.isDead = true;
            this.canMove = false; // Detener todo movimiento
            this.ClearPath(); // Limpiar cualquier path activo
            this.stateMachine.SetState('dead');
            
            // Mostrar barra de vida en rojo antes de ocultarla
            if (this.healthBar) {
                this.healthBar.UpdateHealth(0);
                this.healthBar.ShowHealthBar(); // Asegurar que se vea la muerte
            }
            
            // Ocultar barra de vida después de un momento
            setTimeout(() => {
                if (this.healthBar) {
                    this.healthBar.HideHealthBar();
                }
            }, 3000); // Aumentado a 3 segundos para ver mejor la muerte
            
            // Emitir evento de muerte para el modo clásico
            this.parent.Broadcast({topic: 'mutant_death', mutant: this.parent});
        } else if(!this.isDead){
            // Activar persecución si está herido
            const stateName = this.stateMachine.currentState.Name;
            if(stateName == 'idle' || stateName == 'patrol'){
                this.stateMachine.SetState('chase');
            }
        }
    }

    MoveAlongPath(t){
        if(!this.path?.length) {
            return;
        }

        const target = this.path[0].clone().sub( this.model.position );
        target.y = 0.0;
        
        const distance = target.length();
        
        if (distance > 0.1) {
            target.normalize();
            this.tempRot.setFromUnitVectors(this.forwardVec, target);
            this.model.quaternion.slerp(this.tempRot, 4.0 * t);
            
            // Debug: mostrar que se está moviendo con más frecuencia para diagnosticar
            if (Math.random() < 0.05) { // Aumentar frecuencia para debug
                console.log(`🚶 ${this.parent.name}: Moviéndose hacia objetivo (distancia: ${distance.toFixed(2)}, pos: ${this.model.position.x.toFixed(1)}, ${this.model.position.z.toFixed(1)})`);
            }
        } else {
            // Remove node from the path we calculated
            this.path.shift();
            console.log(`✅ ${this.parent.name}: Llegó a punto del path. Puntos restantes: ${this.path.length}`);

            if(this.path.length===0){
                console.log(`🏁 ${this.parent.name}: Path completado, notificando fin de navegación`);
                this.Broadcast({topic: 'nav.end', agent: this});
            }
        }
    }

    ClearPath(){
        if(this.path){
            this.path.length = 0;
        }
    }

    ApplyRootMotion(){
        if(this.canMove && this.rootBone){
            const vel = this.rootBone.position.clone();
            vel.sub(this.lastPos).multiplyScalar(0.01);
            vel.y = 0;

            vel.applyQuaternion(this.model.quaternion);

            const velMagnitude = vel.length();
            
            // Ajustar rangos de velocidad válida y añadir un multiplicador de velocidad
            if(velMagnitude > 0.0001 && velMagnitude < 0.2){
                // Aplicar multiplicadores: base (1.5) + modo supervivencia
                const totalSpeedMultiplier = 1.5 * this.speedMultiplier;
                vel.multiplyScalar(totalSpeedMultiplier);
                this.model.position.add(vel);
                
                // Debug: mostrar movimiento con más frecuencia para diagnosticar
                if (Math.random() < 0.02) {
                    console.log(`🦴 ${this.parent.name}: Root motion aplicado (vel: ${velMagnitude.toFixed(4)}, pos: ${this.model.position.x.toFixed(2)}, ${this.model.position.z.toFixed(2)})`);
                }
            }
        }

        //Reset the root bone horizontal position
        if (this.rootBone) {
            this.lastPos.copy(this.rootBone.position);
            this.rootBone.position.z = this.rootBone.refPos.z;
            this.rootBone.position.x = this.rootBone.refPos.x;
        }
    }

    CheckIfStuck(t) {
        const currentPos = this.model.position;
        const distanceMoved = currentPos.distanceTo(this.lastKnownPosition);
        
        if (distanceMoved < 0.1 && this.canMove && this.path && this.path.length > 0) {
            this.stuckTimer += t;
            
            if (this.stuckTimer > this.stuckThreshold) {
                console.warn(`⚠️ ${this.parent.name}: ¡NPC atascado! Intentando recuperación...`);
                // Limpiar path y forzar nuevo destino
                this.ClearPath();
                this.stateMachine.SetState('idle');
                this.stuckTimer = 0;
            }
        } else {
            this.stuckTimer = 0;
            this.lastKnownPosition.copy(currentPos);
        }
    }

    Update(t){
        // No actualizar nada si está muerto
        if (this.isDead) {
            // Solo actualizar la animación de muerte y la barra de vida
            this.mixer && this.mixer.update(t);
            if (this.healthBar) {
                this.healthBar.UpdatePosition(this.model.position);
                const player = this.FindEntity("Player");
                if (player) {
                    const playerControls = player.GetComponent("PlayerControls");
                    if (playerControls && playerControls.camera) {
                        this.healthBar.Update(t, playerControls.camera);
                    }
                }
            }
            this.parent.SetRotation(this.model.quaternion);
            this.parent.SetPosition(this.model.position);
            return;
        }
        
        this.mixer && this.mixer.update(t);
        this.ApplyRootMotion();

        this.UpdateDirection();
        this.MoveAlongPath(t);
        this.stateMachine.Update(t);
        
        // Verificar si el NPC está atascado (solo si está vivo)
        this.CheckIfStuck(t);

        // Actualizar posición de la barra de vida
        if (this.healthBar) {
            this.healthBar.UpdatePosition(this.model.position);
            
            // Obtener cámara del jugador
            const player = this.FindEntity("Player");
            if (player) {
                const playerControls = player.GetComponent("PlayerControls");
                if (playerControls && playerControls.camera) {
                    this.healthBar.Update(t, playerControls.camera);
                }
            }
        }

        this.parent.SetRotation(this.model.quaternion);
        this.parent.SetPosition(this.model.position);
    }

    Cleanup() {
        if (this.healthBar) {
            this.healthBar.Cleanup();
        }
    }
}