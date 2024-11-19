import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.webgpu.js";
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js'
import { 
    getDatabase,
    ref,
    set,
    get
 } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js'

import {
    getAuth,
    onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js'

const firebaseConfig = {
    apiKey: "AIzaSyBbRD_LnDMdvnBuQVD6bKHu6RkMt0Is1w8",
    authDomain: "terminalvelocity001.firebaseapp.com",
    databaseURL: "https://terminalvelocity001-default-rtdb.firebaseio.com",
    projectId: "terminalvelocity001",
    storageBucket: "terminalvelocity001.firebasestorage.app",
    messagingSenderId: "895152696520",
    appId: "1:895152696520:web:64ee91e700544be4b489fd"
};
initializeApp(firebaseConfig);

let currentMapName = "Default World";

let userId;
onAuthStateChanged(getAuth(), (user) => {
    if(user){
        userId = user.uid;
        getSettings().then((data) => {
            if(data){
                settings = data;
                init();
                gameLoop();
            } else {
                createSettings(settings);
                init();
                gameLoop();
            }
        });
        
    } else {
        location.href = "/login.html";
    }
});

const createSettings = async (settings) => {
    const dbRef = ref(getDatabase(), `users/${userId}/settings`);
    await set(dbRef, settings);
}


const getSettings = async () => {
    const dbRef = ref(getDatabase(), `users/${userId}`);
    const dbData = await get(dbRef);
    if(!dbData.exists()){
        return;
    }
    return dbData.val().settings;
}


const loadMap = async (mapName) => {
    const dbRef = ref(getDatabase(), `users/${userId}/maps/${mapName}`);
    const dbData = await get(dbRef);
    return dbData.val();
}

const getMaps = async () => {
    const dbRef = ref(getDatabase(), `users/${userId}/maps`);
    const dbData = await get(dbRef);
    return dbData.val();
}


const saveMap = async (mapName, parts) => {
    const dbRef = ref(getDatabase(), `users/${userId}/maps/${mapName}`);
    await set(dbRef, parts);
}

// Level Editor
// Version 1.0.0
// created 11/14/2024 by @Cuppy130
// last edited 11/19/2024 by @Cuppy130
// rewritten 11/16/2024 by @Cuppy130
// reviewed by ###### on ##/##/####

//global variables
let selectedParts = [];
//selection mesh
let boundingBox = new THREE.Box3();
const boundingMesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }));
boundingMesh.renderOrder = 1;
boundingMesh.material.depthTest = false;
boundingMesh.material.depthWrite = false;

const { PI, sin, cos, tan } = Math;

let settings = { //defaults
    /* camera */
    cameraSpeed: 0.1,
    cameraMaxSpeed: 1,

    /* other */
    colorBoundingBox: 0xffff00,
    colorBaseplate: 0x888888,
    colorSunlight: 0xffffff,

    /* stud stuff */
    studClip: 0, // the amount of studs that will be able to change at a time when moving or scaling
    studClipping: 0.1, // clipping a part to another part to make a seamless edge
    studAngleRotation: 45/2, // the angle that the part will rotate when rotating

    /* snapping */
    snappingTolerance: 0.1, // the amount of studs that the part will snap to
    snappingEnabled: true, // whether the part will snap to the grid
}

//load the settings from the database

let mode = "move"; //move, rotate, scale

let parts = [];
let groups = []; // when CTRL + G is pressed, the selected parts will be grouped into a group

let clipboard = [];

let mouse0 = false;
let mouse1 = false;
let mouse2 = false;

let mouseDownOnAxis = false;

let xAxisHeld = false;
let yAxisHeld = false;
let zAxisHeld = false;

const axis = {
    x: new THREE.Mesh(new THREE.SphereGeometry(.5), new THREE.MeshStandardMaterial({ color: 0xff0000 })),
    y: new THREE.Mesh(new THREE.SphereGeometry(.5), new THREE.MeshStandardMaterial({ color: 0x00ff00 })),
    z: new THREE.Mesh(new THREE.SphereGeometry(.5), new THREE.MeshStandardMaterial({ color: 0x0000ff })),
}

for (let key in axis) {
    axis[key].renderOrder = 2;
    axis[key].material.depthTest = false;
    axis[key].material.depthWrite = false;
}

axis.x.position.set(1, 0, 0);
axis.y.position.set(0, 1, 0);
axis.z.position.set(0, 0, 1);


let mouse0Down = false;
let mouse1Down = false;
let mouse2Down = false;

function askPrompt(question, defaultValue = "Default World") {
    return prompt(question, defaultValue);
}

let mouseFunctions = {
    Click: (e) => {
        if (e.button === 0) {
            if(mouseDownOnAxis){
                mouseDownOnAxis = false;
                xAxisHeld = false;
                yAxisHeld = false;
                zAxisHeld = false;
                return;
            }
            if (!keyPressed("Control")) {
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(parts);
                if (intersects.length > 0) {
                    if (!selectedParts.includes(intersects[0].object)) {
                        selectedParts = [intersects[0].object];
                    }
                } else {
                    selectedParts = [];
                }
            } else {
                raycaster.setFromCamera(mouse, camera);
                const intersects = raycaster.intersectObjects(parts);
                if (intersects.length > 0) {
                    if (!selectedParts.includes(intersects[0].object)) {
                        selectedParts.push(intersects[0].object);
                    } else {
                        selectedParts = selectedParts.filter(part => part !== intersects[0].object);
                    }
                }
            }
        }
    },
    // disables the context menu
    Contextmenu: (e) => {
        e.preventDefault();
    }
}
// use this in the future to store the history of the actions
const pastActionLimit = 1000;
let history = [
    // { action: "create", part: null }, //when ctrl + z is pressed, the part will be deleted
    // { action: "delete", part: null }, //when ctrl + y is pressed, the part will be created
    // { action: "move", part: null, position: null, previousPosition: null }, //when ctrl + z is pressed, the part will be moved to the previous position
    // { action: "rotate", part: null, rotation: null, previousRotation: null }, //when ctrl + z is pressed, the part will be rotated to the previous rotation
    // { action: "scale", part: null, scale: null, previousScale: null }, //when ctrl + z is pressed, the part will be scaled to the previous scale
    // { action: "group", group: null }, //when ctrl + z is pressed, the group will be ungrouped
    // { action: "ungroup", group: null }, //when ctrl + z is pressed, the group will be grouped
    // { action: "select", part: null }, //when ctrl + z is pressed, the part will be deselected
    // { action: "deselect", part: null }, //when ctrl + z is pressed, the part will be selected
    // { action: "copy", part: null }, //when ctrl + z is pressed, the part will be removed from clipboard
    // { action: "paste", part: null }, //when ctrl + z is pressed, the parts will be deleted
    // { action: "duplicate", part: null }, //when ctrl + z is pressed, the parts will be deleted
];


let cameraSpeed = 0.1;
const cameraMaxSpeed = 1;

let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();


//three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 1000);
const renderer = new THREE.WebGPURenderer();
const cameraBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
cameraBox.add(camera);
scene.add(cameraBox);
cameraBox.position.set(5, 5, 5);
cameraBox.rotation.y = Math.PI/4;
camera.rotation.x = -Math.PI/4;
cameraBox.castShadow = true;

scene.add(boundingMesh);

//adding extra to the scene

//axis
scene.add(axis.x);
scene.add(axis.y);
scene.add(axis.z);

//functions

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

let scroll_timeout;
function onScroll(e) {
    cameraSpeed += e.deltaY / -10000;
    cameraSpeed = clamp(cameraSpeed, 0.01, cameraMaxSpeed);

    document.getElementById("value").style.height = (cameraSpeed / cameraMaxSpeed) * 100 + "%";
    document.getElementById("cameraSpeed").style.opacity = 1;
    document.getElementById("cameraSpeed").style.transition = "opacity 0s";
    clearTimeout(scroll_timeout);
    scroll_timeout = setTimeout(() => {
        document.getElementById("cameraSpeed").style.transition = "opacity 1s";
        document.getElementById("cameraSpeed").style.opacity = 0;
    }, 500);
}

function snapToGrid(part) {
    if (!settings.snappingEnabled) return;
    const snap = settings.snappingTolerance;
    const position = part.position;
    const x = Math.round(position.x / snap) * snap;
    const y = Math.round(position.y / snap) * snap;
    const z = Math.round(position.z / snap) * snap;
    part.position.set(x, y, z);
}

function scaleToGrid(part) {
    if (!settings.snappingEnabled) return;
    const snap = settings.snappingTolerance;
    const scale = part.scale;
    const x = Math.round(scale.x / snap) * snap;
    const y = Math.round(scale.y / snap) * snap;
    const z = Math.round(scale.z / snap) * snap;
    part.scale.set(x, y, z);
}


function onMouseMove(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    let den = 50;
    if(mouse2Down) {
        cameraBox.rotation.y -= e.movementX / 100;
        camera.rotation.x -= e.movementY / 100;
        camera.rotation.x = clamp(camera.rotation.x, -PI / 2, PI / 2);
    }
    if(mouse1Down) {
        cameraBox.rotation.y -= e.movementX / 100;
        camera.rotation.x -= e.movementY / 100;
        camera.rotation.x = clamp(camera.rotation.x, -PI / 2, PI / 2);
        //continue to look at the selected part (if there is one)
        if(selectedParts.length > 0){
            const direction = new THREE.Vector3(-sin(cameraBox.rotation.y), tan(camera.rotation.x), -cos(cameraBox.rotation.y)).normalize();
            const pos = boundingBox.getCenter(boundingMesh.position);
            cameraBox.position.copy(pos).add(direction.multiplyScalar(-10));
        }
    }

    if(mouse0Down) {
        if(mode === "move") {
            if(xAxisHeld) {
                for(let part of selectedParts) {
                    part.position.set(cos(cameraBox.rotation.y) * e.movementX / den + part.position.x + sin(cameraBox.rotation.y) * e.movementY / den, part.position.y, part.position.z);
                }
            }
            if(yAxisHeld) {
                for(let part of selectedParts) {
                    part.position.set(part.position.x, -e.movementY / den + part.position.y, part.position.z);
                }
            }
            if(zAxisHeld) {
                for(let part of selectedParts) {
                    part.position.set(part.position.x, part.position.y, -sin(cameraBox.rotation.y) * e.movementX / den + part.position.z + cos(cameraBox.rotation.y) * e.movementY / 100);
                }
            }
        }
        if(mode === "scale") {
            if(xAxisHeld) {
                for(let part of selectedParts) {
                    if(cameraBox.position.x < boundingMesh.position.x){
                        part.scale.x += -e.movementX * cos(cameraBox.rotation.y) / den + -e.movementY * sin(cameraBox.rotation.y) / den;
                        if(part.scale.x < 0.1) {
                            part.scale.x = 0.1;
                        } else {
                            part.position.x -= -e.movementX * cos(cameraBox.rotation.y) / den / 2 + -e.movementY * sin(cameraBox.rotation.y) / den / 2;
                        }
                    } else {
                        part.scale.x -= -e.movementX * cos(cameraBox.rotation.y) / den + -e.movementY * sin(cameraBox.rotation.y) / den;
                        if(part.scale.x < 0.1) {
                            part.scale.x = 0.1;
                        } else {
                            part.position.x -= e.movementX * -cos(cameraBox.rotation.y) / den / 2 + e.movementY * -sin(cameraBox.rotation.y) / den / 2;
                        }
                    }
                }
            }
            if(yAxisHeld) {
                for(let part of selectedParts) {
                    if(cameraBox.position.y < boundingMesh.position.y){
                        part.scale.y += e.movementY / den;
                        if(part.scale.y < 0.1) {
                            part.scale.y = 0.1;
                        } else {
                            part.position.y -= e.movementY / den / 2;
                        }
                    } else {
                        part.scale.y += -e.movementY / den;
                        if(part.scale.y < 0.1) {
                            part.scale.y = 0.1;
                        } else {
                            part.position.y += -e.movementY / den / 2;
                        }
                    }
                }
            }
            if(zAxisHeld) {
                for(let part of selectedParts) {
                    if(cameraBox.position.z > boundingMesh.position.z){
                        part.scale.z += e.movementX * -sin(cameraBox.rotation.y) / den + -e.movementY * -cos(cameraBox.rotation.y) / den;
                        if(part.scale.z < 0.1) {
                            part.scale.z = 0.1;
                        } else {
                            part.position.z += e.movementX * -sin(cameraBox.rotation.y) / den / 2 + -e.movementY * -cos(cameraBox.rotation.y) / den / 2;
                        }
                    } else {
                        part.scale.z -= e.movementX * -sin(cameraBox.rotation.y) / den + -e.movementY * -cos(cameraBox.rotation.y) / den;
                        if(part.scale.z < 0.1) {
                            part.scale.z = 0.1;
                        } else {
                            part.position.z -= e.movementX * sin(cameraBox.rotation.y) / den / 2 + -e.movementY * cos(cameraBox.rotation.y) / den / 2;
                        }
                    }
                }
            }
        }
    }
}

function updateBoundingBox() {
    if (selectedParts.length === 0) {
        boundingMesh.visible = false;
        for (let key in axis) {
            axis[key].visible = false;
        }
        return;
    }
    boundingMesh.visible = true;
    for (let key in axis) {
        axis[key].visible = true;
    }

    boundingBox.setFromObject(selectedParts[0]);
    for (let i = 1; i < selectedParts.length; i++) {
        boundingBox.expandByObject(selectedParts[i]);
    }
    boundingMesh.scale.set(boundingBox.max.x - boundingBox.min.x, boundingBox.max.y - boundingBox.min.y, boundingBox.max.z - boundingBox.min.z);
    boundingMesh.position.set(boundingBox.min.x + (boundingBox.max.x - boundingBox.min.x) / 2, boundingBox.min.y + (boundingBox.max.y - boundingBox.min.y) / 2, boundingBox.min.z + (boundingBox.max.z - boundingBox.min.z) / 2);


    // OLD
    axis.y.position.set(boundingMesh.position.x, cameraBox.position.y < boundingMesh.position.y ? boundingBox.min.y - 1 : boundingBox.max.y + 1, boundingMesh.position.z);
    axis.x.position.set(cameraBox.position.x < boundingMesh.position.x ? boundingBox.min.x - 1 : boundingBox.max.x + 1, boundingMesh.position.y, boundingMesh.position.z);
    axis.z.position.set(boundingMesh.position.x, boundingMesh.position.y, cameraBox.position.z < boundingMesh.position.z ? boundingBox.min.z - 1 : boundingBox.max.z + 1);
    
    // NEW
    // rotate the axis to point to the part
    // let part = selectedParts[0];
    // axis.x.rotation.x = part.rotation.x + Math.PI / 2;
    // axis.x.position.set(part.position.x + cos(part.rotation.z) * 2, part.position.y + sin(part.rotation.z) * 2, part.position.z);

    // axis.z.rotation.y = part.rotation.y + Math.PI / 2;
    // axis.z.position.set(part.position.x, part.position.y + sin(part.rotation.x) * 2, part.position.z + cos(part.rotation.x) * 2);

    // this is for snapping to the grid
    // snap the bounding box to the grid
    snapToGrid(boundingMesh);
    // snap the selected parts to the grid
    if(!mouse0Down){
        for(let part of selectedParts){
            snapToGrid(part);
            scaleToGrid(part);
            if(part.scale.x < 0.1) part.scale.x = 0.1;
            if(part.scale.y < 0.1) part.scale.y = 0.1;
            if(part.scale.z < 0.1) part.scale.z = 0.1;
        }
    }
}

//game loop
function gameLoop() {
    update();
    updateBoundingBox();
    renderer.renderAsync(scene, camera);
    requestAnimationFrame(gameLoop);
}

function newPart(color = 0x00ff00) {
    const part = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color }));
    part.scale.set(2, 1, 4);
    const direction = new THREE.Vector3(-sin(cameraBox.rotation.y), tan(camera.rotation.x), -cos(cameraBox.rotation.y)).normalize();
    part.position.add(cameraBox.position).add(direction.multiplyScalar(5));
    part.castShadow = true;
    return part;
}

function keyPressed(key) {
    return keyArray.includes(key);
}


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

//shadows
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.shadowMap.autoUpdate = true;
const dirLight = new THREE.DirectionalLight(0xffffff, 1);
//init function
function init() {
    //create the baseplate

    const baseplate = new THREE.Mesh(new THREE.BoxGeometry(50, 1, 50), new THREE.MeshStandardMaterial({ color: settings.colorBaseplate }));
    baseplate.receiveShadow = true;
    baseplate.name = "baseplate";
    scene.add(baseplate);

    renderer.setClearColor(settings.colorSunlight);

    //create the lighting
    dirLight.position.set(10, 20, 5);
    dirLight.target.position.set(0, 0, 0);
    dirLight.castShadow = true;
    //decrease the shadow resolution
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    //lightshadow
    //no camera settings
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;

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

    if(mouse0Down){
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects([axis.x, axis.y, axis.z]);
        if(intersects.length > 0){
            mouseDownOnAxis = true;
            if(intersects[0].object === axis.x){
                xAxisHeld = true;
            }
            if(intersects[0].object === axis.y){
                yAxisHeld = true;
            }
            if(intersects[0].object === axis.z){
                zAxisHeld = true;
            }
        }
    }
});

window.addEventListener("mouseup", (e) => {
    if (e.button === 0) mouse0Down = false;
    if (e.button === 1) mouse1Down = false;
    if (e.button === 2) {
        mouse2Down = false;
        document.exitPointerLock();
    };
});

let controlDDbounce = false;

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
        selectedParts = [];
    }

    if(keyPressed("Alt")){
        // ALT + C -> New Part.
        if(e.key === "c"){
            const part = newPart();
            scene.add(part);
            parts.push(part);
            selectedParts = [part];
        }
    }
    // [ and ] to change the snapping tolerance
    if(e.key === "["){
        //decrease the snapping tolerance
        settings.snappingTolerance/=2;
        if(settings.snappingTolerance < 0.1){
            settings.snappingTolerance = 0.1;
        }
    }
    if(e.key === "]"){
        //increase the snapping tolerance
        settings.snappingTolerance*=2;
        if(settings.snappingTolerance > 1){
            settings.snappingTolerance = 1;
        }
    }

    if(keyPressed("Control")){
        if(e.key === "1"){
            mode = "move";
        }
        if(e.key === "2"){
            mode = "scale";
        }
        if(e.key === "3"){
            mode = "rotate";
        }
        
        //CTRL + D + Control debounce
        if(e.key === "d" && !controlDDbounce){
            controlDDbounce = true;
            //duplicate the selected parts
            for(let part of selectedParts){
                const newPart = part.clone();
                scene.add(newPart);
                parts.push(newPart);
                selectedParts = [newPart];
            }
        }
        //CTRL + S
        if(e.key === "s"){
            //save the map and upload it to the database
            keyArray = keyArray.filter(key => key !== "Control");
            keyArray = keyArray.filter(key => key !== "s");
            const returnValue = askPrompt("What would you like to name this map?", currentMapName);
            if(returnValue){
                currentMapName = returnValue;
                saveMap(returnValue, parts.map(part => ({
                    position: part.position.toArray(),
                    rotation: part.rotation.toArray(),
                    scale: part.scale.toArray(),
                    color: part.material.color.toArray()
                })));
            }
        } else if(e.key === "l"){
            // uncheck the control key
            keyArray = keyArray.filter(key => key !== "Control");
            keyArray = keyArray.filter(key => key !== "l");

            const win = window.open("mapList.html", "_blank", "width=400, height=400");
            win.onload = () => {
                win.onmessage = (e) => {
                    const mapName = e.data.mapName;
                    currentMapName = mapName;
                    loadMap(mapName).then(data => {
                        for(let part of parts){
                            scene.remove(part);
                        }
                        selectedParts = [];
                        parts = [];
                        for(let part of data){
                            const newPart = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: new THREE.Color().fromArray(part.color) }));
                            newPart.position.fromArray(part.position);
                            newPart.rotation.fromArray(part.rotation);
                            newPart.scale.fromArray(part.scale);
                            newPart.castShadow = true;
                            scene.add(newPart);
                            parts.push(newPart);
                        }
                        selectedParts = [];
                    });
                }
            }
        }
        if(e.key === "Backspace"){
            for(let part of selectedParts){
                scene.remove(part);
                parts = parts.filter(p => p !== part);
            }
        }
        if(e.key === "c"){
            clipboard = selectedParts;
        }
        if(e.key === "v"){
            selectedParts = [];
            for(let partO of clipboard){
                selectedParts = [];
                let part = newPart();
                part.position.copy(partO.position);
                part.rotation.copy(partO.rotation);
                part.scale.copy(partO.scale);
                part.material.color.copy(partO.material.color);
                parts.push(part);
                scene.add(part);
                selectedParts.push(part);
            }
        }
    }
}


window.onkeyup = (e) => {
    keyArray = keyArray.filter(key => key !== e.key);

    if(controlDDbounce){
        controlDDbounce = false;
    }
}

let propertiesWindow;
let worldProperties;

window.ondblclick = () => {
    if(selectedParts.length === 0) {
        if(worldProperties) worldProperties.close();
        worldProperties = window.open("worldProperties.html", "_blank", "width=400, height=400");
        worldProperties.onload = () => {
            worldProperties.onmessage = (e) => {
                const color = e.data.skyColor;
                const colorNumber = parseInt(color.slice(1), 16);
                renderer.setClearColor(colorNumber);
                const baseplateColor = e.data.baseplateColor;
                const parsedBaseplateColor = parseInt(baseplateColor.slice(1), 16);
                const baseplate = scene.children.find(child => child.name === "baseplate");
                baseplate.material.color.setHex(parsedBaseplateColor);
                settings.colorBaseplate = parsedBaseplateColor;
                settings.colorSunlight = colorNumber;

                createSettings(settings);
            }
        }
        return;
    };
    if(propertiesWindow) propertiesWindow.close();
    propertiesWindow = window.open("properties.html", "_blank", "width=400, height=400");
    propertiesWindow.onload = () => {
        propertiesWindow.postMessage({
            color: selectedParts[0].material.color.getHex().toString(16),
            "position-x": selectedParts[0].position.x,
            "position-y": selectedParts[0].position.y,
            "position-z": selectedParts[0].position.z,
            "rotation-x": selectedParts[0].rotation.x,
            "rotation-y": selectedParts[0].rotation.y,
            "rotation-z": selectedParts[0].rotation.z,
            "scale-x": selectedParts[0].scale.x,
            "scale-y": selectedParts[0].scale.y,
            "scale-z": selectedParts[0].scale.z
        }, "*");
        propertiesWindow.onmessage = (e) => {
            selectedParts[0].material.color = new THREE.Color(e.data.color)
            selectedParts[0].position.set(e.data["position-x"], e.data["position-y"], e.data["position-z"]);
            selectedParts[0].rotation.set(e.data["rotation-x"], e.data["rotation-y"], e.data["rotation-z"]);
            selectedParts[0].scale.set(e.data["scale-x"], e.data["scale-y"], e.data["scale-z"]);
        }
    }
}

window.oncontextmenu = mouseFunctions.Contextmenu;
window.onclick = mouseFunctions.Click;
window.onwheel = onScroll;
window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


