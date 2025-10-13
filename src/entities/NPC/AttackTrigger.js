import Component from '../../Component.js'
import {Ammo, AmmoHelper, CollisionFilterGroups} from '../../AmmoLib.js'

export default class AttackTrigger extends Component{
    constructor(physicsWorld){
        super();
        this.name = 'AttackTrigger';
        this.physicsWorld = physicsWorld;

        //Relative to parent
        this.localTransform = new Ammo.btTransform();
        this.localTransform.setIdentity();
        this.localTransform.getOrigin().setValue(0.0, 1.0, 1.0);

        this.quat = new Ammo.btQuaternion();

        this.overlapping = false;
        this.wasOverlapping = false;
        this.playerPhysics = null; // Se inicializará cuando se obtenga referencia al jugador
    }

    SetupTrigger(){
        const shape = new Ammo.btSphereShape(2.0); // Aumentado a 2.0 para coincidir con el rango de ataque
        this.ghostObj = AmmoHelper.CreateTrigger(shape);

        // Añadir con grupo SensorTrigger y máscara para detectar todo (AllFilter)
        // Esto permite que el trigger detecte al jugador
        this.physicsWorld.addCollisionObject(
            this.ghostObj, 
            CollisionFilterGroups.SensorTrigger,
            CollisionFilterGroups.AllFilter
        );
    }

    Initialize(){
        this.playerPhysics = this.FindEntity('Player').GetComponent('PlayerPhysics');
        this.SetupTrigger();
    }

    PhysicsUpdate(world, t){
        // Obtener referencia al jugador si no la tenemos
        if (!this.playerPhysics) {
            const player = this.parent.Manager.Get("Player");
            if (player) {
                this.playerPhysics = player.GetComponent("PlayerPhysics");
            }
        }

        if (!this.ghostObj || !this.playerPhysics || !this.playerPhysics.body) {
            return;
        }

        // Verificar si el jugador está en el rango usando distancia directa (más confiable)
        const playerPos = this.playerPhysics.parent.position;
        const triggerPos = this.parent.position;
        const distance = Math.sqrt(
            Math.pow(playerPos.x - triggerPos.x, 2) + 
            Math.pow(playerPos.y - triggerPos.y, 2) + 
            Math.pow(playerPos.z - triggerPos.z, 2)
        );
        
        // Radio del trigger (2.0 según el SetupTrigger)
        const triggerRadius = 2.0;
        const isOverlapping = distance <= triggerRadius;
        
        // console.log(`AttackTrigger ${this.parent.name}: Distancia al jugador: ${distance.toFixed(2)}, Radio trigger: ${triggerRadius}, Superpuesto: ${isOverlapping}`);

        // ¡IMPORTANTE! Actualizar la propiedad overlapping para que el CharacterController pueda verificar si el jugador está en el hitbox
        this.overlapping = isOverlapping;

        if (isOverlapping) {
            console.log(`AttackTrigger ${this.parent.name}: ¡JUGADOR DETECTADO EN TRIGGER!`);
            this.parent.Broadcast({
                topic: "character.player-in-attack-range",
                value: true
            });
        } else {
            // Solo enviar false si antes estaba true para evitar spam
            if (this.wasOverlapping) {
                console.log(`AttackTrigger ${this.parent.name}: Jugador salió del trigger`);
                this.parent.Broadcast({
                    topic: "character.player-in-attack-range",
                    value: false
                });
            }
        }

        this.wasOverlapping = isOverlapping;
    }
    
    Update(t){
        const entityPos = this.parent.position;
        const entityRot = this.parent.rotation;
        const transform = this.ghostObj.getWorldTransform();

        // Aplicar transformación local manualmente (compatible con CDN)
        const localPos = this.localTransform.getOrigin();
        const finalX = entityPos.x + localPos.x();
        const finalY = entityPos.y + localPos.y();
        const finalZ = entityPos.z + localPos.z();
        
        this.quat.setValue(entityRot.x, entityRot.y, entityRot.z, entityRot.w);
        transform.setRotation(this.quat);
        transform.getOrigin().setValue(finalX, finalY, finalZ);
    }
}