import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js';
import { 
    getDatabase,
    ref,
    get
 } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-database.js';

import {
    getAuth,
    onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';

initializeApp({
    apiKey: "AIzaSyBbRD_LnDMdvnBuQVD6bKHu6RkMt0Is1w8",
    authDomain: "terminalvelocity001.firebaseapp.com",
    projectId: "terminalvelocity001",
    storageBucket: "terminalvelocity001.firebasestorage.app",
    messagingSenderId: "895152696520",
    appId: "1:895152696520:web:64ee91e700544be4b489fd"
});

const db = getDatabase();
const auth = getAuth();

let uid;

onAuthStateChanged(auth, (user) => {
    if (user) {
        uid = user.uid;
        loadMapList();
    } else {
        console.log('User is signed out')
    }
});

function loadMapList() {
    const mapList = ref(db, `users/${uid}/maps`);
    get(mapList).then((snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            for(let iteration in data) {
                const mapName = iteration;
                const div = document.createElement('div');
                div.classList.add('map');
                const h3 = document.createElement('h3');
                h3.innerText = mapName;
                div.appendChild(h3);
                document.getElementById('mapList').appendChild(div);
                div.addEventListener('click', () => {
                    window.parent.postMessage({mapName: mapName}, '*');
                    window.close();
                });
            }
        } else {
            console.log('No data available');
        }
    }).catch((error) => {
        console.error(error);
    });
}