const auth = firebase.auth();
let uid;

function waitForAuthStateChange() {
    return new Promise((resolve) => {
        const unsubscribe = firebase.auth().onAuthStateChanged((user) => {
            unsubscribe(); // Unsubscribe from the listener once we get the user state
            resolve(user);
        });
    });
}

waitForAuthStateChange().then((user) => {
    if (user) {
        // User is signed in
        uid = user.uid;

        $("#signedIn")[0].style.display = "block";
        console.log("Logged in");
    } else {
        console.log("User is signed out.");
        
        // Sign in anonymously if the user is not signed in
        auth.signInAnonymously().then(() => {
            console.log("Signed in anonymously");
        }).catch((error) => {
            console.error("Error signing in anonymously:", error);
        });
    }
});