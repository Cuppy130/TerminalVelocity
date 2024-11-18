import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.webgpu.js";

// Version 1.0.0
// created 11/14/2024 by @Cuppy130
// last edited 11/17/2024 by @Cuppy130
// rewritten 11/16/2024 by @Cuppy130

//global variables
let selectedParts = [];
//selection mesh
let boundingBox = new THREE.Box3();
const boundingMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }));
console.log(boundingMesh);
boundingMesh.scale.set(1, 1, 1);
boundingMesh.renderOrder = 1;
boundingMesh.material.depthTest = false;
boundingMesh.material.depthWrite = false;
boundingMesh.material.linewidth = 2;

let mode = "move"; //move, select, rotate, scale

let parts = [];
let groups = []; // when CTRL + G is pressed, the selected parts will be grouped into a group

let clipboard = [];

let mouse0 = false;
let mouse1 = false;
let mouse2 = false;

let mouse0Down = false;
let mouse1Down = false;
let mouse2Down = false;

let mouseFunctions = {
    "Click": (e) => {
        if (e.button === 0) {
            console.log(selectedParts);
            if (!keyPressed("Control")) {
                //select the part
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(parts);
                if (intersects.length > 0) {
                    if (!selectedParts.includes(intersects[0].object)) {
                        selectedParts = [intersects[0].object];
                    }
                } else {
                    selectedParts = [];
                }
                updateBoundingBox();
            } else {
                //add to the selection
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(parts);
                if (intersects.length > 0) {
                    if (!selectedParts.includes(intersects[0].object)) {
                        selectedParts.push(intersects[0].object);
                    }
                }
                updateBoundingBox();
            }
        }
    },
    pointerlockerror: () => {
        console.error("Pointer lock error! (Could not lock the pointer)");
    },
    Contextmenu: (e) => {
        e.preventDefault();
    },
}

const pastActionLimit = 1000;
let history = [];


let cameraSpeed = 0.1;

let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();


//three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
const renderer = new THREE.WebGPURenderer();
const cameraBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);
cameraBox.add(camera);
scene.add(cameraBox);
cameraBox.position.set(0, 1, 5);
scene.add(boundingMesh);

//functions

//CTRL + S
function saveWorld(worldname) {
    localStorage.setItem(worldname, JSON.stringify(parts));
}
//CTRL + L
function loadWorld(worldname) {
    parts = JSON.parse(localStorage.getItem(worldname));
}
//CTRL + O
function deleteWorld(worldname) {
    localStorage.removeItem(worldname);
}
//CTRL + E
function exportWorld(worldname) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(parts)], { type: "application/json" }));
    a.download = worldname + ".json";
    a.click();
}

//CTRL + N
function newWorld() {
    parts = [];
}


//CTRL + I
function importWorld() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            parts = JSON.parse(e.target.result);
        }
        reader.readAsText(file);
    }
    input.click();
}

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    if(mouse2Down) {
        cameraBox.rotation.y -= e.movementX / 100;
        camera.rotation.x -= e.movementY / 100;
        camera.rotation.x = clamp(camera.rotation.x, -PI / 2, PI / 2);
    }
}

function updateBoundingBox() {
    for (let i = 1; i < selectedParts.length; i++) {
        boundingBox.expandByObject(selectedParts[i]);
    }
    boundingMesh.scale.set(boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z);
    boundingMesh.position.set(boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2);
}

//game loop
function gameLoop() {
    update();
    renderer.renderAsync(scene, camera);
    requestAnimationFrame(gameLoop);
}

function newPart(color = 0x00ff00) {
    //create a new part
    const part = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshBasicMaterial({ color }));
    return part;
}

function keyPressed(key) {
    return keyArray.includes(key);
}

const { PI, sin, cos } = Math;

//update function
function update() {
    //update the camera
    if(!keyPressed("Control")&&!keyPressed("Shift")&&!keyPressed("Alt")){
        if(keyPressed("w")){
            const direction = new THREE.Vector3(-sin(cameraBox.rotation.y), tan(camera.rotation.x), -cos(cameraBox.rotation.y)).normalize();
            cameraBox.position.add(direction.multiplyScalar(cameraSpeed));
        }
        if(keyPressed("s")){
            const direction = new THREE.Vector3(sin(cameraBox.rotation.y), -tan(camera.rotation.x), cos(cameraBox.rotation.y)).normalize();
            cameraBox.position.add(direction.multiplyScalar(cameraSpeed));
        }
        if(keyPressed("a")){
            const direction = new THREE.Vector3(-cos(cameraBox.rotation.y), 0, sin(cameraBox.rotation.y)).normalize();
            cameraBox.position.add(direction.multiplyScalar(cameraSpeed));
        }
        if(keyPressed("d")){
            const direction = new THREE.Vector3(cos(cameraBox.rotation.y), 0, -sin(cameraBox.rotation.y)).normalize();
            cameraBox.position.add(direction.multiplyScalar(cameraSpeed));
        }
        if(keyPressed("e")){
            cameraBox.position.y += cameraSpeed;
        }
        if(keyPressed("q")){
            cameraBox.position.y -= cameraSpeed;
        }
    }
}

//init function
function init() {
    //create the baseplate

    const baseplate = new THREE.Mesh(new THREE.BoxGeometry(100, 1, 100), new THREE.MeshStandardMaterial({ color: 0x888888 }));
    
    scene.add(baseplate);

    //create the lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(0, 5, 0);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;
    scene.add(dirLight);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);


}


window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mousedown", (e) => {
    if (e.button === 0) mouse0Down = true;
    if (e.button === 1) mouse1Down = true;
    if (e.button === 2) {
        mouse2Down = true
        document.body.requestPointerLock();
    };
});

window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse0Down = false;
    if (e.button === 1) mouse1Down = false;
    if (e.button === 2) {
        mouse2Down = false;
        document.exitPointerLock();
    };
});

window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
});
let keyArray = [];
window.onkeydown = (e) => {
    e.preventDefault();
    if (!keyArray.includes(e.key)) keyArray.push(e.key);

    if (e.key === "Backspace") {
        //delete the selected parts
        for (let part of selectedParts) {
            scene.remove(part);
            parts = parts.filter(p => p !== part);
        }
    }
    if (e.key === "") {
        
    }
}
window.onkeyup = (e) => {
    keyArray = keyArray.filter(key => key !== e.key);
}

window.addEventListener("resize", () => {
    //resize the renderer
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener("click", mouseFunctions.Click);
document.onpointerlockerror = () => {
    document.exitPointerLock();
}

init();
gameLoop();