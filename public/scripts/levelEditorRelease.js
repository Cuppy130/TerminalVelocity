import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.170.0/three.webgpu.js";
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / (window.innerHeight - 100), 0.1, 1000)

//created 11/14/2024

//last updated 11/15/2024

//vars
let lookAround = false;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();
let playerSpeed = 0.01;
let sensitivity = 0.005;

const renderer = new THREE.WebGPURenderer();
renderer.setSize(window.innerWidth, window.innerHeight - 100);
document.body.appendChild(renderer.domElement);
const geometry = new THREE.BoxGeometry( 2048, 20, 2048 );
const material = new THREE.MeshStandardMaterial( {color: 0xfff0f0} );
const baseplate = new THREE.Mesh( geometry, material );

const cameraCube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial);
const objectSelections = [];
const sceneObjects = [];

const lastActionsLimit = 1000;
const lastActions = [

]

function newPart(scalex, scaley, scalez, color = 0xcccccc) {
    const geometry = new THREE.BoxGeometry(scalex, scaley, scalez);
    
    // Ensure index buffer exists or set a default index buffer
    if (!geometry.index) {
        console.warn("No index buffer found. Setting default index.");
        geometry.setIndex(geometry.attributes.position);
    }

    const material = new THREE.MeshStandardMaterial({ color });
    const part = new THREE.Mesh(geometry, material);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);

    const spawnDistance = 5;
    const spawnPosition = new THREE.Vector3().copy(cameraCube.position).add(cameraDirection.multiplyScalar(spawnDistance));
    
    part.position.copy(spawnPosition);

    scene.add(part);
    sceneObjects.push(part);

    console.log(part.position);
}


baseplate.name = "baseplate";
const light = new THREE.AmbientLight( 0x404040);
scene.add(light);
const directionalLight = new THREE.DirectionalLight( 0xffffff, 1 );

directionalLight.position.x = 1;
directionalLight.position.y = 2;
directionalLight.position.z = 1;
directionalLight.castShadow = true;

scene.add( directionalLight );

scene.add( baseplate );
cameraCube.add(camera)
cameraCube.position.set(20, 20, 20)
camera.rotation.set(-1, 0, 0)
cameraCube.rotation.set(0, 1, 0)
scene.add(cameraCube)
renderer.setClearColor(0x00a0a0)

document.addEventListener('mousemove', onMouseMove)

function onMouseMove(event) {
    if(event.button != 1)return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
function getMouse3DObject(){
    raycaster.setFromCamera(mouse, camera);
    const intersectableObjects = scene.children.filter(obj => obj.isMesh);
    const intersects = raycaster.intersectObjects(intersectableObjects);
    if (intersects.length > 0) {
        return intersects[0].object;
    }
    return null;
}
function getMouse3DPosition() {
    raycaster.setFromCamera(mouse, camera);
    const intersectableObjects = scene.children.filter(obj => obj.isMesh);
    const intersects = raycaster.intersectObjects(intersectableObjects);
    if (intersects.length > 0) {
        return intersects[0].point;
    }
    return null;
}


document.addEventListener("contextmenu", (e) => e.preventDefault());

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / (window.innerHeight-100);
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight-100);
});

newPart(2, 1, 4, 0xcfcfcf);

let keysPressed = [];
function keyPressed(keyString){
    if(keysPressed.indexOf(keyString)>-1){
        return true;
    }
    return false
}

document.addEventListener("keydown", e => {
    e.preventDefault();
    if(!keysPressed.includes(e.key)){
        keysPressed.push(e.key);
    }

    if(keyPressed("Alt") && e.key == "c"){
        newPart(2, 1, 4, 0xc0c0c0)
    }


})

document.addEventListener("keyup", e => {
    let index = keysPressed.indexOf(e.key);
    keysPressed.splice(index, 1);
})

document.addEventListener("mousemove", e => {
    if(lookAround){
        cameraCube.rotation.y -= e.movementX * sensitivity;
        camera.rotation.x -= e.movementY * sensitivity;
    }
})


document.addEventListener('wheel', (event) => {
    const zoomSpeed = 0.1;
    camera.fov += event.deltaY * zoomSpeed;
    camera.fov = Math.max(10, Math.min(120, camera.fov));
    camera.updateProjectionMatrix();
});

document.addEventListener("click", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    const object = getMouse3DObject();

    // Clear selections if no object is clicked
    if (object == null) {
        while (objectSelections.length > 0) {
            const selectedObject = objectSelections[0];
            if (selectedObject.material && selectedObject.material.wireframe !== undefined) {
                selectedObject.material.wireframe = false;
            }
            objectSelections.splice(0, 1);
        }
        return; // Exit early
    }

    if (!keyPressed("Control")) {
        // Clear previous selections
        while (objectSelections.length > 0) {
            const selectedObject = objectSelections[0];
            if (selectedObject.material && selectedObject.material.wireframe !== undefined) {
                selectedObject.material.wireframe = false;
            }
            objectSelections.splice(0, 1);
        }
        // Select the new object
        if (object.material && object.material.wireframe !== undefined) {
            object.material.wireframe = true;
        }
        objectSelections.push(object);
    } else {
        // Multi-select or deselect
        const index = objectSelections.indexOf(object);
        if (index > -1) {
            // Deselect the object
            if (objectSelections[index].material && objectSelections[index].material.wireframe !== undefined) {
                objectSelections[index].material.wireframe = false;
            }
            objectSelections.splice(index, 1);
        } else {
            // Add the object to the selection
            if (object.material && object.material.wireframe !== undefined) {
                object.material.wireframe = true;
            }
            objectSelections.push(object);
        }
    }

    console.log(`${objectSelections.length} Objects selected`);
});




document.addEventListener("mousedown", (e) => {
    if(e.button == 2){
        document.body.requestPointerLock();
        lookAround = true;
    }
});

document.addEventListener("mouseup", (e) => {
    if(e.button == 2) {
        if (document.pointerLockElement === document.body) {
            document.exitPointerLock();
            lookAround = false;
        }
    }
});

let velocity_x = 0;
let velocity_y = 0;
let velocity_z = 0;

function clamp(val, min, max) {return Math.min(max, Math.max(min, val))};
function animate() {

    if(!keyPressed("Control")){
        if(keyPressed("w")){
            velocity_z -= Math.cos(cameraCube.rotation.y) * playerSpeed;
            velocity_x -= Math.sin(cameraCube.rotation.y) * playerSpeed;
        }
        if(keyPressed("s")){
            velocity_z += Math.cos(cameraCube.rotation.y) * playerSpeed;
            velocity_x += Math.sin(cameraCube.rotation.y) * playerSpeed;
        }
        if(keyPressed("a")){
            velocity_z += Math.sin(cameraCube.rotation.y) * playerSpeed;
            velocity_x -= Math.cos(cameraCube.rotation.y) * playerSpeed;
        }
        if(keyPressed("d")){
            velocity_z -= Math.sin(cameraCube.rotation.y) * playerSpeed;
            velocity_x += Math.cos(cameraCube.rotation.y) * playerSpeed;
        }
        if(keyPressed(" ")){
            velocity_y += playerSpeed;
        }
        if(keyPressed("Shift")){
            velocity_y -= playerSpeed;
        }
    } else {
        if(keyPressed("1")){
            selectedMode = "move";
        }
        if(keyPressed("2")){
            selectedMode = "scale";
        }
        if(keyPressed("3")){
            selectedMode = "rotate";
        }
    }

    velocity_x /= 1.1;
    velocity_y /= 1.1;
    velocity_z /= 1.1;

    cameraCube.position.x += velocity_x;
    cameraCube.position.y += velocity_y;
    cameraCube.position.z += velocity_z;

    camera.rotation.x = clamp(camera.rotation.x, -Math.PI / 2, Math.PI / 2)

    renderer.render(scene, camera)
}


renderer.setAnimationLoop(animate);