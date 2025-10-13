export default class EntityManager{
    constructor(){
        this.ids = 0;
        this.entities = [];
        this.mutantAssets = null;
        this.scene = null;
        this.physicsWorld = null;
        this.mutantCounter = 0;
        this.gameModeManager = null;
    }

    SetMutantAssets(mutantModel, mutantAnims, scene, physicsWorld) {
        this.mutantAssets = mutantModel;
        this.mutantAnims = mutantAnims;
        this.scene = scene;
        this.physicsWorld = physicsWorld;
    }

    SetGameModeManager(gameModeManager) {
        this.gameModeManager = gameModeManager;
    }

    // Escuchar eventos de muerte de mutantes para el modo clásico
    HandleMutantDeathEvent(event) {
        if (event.topic === 'mutant_death' && this.gameModeManager) {
            this.gameModeManager.HandleMutantDeath(event.mutant);
        }
    }

    Get(name){
        return this.entities.find(el=>el.Name===name);
    }

    Add(entity){
        if(!entity.Name){
            entity.SetName(this.ids);
        }
        entity.id = this.ids;
        this.ids++;
        entity.SetParent(this);
        this.entities.push(entity);
        
        // Si es un mutante, agregar listener para muerte en modo clásico
        if (entity.name && entity.name.startsWith('Mutant')) {
            entity.RegisterEventHandler((event) => {
                this.HandleMutantDeathEvent(event);
            }, 'mutant_death');
        }
    }

    Remove(entity) {
        const index = this.entities.indexOf(entity);
        if (index > -1) {
            // Cleanup de todos los componentes
            Object.values(entity.components).forEach(component => {
                if (component.Cleanup) {
                    component.Cleanup();
                }
            });
            
            // Cleanup del entity
            if (entity.Cleanup) {
                entity.Cleanup();
            }
            this.entities.splice(index, 1);
        }
    }

    SpawnMutant(location) {
        if (!this.mutantAssets || !this.scene || !this.physicsWorld) {
            console.warn('Mutant assets not set, cannot spawn mutant');
            return null;
        }

        // Importar las clases necesarias dinámicamente
        import('./Entity.js').then(({ default: Entity }) => {
            import('./entities/NPC/CharacterController.js').then(({ default: NpcCharacterController }) => {
                import('./entities/NPC/AttackTrigger.js').then(({ default: AttackTrigger }) => {
                    import('./entities/NPC/CharacterCollision.js').then(({ default: CharacterCollision }) => {
                        import('./entities/NPC/DirectionDebug.js').then(({ default: DirectionDebug }) => {
                            import('three/examples/jsm/utils/SkeletonUtils.js').then(({ SkeletonUtils }) => {
                                import('three').then((THREE) => {
                                    const npcEntity = new Entity();
                                    npcEntity.SetPosition(new THREE.Vector3(location[0], location[1], location[2]));
                                    npcEntity.SetName(`Mutant${this.mutantCounter++}`);
                                    
                                    const clonedMutant = SkeletonUtils.clone(this.mutantAssets);
                                    npcEntity.AddComponent(new NpcCharacterController(clonedMutant, this.mutantAnims, this.scene, this.physicsWorld));
                                    npcEntity.AddComponent(new AttackTrigger(this.physicsWorld));
                                    npcEntity.AddComponent(new CharacterCollision(this.physicsWorld));
                                    npcEntity.AddComponent(new DirectionDebug(this.scene));
                                    
                                    this.Add(npcEntity);
                                    
                                    // Inicializar el entity inmediatamente
                                    for(const key in npcEntity.components){
                                        npcEntity.components[key].Initialize();
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    }

    EndSetup(){
        for(const ent of this.entities){
            for(const key in ent.components){
                ent.components[key].Initialize();
            }
        }
    }

    PhysicsUpdate(world, timeStep){
        for (const entity of this.entities) {
            entity.PhysicsUpdate(world, timeStep);
        }
    }

    Update(timeElapsed){
        for (const entity of this.entities) {
            entity.Update(timeElapsed);
        }
    }
}