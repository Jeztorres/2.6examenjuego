import * as THREE from 'three'
import Component from '../../Component.js'
import {Ammo, AmmoHelper, CollisionFilterGroups} from '../../AmmoLib.js'

export default class CharacterCollision extends Component{
    constructor(physicsWorld){
        super();
        this.world = physicsWorld;
        this.bonePos = new THREE.Vector3();
        this.boneRot = new THREE.Quaternion();
        this.globalRot = new Ammo.btQuaternion();

        this.collisions = {
            'MutantLeftArm':{
                rotation: {x: -0.1, y: 0.0, z: Math.PI * 0.5},
                position: {x: 0.13, y: -0.04, z: 0.0},
                radius: 0.13,
                height: 0.13
            },
            'MutantLeftForeArm':{
                rotation: {x: -0.1, y: 0.0, z: Math.PI * 0.5},
                position: {x: 0.3, y: 0.0, z: -0.05},
                radius: 0.2,
                height: 0.3
            },
            'MutantRightArm':{
                rotation: {x: 0.1, y: 0.0, z: Math.PI * 0.5},
                position: {x: -0.13, y: -0.04, z: 0.0},
                radius: 0.13,
                height: 0.13
            },
            'MutantRightForeArm':{
                rotation: {x: 0.1, y: 0.0, z: Math.PI * 0.5},
                position: {x: -0.3, y: 0.0, z: -0.05},
                radius: 0.2,
                height: 0.3
            },
            'MutantSpine':{
                rotation: {x: 0.0, y: 0.0, z: 0.0},
                position: {x: 0.0, y: 0.25, z: 0.0},
                radius: 0.4, // Aumentado para ser más fácil de golpear
                height: 0.8  // Aumentado para ser más fácil de golpear
            },
            'MutantLeftUpLeg':{
                rotation: {x: -0.1, y: 0.0, z: 0.1},
                position: {x: -0.02, y: -0.12, z: 0.0},
                radius: 0.16,
                height: 0.24
            },
            'MutantRightUpLeg':{
                rotation: {x: -0.1, y: 0.0, z: -0.1},
                position: {x: 0.02, y: -0.12, z: 0.0},
                radius: 0.16,
                height: 0.24
            },
            'MutantLeftLeg':{
                rotation: {x: 0.13, y: 0.0, z: 0.0},
                position: {x: 0.02, y: -0.12, z: 0.0},
                radius: 0.14,
                height: 0.24
            },
            'MutantRightLeg':{
                rotation: {x: 0.13, y: 0.0, z: 0.0},
                position: {x: -0.02, y: -0.12, z: 0.0},
                radius: 0.14,
                height: 0.24
            },
            'MutantHead':{
                rotation: {x: 0.0, y: 0.0, z: 0.0},
                position: {x: 0.0, y: 0.0, z: 0.0},
                radius: 0.3, // Cabeza grande para fácil detección
                height: 0.3
            },
        };
    }

    Initialize(){
        this.controller = this.GetComponent('CharacterController');

        this.controller.model.traverse(child =>{
            if ( !child.isSkinnedMesh  ) {
                return;
            }

            this.mesh = child;
        });

        Object.keys(this.collisions).forEach(key=>{
            const collision = this.collisions[key];

            collision.bone = this.mesh.skeleton.bones.find(bone => bone.name == key);

            const shape = new Ammo.btCapsuleShape(collision.radius, collision.height);
            collision.object = AmmoHelper.CreateTrigger(shape);
            
            // Asegurar que la referencia a la entidad padre esté correcta
            collision.object.parentEntity = this.parent;

            // Crear quaternion desde ángulos de Euler de manera compatible con CDN
            const localRot = new Ammo.btQuaternion();
            // Usar setEuler o crear manualmente el quaternion
            // Para compatibilidad, convertimos usando three.js
            const tempEuler = new THREE.Euler(collision.rotation.x, collision.rotation.y, collision.rotation.z, 'XYZ');
            const tempQuat = new THREE.Quaternion();
            tempQuat.setFromEuler(tempEuler);
            localRot.setValue(tempQuat.x, tempQuat.y, tempQuat.z, tempQuat.w);
            
            collision.localTransform = new Ammo.btTransform();
            collision.localTransform.setIdentity();
            collision.localTransform.setRotation(localRot);
            collision.localTransform.getOrigin().setValue(collision.position.x, collision.position.y, collision.position.z);

            // Añadir con máscaras de colisión apropiadas para detección de disparos
            // Usar CharacterFilter para que los raycast los detecten correctamente
            this.world.addCollisionObject(
                collision.object,
                CollisionFilterGroups.CharacterFilter,
                CollisionFilterGroups.AllFilter
            );
        });

    }

    Update(t){
        Object.keys(this.collisions).forEach(key=>{
            const collision = this.collisions[key];
            
            const transform = collision.object.getWorldTransform();

            collision.bone.getWorldPosition(this.bonePos);
            collision.bone.getWorldQuaternion(this.boneRot);

            // Aplicar transformación local manualmente (compatible con CDN)
            const localPos = collision.localTransform.getOrigin();
            const finalX = this.bonePos.x + localPos.x();
            const finalY = this.bonePos.y + localPos.y();
            const finalZ = this.bonePos.z + localPos.z();

            this.globalRot.setValue(this.boneRot.x, this.boneRot.y, this.boneRot.z, this.boneRot.w);
            transform.getOrigin().setValue(finalX, finalY, finalZ);
            transform.setRotation(this.globalRot);
        });

    }
}