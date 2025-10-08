/**
 * entry.js
 * 
 * This is the first file loaded. It sets up the Renderer, 
 * Scene, Physics and Entities. It also starts the render loop and 
 * handles window resizes.
 * 
 */

import * as THREE from 'three'
import {AmmoHelper, Ammo, createConvexHullShape} from './AmmoLib.js'
import EntityManager from './EntityManager.js'
import Entity from './Entity.js'
import Sky from './entities/Sky/Sky2.js'
import LevelSetup from './entities/Level/LevelSetup.js'
import PlayerControls from './entities/Player/PlayerControls.js'
import PlayerPhysics from './entities/Player/PlayerPhysics.js'
import Stats from 'three/examples/jsm/libs/stats.module.js'
import {  FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js'
import {  GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import {  OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import {  SkeletonUtils } from 'three/examples/jsm/utils/SkeletonUtils.js'
import NpcCharacterController from './entities/NPC/CharacterController.js'
import Input from './Input.js'

// Assets paths (sin webpack, usamos rutas directas)
const level = './src/assets/level.glb'
const navmesh = './src/assets/navmesh.obj'

const mutant = './src/assets/animations/mutant.fbx'
const idleAnim = './src/assets/animations/mutant breathing idle.fbx'
const attackAnim = './src/assets/animations/mutant punch.fbx'
const walkAnim = './src/assets/animations/mutant walking.fbx'
const runAnim = './src/assets/animations/mutant run.fbx'
const dieAnim = './src/assets/animations/mutant dying.fbx'

//AK47 Model and textures
const ak47 = './src/assets/guns/ak47/ak47.glb'
const muzzleFlash = './src/assets/muzzle_flash.glb'
//Shot sound
const ak47Shot = './src/assets/sounds/ak47_shot.wav'

//Ammo box
const ammobox = './src/assets/ammo/AmmoBox.fbx'
const ammoboxTexD = './src/assets/ammo/AmmoBox_D.tga.png'
const ammoboxTexN = './src/assets/ammo/AmmoBox_N.tga.png'
const ammoboxTexM = './src/assets/ammo/AmmoBox_M.tga.png'
const ammoboxTexR = './src/assets/ammo/AmmoBox_R.tga.png'
const ammoboxTexAO = './src/assets/ammo/AmmoBox_AO.tga.png'

//Bullet Decal
const decalColor = './src/assets/decals/decal_c.jpg'
const decalNormal = './src/assets/decals/decal_n.jpg'
const decalAlpha = './src/assets/decals/decal_a.jpg'

//Sky
const skyTex = './src/assets/sky.jpg'

import DebugDrawer from './DebugDrawer.js'
import Navmesh from './entities/Level/Navmesh.js'
import AttackTrigger from './entities/NPC/AttackTrigger.js'
import DirectionDebug from './entities/NPC/DirectionDebug.js'
import CharacterCollision from './entities/NPC/CharacterCollision.js'
import Weapon from './entities/Player/Weapon.js'
import UIManager from './entities/UI/UIManager.js'
import AmmoBox from './entities/AmmoBox/AmmoBox.js'
import LevelBulletDecals from './entities/Level/BulletDecals.js'
import PlayerHealth from './entities/Player/PlayerHealth.js'
import GameModeManager, { GameModes } from './GameModeManager.js'
import SafeZone from './entities/SafeZone/SafeZone.js'
import AudioManager from './AudioManager.js'
import DeathManager from './DeathManager.js'

class FPSGameApp{

  constructor(){
    this.lastFrameTime = null;
    this.assets = {};
    this.animFrameId = 0;
    this.audioManager = new AudioManager();
    this.gameModeManager = new GameModeManager(this.audioManager);
    this.deathManager = new DeathManager(this.audioManager, this);
    this.currentGameMode = GameModes.CLASSIC;
    this.isGamePaused = false;

    AmmoHelper.Init(()=>{this.Init();});
  }

  Init(){
    this.LoadAssets();
    this.SetupGraphics();
  }

  SetupGraphics(){
    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer({antialias: true});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.renderer.toneMapping = THREE.ReinhardToneMapping;
		this.renderer.toneMappingExposure = 1;
		this.renderer.outputEncoding = THREE.sRGBEncoding;

    this.camera = new THREE.PerspectiveCamera();
    this.camera.near = 0.01;

    // create an AudioListener and add it to the camera
    this.listener = new THREE.AudioListener();
    this.camera.add( this.listener );

    // renderer
    this.renderer.setPixelRatio(window.devicePixelRatio);

    this.WindowResizeHanlder();
    window.addEventListener('resize', this.WindowResizeHanlder);

    document.body.appendChild( this.renderer.domElement );

    // Stats.js
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
  }

  SetupPhysics() {
    // Physics configuration
    const collisionConfiguration = new Ammo.btDefaultCollisionConfiguration();
    const dispatcher = new Ammo.btCollisionDispatcher( collisionConfiguration );
    const broadphase = new Ammo.btDbvtBroadphase();
    const solver = new Ammo.btSequentialImpulseConstraintSolver();
    this.physicsWorld = new Ammo.btDiscreteDynamicsWorld( dispatcher, broadphase, solver, collisionConfiguration );
    this.physicsWorld.setGravity( new Ammo.btVector3( 0.0, -9.81, 0.0 ) );
    
    // Ammo.addFunction no está disponible en la versión CDN de Ammo.js
    // El PhysicsUpdate se llamará manualmente desde el loop principal
    // const fp = Ammo.addFunction(this.PhysicsUpdate);
    // this.physicsWorld.setInternalTickCallback(fp);
    
    // getOverlappingPairCache tampoco está disponible en la versión CDN
    // Los ghost objects funcionarán de todas formas
    // this.physicsWorld.getBroadphase().getOverlappingPairCache().setInternalGhostPairCallback(new Ammo.btGhostPairCallback());

    //Physics debug drawer
    //this.debugDrawer = new DebugDrawer(this.scene, this.physicsWorld);
    //this.debugDrawer.enable();
  }

  SetAnim(name, obj){
    const clip = obj.animations[0];
    this.mutantAnims[name] = clip;
  }

  PromiseProgress(proms, progress_cb){
    let d = 0;
    progress_cb(0);
    for (const p of proms) {
      p.then(()=> {    
        d++;
        progress_cb( (d / proms.length) * 100 );
      });
    }
    return Promise.all(proms);
  }

  AddAsset(asset, loader, name){
    return loader.loadAsync(asset).then( result =>{
      this.assets[name] = result;
    });
  }

  OnProgress(p){
    const progressbar = document.getElementById('progress');
    progressbar.style.width = `${p}%`;
  }

  HideProgress(){
    this.OnProgress(0);
    // Ocultar el mensaje de "Cargando recursos"
    const loadingMessage = document.getElementById('loading_message');
    if (loadingMessage) {
      loadingMessage.style.display = 'none';
    }
  }

  SetupStartButton(){
    console.log('Setting up start buttons...');
    
    const survivalBtn = document.getElementById('survival_mode');
    const waveBtn = document.getElementById('wave_mode');
    const classicBtn = document.getElementById('classic_mode');
    
    console.log('Buttons found:', { survivalBtn, waveBtn, classicBtn });
    
    if (survivalBtn) {
      survivalBtn.addEventListener('click', () => {
        console.log('Survival mode clicked');
        this.currentGameMode = GameModes.SURVIVAL;
        this.StartGame();
      });
    }
    
    if (waveBtn) {
      waveBtn.addEventListener('click', () => {
        console.log('Wave mode clicked');
        this.currentGameMode = GameModes.WAVES;
        this.StartGame();
      });
    }
    
    if (classicBtn) {
      classicBtn.addEventListener('click', () => {
        console.log('Classic mode clicked');
        this.currentGameMode = GameModes.CLASSIC;
        this.StartGame();
      });
    }
  }

  ShowMenu(visible=true){
    const menu = document.getElementById('menu');
    menu.style.visibility = visible ? 'visible' : 'hidden';
    
    if (visible) {
      // Cuando se muestra el menú, asegurar que el HUD esté oculto
      const gameHud = document.getElementById('game_hud');
      gameHud.style.visibility = 'hidden';
    }
  }

  async LoadAssets(){
    const gltfLoader = new GLTFLoader();
    const fbxLoader = new FBXLoader();
    const objLoader = new OBJLoader();
    const audioLoader = new THREE.AudioLoader();
    const texLoader = new THREE.TextureLoader();
    const promises = [];

    //Level
    promises.push(this.AddAsset(level, gltfLoader, "level"));
    promises.push(this.AddAsset(navmesh, objLoader, "navmesh"));
    //Mutant
    promises.push(this.AddAsset(mutant, fbxLoader, "mutant"));
    promises.push(this.AddAsset(idleAnim, fbxLoader, "idleAnim"));
    promises.push(this.AddAsset(walkAnim, fbxLoader, "walkAnim"));
    promises.push(this.AddAsset(runAnim, fbxLoader, "runAnim"));
    promises.push(this.AddAsset(attackAnim, fbxLoader, "attackAnim"));
    promises.push(this.AddAsset(dieAnim, fbxLoader, "dieAnim"));
    //AK47
    promises.push(this.AddAsset(ak47, gltfLoader, "ak47"));
    promises.push(this.AddAsset(muzzleFlash, gltfLoader, "muzzleFlash"));
    promises.push(this.AddAsset(ak47Shot, audioLoader, "ak47Shot"));
    //Ammo box
    promises.push(this.AddAsset(ammobox, fbxLoader, "ammobox"));
    promises.push(this.AddAsset(ammoboxTexD, texLoader, "ammoboxTexD"));
    promises.push(this.AddAsset(ammoboxTexN, texLoader, "ammoboxTexN"));
    promises.push(this.AddAsset(ammoboxTexM, texLoader, "ammoboxTexM"));
    promises.push(this.AddAsset(ammoboxTexR, texLoader, "ammoboxTexR"));
    promises.push(this.AddAsset(ammoboxTexAO, texLoader, "ammoboxTexAO"));
    //Decal
    promises.push(this.AddAsset(decalColor, texLoader, "decalColor"));
    promises.push(this.AddAsset(decalNormal, texLoader, "decalNormal"));
    promises.push(this.AddAsset(decalAlpha, texLoader, "decalAlpha"));

    promises.push(this.AddAsset(skyTex, texLoader, "skyTex"));

    await this.PromiseProgress(promises, this.OnProgress);

    this.assets['level'] = this.assets['level'].scene;
    this.assets['muzzleFlash'] = this.assets['muzzleFlash'].scene;

    //Extract mutant anims
    this.mutantAnims = {};
    this.SetAnim('idle', this.assets['idleAnim']);
    this.SetAnim('walk', this.assets['walkAnim']);
    this.SetAnim('run', this.assets['runAnim']);
    this.SetAnim('attack', this.assets['attackAnim']);
    this.SetAnim('die', this.assets['dieAnim']);

    this.assets['ak47'].scene.animations = this.assets['ak47'].animations;
    
    //Set ammo box textures and other props
    this.assets['ammobox'].scale.set(0.01, 0.01, 0.01);
    this.assets['ammobox'].traverse(child =>{
      child.castShadow = true;
      child.receiveShadow = true;
      
      child.material = new THREE.MeshStandardMaterial({
        map: this.assets['ammoboxTexD'],
        aoMap: this.assets['ammoboxTexAO'],
        normalMap: this.assets['ammoboxTexN'],
        metalness: 1,
        metalnessMap: this.assets['ammoboxTexM'],
        roughnessMap: this.assets['ammoboxTexR'],
        color: new THREE.Color(0.4, 0.4, 0.4)
      });
      
    });

    this.assets['ammoboxShape'] = createConvexHullShape(this.assets['ammobox']);

    this.HideProgress();
    this.ShowMenu();
    this.SetupStartButton(); // Configurar botones después de mostrar el menú
  }

  EntitySetup(){
    this.entityManager = new EntityManager();
    
    // Configurar assets para spawn dinámico de mutantes
    this.entityManager.SetMutantAssets(this.assets['mutant'], this.mutantAnims, this.scene, this.physicsWorld);

    const levelEntity = new Entity();
    levelEntity.SetName('Level');
    levelEntity.AddComponent(new LevelSetup(this.assets['level'], this.scene, this.physicsWorld));
    levelEntity.AddComponent(new Navmesh(this.scene, this.assets['navmesh']));
    levelEntity.AddComponent(new LevelBulletDecals(this.scene, this.assets['decalColor'], this.assets['decalNormal'], this.assets['decalAlpha']));
    this.entityManager.Add(levelEntity);

    const skyEntity = new Entity();
    skyEntity.SetName("Sky");
    skyEntity.AddComponent(new Sky(this.scene, this.assets['skyTex']));
    this.entityManager.Add(skyEntity);

    const playerEntity = new Entity();
    playerEntity.SetName("Player");
    playerEntity.AddComponent(new PlayerPhysics(this.physicsWorld, Ammo));
    playerEntity.AddComponent(new PlayerControls(this.camera, this.scene, this.renderer, this.assets['ak47']));
    playerEntity.AddComponent(new Weapon(this.camera, this.assets['ak47'].scene, this.assets['muzzleFlash'], this.physicsWorld, this.assets['ak47Shot'], this.listener ));
    playerEntity.AddComponent(new PlayerHealth(this.audioManager, this.deathManager));
    playerEntity.SetPosition(new THREE.Vector3(2.14, 1.48, -1.36));
    playerEntity.SetRotation(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0), -Math.PI * 0.5));
    this.entityManager.Add(playerEntity);

    // Configurar modo de juego
    this.gameModeManager.SetMode(this.currentGameMode);

    // Solo spawn inicial de mutantes en modo clásico
    if (this.currentGameMode === GameModes.CLASSIC) {
      const npcLocations = [
        [10.8, 0.0, 22.0],
      ];

      npcLocations.forEach((v,i)=>{
        const npcEntity = new Entity();
        npcEntity.SetPosition(new THREE.Vector3(v[0], v[1], v[2]));
        npcEntity.SetName(`Mutant${i}`);
        npcEntity.AddComponent(new NpcCharacterController(SkeletonUtils.clone(this.assets['mutant']), this.mutantAnims, this.scene, this.physicsWorld));
        npcEntity.AddComponent(new AttackTrigger(this.physicsWorld));
        npcEntity.AddComponent(new CharacterCollision(this.physicsWorld));
        npcEntity.AddComponent(new DirectionDebug(this.scene));
        this.entityManager.Add(npcEntity);
      });
    }

    // Zona segura para modo supervivencia
    if (this.currentGameMode === GameModes.SURVIVAL) {
      const safeZoneEntity = new Entity();
      safeZoneEntity.SetName("SafeZone");
      safeZoneEntity.AddComponent(new SafeZone(this.scene));
      this.entityManager.Add(safeZoneEntity);
    }

    const uimanagerEntity = new Entity();
    uimanagerEntity.SetName("UIManager");
    uimanagerEntity.AddComponent(new UIManager());
    this.entityManager.Add(uimanagerEntity);

    const ammoLocations = [
       [14.37, 0.0, 10.45],
       [32.77, 0.0, 33.84],
    ];

    ammoLocations.forEach((loc, i) => {
      const box = new Entity();
      box.SetName(`AmmoBox${i}`);
      box.AddComponent(new AmmoBox(this.scene, this.assets['ammobox'].clone(), this.assets['ammoboxShape'], this.physicsWorld));
      box.SetPosition(new THREE.Vector3(loc[0], loc[1], loc[2]));
      this.entityManager.Add(box);
    });

    this.entityManager.EndSetup();

    // Mostrar botón de salir
    this.deathManager.ShowExitButton();

    this.scene.add(this.camera);
    this.animFrameId = window.requestAnimationFrame(this.OnAnimationFrameHandler);
  }

  StartGame = ()=>{
    window.cancelAnimationFrame(this.animFrameId);
    Input.ClearEventListners();

    //Create entities and physics
    this.scene.clear();
    this.SetupPhysics();
    this.EntitySetup();
    this.ShowMenu(false);
    
    // Asegurar que el HUD del juego esté visible
    const gameHud = document.getElementById('game_hud');
    gameHud.style.visibility = 'visible';
  }

  // resize
  WindowResizeHanlder = () => { 
    const { innerHeight, innerWidth } = window;
    this.renderer.setSize(innerWidth, innerHeight);
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
  }

  // render loop
  OnAnimationFrameHandler = (t) => {
    if(this.lastFrameTime===null){
      this.lastFrameTime = t;
    }

    const delta = t-this.lastFrameTime;
    let timeElapsed = Math.min(1.0 / 30.0, delta * 0.001);
    this.Step(timeElapsed);
    this.lastFrameTime = t;

    this.animFrameId = window.requestAnimationFrame(this.OnAnimationFrameHandler);
  }

  PhysicsUpdate = (world, timeStep)=>{
    this.entityManager.PhysicsUpdate(world, timeStep);
  }

  Step(elapsedTime){
    // No actualizar si el juego está pausado (jugador muerto)
    if (this.isGamePaused) {
      this.renderer.render(this.scene, this.camera);
      this.stats.update();
      return;
    }

    this.physicsWorld.stepSimulation( elapsedTime, 10 );
    
    // Llamar PhysicsUpdate manualmente ya que no usamos setInternalTickCallback
    this.entityManager.PhysicsUpdate(this.physicsWorld, elapsedTime);
    //this.debugDrawer.update();

    // Actualizar gestor de modos de juego
    this.gameModeManager.Update(elapsedTime, this.entityManager);

    // Gestionar zona segura en modo supervivencia
    if (this.currentGameMode === GameModes.SURVIVAL) {
      this.UpdateSurvivalMode();
    }

    this.entityManager.Update(elapsedTime);

    // Actualizar UI de zoom
    this.UpdateZoomUI();

    this.renderer.render(this.scene, this.camera);
    this.stats.update();
  }

  UpdateSurvivalMode() {
    const player = this.entityManager.Get("Player");
    const safeZone = this.entityManager.Get("SafeZone");
    const uiManager = this.entityManager.Get("UIManager");
    const playerHealth = player.GetComponent("PlayerHealth");
    const uiComponent = uiManager.GetComponent("UIManager");
    
    if (player && safeZone && playerHealth && uiComponent) {
      const safeZoneInfo = this.gameModeManager.GetSafeZoneInfo();
      
      // Mostrar radar de supervivencia
      uiComponent.ShowSurvivalRadar(true);
      
      if (safeZoneInfo.active && safeZoneInfo.position) {
        // Activar zona segura visual
        const safeZoneComponent = safeZone.GetComponent("SafeZone");
        if (safeZoneComponent) {
          if (!safeZoneComponent.isActive) {
            safeZoneComponent.ActivateAt(safeZoneInfo.position);
          }
          
          // Actualizar posición si ha cambiado
          const currentPos = safeZoneComponent.currentPosition;
          if (!currentPos || 
              Math.abs(currentPos[0] - safeZoneInfo.position[0]) > 0.1 ||
              Math.abs(currentPos[2] - safeZoneInfo.position[2]) > 0.1) {
            safeZoneComponent.ActivateAt(safeZoneInfo.position);
          }
        }
        
        // Actualizar radar
        uiComponent.UpdateRadar(player.Position, safeZoneInfo.position);
        
        // Verificar si el jugador está en la zona segura
        const isInSafeZone = this.gameModeManager.IsPlayerInSafeZone(player.Position);
        playerHealth.SetInSafeZone(isInSafeZone);
        
        // Mostrar/ocultar indicador de zona segura
        uiComponent.ShowSafeZoneIndicator(isInSafeZone);
      }
    }
  }

  PauseGame() {
    this.isGamePaused = true;
  }

  ResumeGame() {
    this.isGamePaused = false;
  }

  RestartCurrentGame() {
    // Reiniciar el juego con el mismo modo
    this.StartGame();
  }

  CleanupGameUI() {
    // Ocultar completamente el HUD del juego
    const gameHud = document.getElementById('game_hud');
    gameHud.style.visibility = 'hidden';
    
    // Ocultar elementos específicos del HUD
    document.getElementById('safe_zone_indicator').style.display = 'none';
    document.getElementById('current_wave_indicator').style.display = 'none';
    document.getElementById('wave_system').style.display = 'none';
    document.getElementById('death_screen').style.display = 'none';
    document.getElementById('exit_game_button').style.display = 'none';
    document.getElementById('survival_radar').style.display = 'none';
    document.getElementById('safe_zone_direction').style.display = 'none';
    document.getElementById('zoom_level').style.display = 'none';
    document.getElementById('zoom_controls').style.display = 'none';
  }

  ShowMainMenu() {
    // Cancelar animación actual
    window.cancelAnimationFrame(this.animFrameId);
    Input.ClearEventListners();

    // Limpiar escena
    this.scene.clear();
    
    // Limpiar UI del juego
    this.CleanupGameUI();
    
    // Resetear managers
    this.deathManager.Reset();
    this.gameModeManager.Reset();
    
    // Mostrar menú
    this.ShowMenu(true);
    this.isGamePaused = false;
  }

  UpdateZoomUI() {
    const player = this.entityManager.Get("Player");
    const uiManager = this.entityManager.Get("UIManager");
    
    if (player && uiManager) {
      const playerControls = player.GetComponent("PlayerControls");
      const uiComponent = uiManager.GetComponent("UIManager");
      
      if (playerControls && playerControls.cameraZoom && uiComponent) {
        const zoomLevel = playerControls.cameraZoom.GetZoomLevel();
        const isZooming = playerControls.cameraZoom.IsZooming();
        uiComponent.UpdateZoomUI(zoomLevel, isZooming);
      }
    }
  }

}

let _APP = null;
window.addEventListener('DOMContentLoaded', () => {
  _APP = new FPSGameApp();
});