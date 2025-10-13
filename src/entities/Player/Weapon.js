import * as THREE from 'three'
import Component from '../../Component.js'
import Input from '../../Input.js'
import {Ammo, AmmoHelper, CollisionFilterGroups} from '../../AmmoLib.js'

import WeaponFSM from './WeaponFSM.js';


export default class Weapon extends Component{
    constructor(camera, model, flash, world, shotSoundBuffer, listner){
        super();
        this.name = 'Weapon';
        this.camera = camera;
        this.world = world;
        this.model = model;
        this.flash = flash;
        this.animations = {};
        this.shoot = false;
        this.fireRate = 0.1;
        this.shootTimer = 0.0;

        this.shotSoundBuffer = shotSoundBuffer;
        this.audioListner = listner;

        this.magAmmo = 30;
        this.ammoPerMag = 30;
        this.ammo = 100;
        this.damage = 10; // Daño balanceado: 3 disparos para matar (30 vida / 10 daño = 3 disparos)
        this.uimanager = null;
        this.reloading = false;
        this.hitResult = {intersectionPoint: new THREE.Vector3(), intersectionNormal: new THREE.Vector3()};

    }

    SetAnim(name, clip){
        const action = this.mixer.clipAction(clip);
        this.animations[name] = {clip, action};
    }

    SetAnimations(){
        this.mixer = new THREE.AnimationMixer( this.model );
        this.SetAnim('idle', this.model.animations[1]);
        this.SetAnim('reload', this.model.animations[2]);
        this.SetAnim('shoot', this.model.animations[0]);
    }

    SetMuzzleFlash(){
        this.flash.position.set(-0.3, -0.5, 8.3);
        this.flash.rotateY(Math.PI);
        this.model.add(this.flash);
        this.flash.life = 0.0;

        this.flash.children[0].material.blending = THREE.AdditiveBlending;
    }

    SetSoundEffect(){
        this.shotSound = new THREE.Audio(this.audioListner);
        this.shotSound.setBuffer(this.shotSoundBuffer);
        this.shotSound.setLoop(false);
    }

    AmmoPickup = (e) => {
        this.ammo += 30;
        this.uimanager.SetAmmo(this.magAmmo, this.ammo);
    }

    Initialize(){
        const scene = this.model;
        scene.scale.set(0.05, 0.05, 0.05);
        scene.position.set(0.04, -0.02, 0.0);
        scene.setRotationFromEuler(new THREE.Euler(THREE.MathUtils.degToRad(5), THREE.MathUtils.degToRad(185), 0));

        scene.traverse(child=>{
            if(!child.isSkinnedMesh){
                return;
            }

            child.receiveShadow = true;
        });

        this.camera.add(scene);

        this.SetAnimations();
        this.SetMuzzleFlash();
        this.SetSoundEffect();

        this.stateMachine = new WeaponFSM(this);
        this.stateMachine.SetState('idle');

        this.uimanager = this.FindEntity("UIManager").GetComponent("UIManager");
        this.uimanager.SetAmmo(this.magAmmo, this.ammo);

        this.SetupInput();

        //Listen to ammo pickup event
        this.parent.RegisterEventHandler(this.AmmoPickup, "AmmoPickup");
    }

    SetupInput(){
        Input.AddMouseDownListner( e => {
            if(e.button != 0 || this.reloading){
                return;
            }

            this.shoot = true;
            this.shootTimer = 0.0;
        });

        Input.AddMouseUpListner( e => {
            if(e.button != 0){
                return;
            }

            this.shoot = false;
        });

        Input.AddKeyDownListner(e => {
            if(e.repeat) return;

            if(e.code == "KeyR"){
                this.Reload();
            }
        });
    }

    Reload(){
        if(this.reloading || this.magAmmo == this.ammoPerMag || this.ammo == 0){
            return;
        }

        this.reloading = true;
        this.stateMachine.SetState('reload');
    }

    ReloadDone(){
        this.reloading = false;
        const bulletsNeeded = this.ammoPerMag - this.magAmmo;
        this.magAmmo = Math.min(this.ammo + this.magAmmo, this.ammoPerMag);
        this.ammo = Math.max(0, this.ammo - bulletsNeeded);
        this.uimanager.SetAmmo(this.magAmmo, this.ammo);
    }

    Raycast(){
        const start = new THREE.Vector3(0.0, 0.0, -1.0);
        start.unproject(this.camera);
        const end = new THREE.Vector3(0.0, 0.0, 1.0);
        end.unproject(this.camera);

        console.log("🔫 DISPARANDO...");

        // MÉTODO PRINCIPAL: Raycast tradicional
        const collisionMask = CollisionFilterGroups.AllFilter;
        
        if(AmmoHelper.CastRay(this.world, start, end, this.hitResult, collisionMask)){
            const ghostBody = Ammo.castObject( this.hitResult.collisionObject, Ammo.btPairCachingGhostObject );
            const rigidBody = Ammo.castObject( this.hitResult.collisionObject, Ammo.btRigidBody ); 
            const entity = ghostBody?.parentEntity || rigidBody?.parentEntity;
            
            console.log("🎯 RAYCAST HIT:", entity ? entity.name : "Sin entidad");
            
            if (entity && entity.name && entity.name.startsWith('Mutant')) {
                console.log("🎯 ¡MUTANTE GOLPEADO POR RAYCAST!");
                entity.Broadcast({'topic': 'hit', from: this.parent, amount: this.damage, hitResult: this.hitResult});
                return;
            }
        }

        // MÉTODO ALTERNATIVO: Buscar mutantes cercanos a la línea de disparo
        console.log("🔍 Raycast falló, usando detección alternativa...");
        this.CheckMutantsInLine(start, end);
    }

    CheckMutantsInLine(start, end) {
        // Acceder al EntityManager a través del parent
        const player = this.parent;
        const entityManager = player.parent; // El EntityManager es el parent del player
        
        if (!entityManager || !entityManager.entities) {
            console.log("❌ No se pudo acceder al EntityManager");
            return;
        }

        console.log(`🔍 Buscando entre ${entityManager.entities.length} entidades...`);
        
        let mutantsFound = 0;
        for (const entity of entityManager.entities) {
            // Debug: mostrar todos los nombres de entidades
            if (entity.name) {
                console.log(`🔍 Entidad encontrada: ${entity.name}`);
            }
            
            // Buscar mutantes con diferentes patrones de nombre
            if (entity.name && (entity.name.startsWith('Mutant') || entity.name.includes('mutant'))) {
                mutantsFound++;
                const mutantPos = entity.Position;
                
                console.log(`🧟 Mutante encontrado: ${entity.name} en posición:`, mutantPos);
                
                // Crear línea de disparo
                const direction = end.clone().sub(start).normalize();
                const distance = start.distanceTo(mutantPos);
                
                // Punto más cercano en la línea al mutante
                const toMutant = mutantPos.clone().sub(start);
                const projectionLength = toMutant.dot(direction);
                const closestPoint = start.clone().add(direction.multiplyScalar(projectionLength));
                const distanceToLine = mutantPos.distanceTo(closestPoint);
                
                console.log(`📏 ${entity.name}: distancia=${distance.toFixed(2)}, distanciaALinea=${distanceToLine.toFixed(2)}`);
                
                // Hacer la detección menos estricta para facilitar los hits
                if (distanceToLine < 3.0 && distance < 150) { // Aumenté la tolerancia
                    console.log("🎯 ¡MUTANTE DETECTADO POR MÉTODO ALTERNATIVO!");
                    entity.Broadcast({'topic': 'hit', from: this.parent, amount: this.damage});
                    return;
                }
            }
        }
        
        console.log(`❌ No se encontraron hits. Mutantes encontrados: ${mutantsFound}`);
    }

    CreateHitEffect(position) {
        // Efecto visual simple de impacto (opcional)
        // Se puede expandir más tarde con partículas de sangre, etc.
        console.log("💥 Efecto de impacto en posición:", position);
    }

    Shoot(t){
        if(!this.shoot){
            return;
        }

        if(!this.magAmmo){
            //Reload automatically
            this.Reload();
            return;
        }

        if(this.shootTimer <= 0.0 ){
            //Shoot
            this.flash.life = this.fireRate;
            this.flash.rotateZ(Math.PI * Math.random());
            const scale = Math.random() * (1.5 - 0.8) + 0.8;
            this.flash.scale.set(scale, 1, 1);
            this.shootTimer = this.fireRate;
            this.magAmmo = Math.max(0, this.magAmmo - 1);
            this.uimanager.SetAmmo(this.magAmmo, this.ammo);

            this.Raycast();
            this.Broadcast({topic: 'ak47_shot'});
            
            this.shotSound.isPlaying && this.shotSound.stop();
            this.shotSound.play();
        }

        this.shootTimer = Math.max(0.0, this.shootTimer - t);
    }

    AnimateMuzzle(t){
        const mat = this.flash.children[0].material;
        const ratio = this.flash.life / this.fireRate;
        mat.opacity = ratio;
        this.flash.life = Math.max(0.0, this.flash.life - t);
    }

    Update(t){
        this.mixer.update(t);
        this.stateMachine.Update(t);
        this.Shoot(t);
        this.AnimateMuzzle(t);
    }

}