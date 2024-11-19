const auth = firebase.auth();
let uid;

auth.onAuthStateChanged(user => {
    if (user) {
        uid = user.uid;
        console.log('User is signed in');
    } else {
        console.log('No user is signed in');
        window.location.href = './login.html';
    }
});