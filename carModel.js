// IMPORTS
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.20/+esm';
import Stats from 'three/addons/libs/stats.module.js';

// DOM
const progressContainer = document.querySelector('.progress-bar-container');
const progressBar = document.querySelector('progress#progress-bar');
const progressText = document.querySelector('label.progress-bar');

// MANAGER
const manager = new THREE.LoadingManager();

manager.onStart = function ( url, itemsLoaded, itemsTotal ) {
    setTimeout(() => {
        progressText.innerText = 'Almost done...';
    }, 1300);
};

manager.onLoad = function ( ) {
    progressContainer.style.display = 'none';
};

manager.onProgress = function ( url, itemsLoaded, itemsTotal ) {
    progressBar.value = itemsLoaded/itemsTotal;
};

manager.onError = function ( url ) {
	console.log( 'There was an error loading ' + url );
};

// UTILITIES
let canvas = document.querySelector('canvas.webgl');
let sizes = {
    width : window.innerWidth,
    height : window.innerHeight
}
let aspect = sizes.width / sizes.height;

// ASSETS
const gltfLoader = new GLTFLoader(manager);
const rgbeLoader = new RGBELoader(manager);
const dracoloader = new DRACOLoader();
dracoloader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
dracoloader.setDecoderConfig({type: 'js'});

gltfLoader.setDRACOLoader(dracoloader);
let envMap;

let loadAssets = async () => {
    let [hdr, gltf] = await Promise.all([
        rgbeLoader.loadAsync('autumn_field_puresky_1k.hdr'),
        gltfLoader.loadAsync('compressed_car.glb')
    ]);
    onLoadAssets(hdr, gltf);
};

loadAssets();

let model;
let onLoadAssets = (hdr, gltf) => {
    hdr.mapping = THREE.EquirectangularReflectionMapping;
    envMap = hdr;
    scene.background = envMap;
    scene.backgroundIntensity = 0.5;
    scene.backgroundBlurriness = 0.2;
    model = gltf.scene;
    model.traverse(child => {
        if(child.isMesh){
            child.material.envMap = envMap;
            child.material.envMapIntensity = objDebug.envMapIntesity;
        }
    })
    spotLight.target = model;
    scene.add(model);
    updateCarMaterials();
}

// SCENE
let scene = new THREE.Scene();

// OBJECTS
let cubeMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(100,100),
    new THREE.MeshPhongMaterial({
        side: THREE.DoubleSide
    })
);
cubeMesh.rotation.x = Math.PI /2;
cubeMesh.position.x = 0;
cubeMesh.receiveShadow = true;
scene.add(cubeMesh);

// CAMERA
let camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
camera.position.set(3.5, 2.8, 5);
scene.add(camera);

// LIGHTS
const spotLight = new THREE.SpotLight('white', 10);
spotLight.position.set(0,4,0);
spotLight.castShadow = true;
spotLight.penumbra = 1;
spotLight.angle = 1.04;
spotLight.distance = 10;
spotLight.decay = 2;
scene.add(spotLight.target);
scene.add(spotLight);

let helper = new THREE.SpotLightHelper(spotLight);
helper.visible = false;
scene.add(helper);

// RENDERER
let renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance'});
renderer.setSize(sizes.width, sizes.height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.render(scene, camera);

let stats = new Stats();
document.body.appendChild(stats.dom);

// GUI
const gui = new GUI();

let updateCarMaterials = () => {
    model.traverse(child => {
        if(child.isMesh){
            child.castShadow = true;
            if(child.userData.name.includes('paint')){
                child.material.color = new THREE.Color(objDebug.carColor);
                child.material.metalness = objDebug.carMetalNess;
                child.material.roughness = objDebug.carRoughNess;
                if(child.material instanceof THREE.MeshStandardMaterial){
                    child.material.clearcoat = objDebug.carClearCoat;
                    child.material.clearcoatRoughness = objDebug.carClearCoatRoughness;
                    
                }
            }
            if(child.userData.name.includes('caliper')){
                child.material.color = new THREE.Color(objDebug.caliper);
            }
        }
    })
}

let objDebug = {
    carColor : '#cce8ef',
    caliper : '#ffffff',
    carMetalNess: 0.5,
    carRoughNess: 0.5,
    carClearCoat: 0.2,
    carClearCoatRoughness: 0.1,
    toggleShadow: true,
    toggleEnvLight: true,
    envMapIntesity: 0.1,
    downloadScreenshot: () => {
        const image = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.setAttribute('download', 'car-image.png');
        a.setAttribute('href', image);
        a.click();
    },
    rotationSpeed: 0.8
}

let carMaterialFolder = gui.addFolder('Modify car materials');
let lightControlFolder = gui.addFolder('Change lighting');

carMaterialFolder.addColor(objDebug, 'carColor').name('Color').onChange(updateCarMaterials);
carMaterialFolder.addColor(objDebug, 'caliper').name('Caliper').onChange(updateCarMaterials);
carMaterialFolder.add(objDebug, 'carMetalNess').name('Metalness').min(0).max(1).step(0.1).onChange(updateCarMaterials);
carMaterialFolder.add(objDebug, 'carRoughNess').name('Roughness').min(0).max(1).step(0.1).onChange(updateCarMaterials);
carMaterialFolder.add(objDebug, 'carClearCoat').name('Clear Coat').min(0).max(1).step(0.1).onChange(updateCarMaterials);
carMaterialFolder.add(objDebug, 'carClearCoatRoughness').name('Caot roughness').min(0).max(1).step(0.1).onChange(updateCarMaterials);

 lightControlFolder
    .add(objDebug, 'toggleShadow')
    .name('Shadow')
    .onChange(() => {
        if(objDebug.toggleShadow === true){
            renderer.shadowMap.enabled = true;
            cubeMesh.receiveShadow = true;
        }else{
            renderer.shadowMap.enabled = false;
            cubeMesh.receiveShadow = false;
        }
    })

lightControlFolder
    .add(objDebug, 'toggleEnvLight')
    .name('Environment Light')
    .onChange(() => {
        if(objDebug.toggleEnvLight){
            model.traverse(child => {
                if(child.isMesh){
                    child.material.envMap = envMap;
                }
            })
        }else{
            model.traverse(child => {
                if(child.isMesh){
                    child.material.envMap = undefined;
                }
            })
        }
    })

lightControlFolder
    .add(objDebug, 'envMapIntesity')
    .name('Intensity')
    .min(0).max(1).step(0.01)
    .onChange(() => {
        model.traverse(child => {
            if(child.isMesh){
                child.material.envMapIntensity = objDebug.envMapIntesity;
            }
        })
    })

lightControlFolder.add(helper, 'visible').name('Light helper');

gui.add(objDebug, 'downloadScreenshot').name('Download as Image');
gui.add(objDebug, 'rotationSpeed').min(0).max(3).step(0.1).name('Rotation speed');

gui.close();

// CONTROLS
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.01;
controls.maxPolarAngle = Math.PI / 2 -0.02;

controls.autoRotate = true;
controls.autoRotateSpeed = objDebug.rotationSpeed;

// RESIZE
window.addEventListener('resize', () =>{
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;

    renderer.setSize(sizes.width, sizes.height);
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
})

// ANIMATION LOOP
let clock = new THREE.Clock();

let animation = () => {
    let time = clock.getElapsedTime();

    spotLight.position.x = Math.sin(time) * 1.5;
    spotLight.position.z = Math.cos(time) * 1.5;

    helper.update();
    stats.update();
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(animation);
}

animation();