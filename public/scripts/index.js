const auth = firebase.auth();
let uid;

firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        uid = user.uid;

        $("#signedIn")[0].style.display = "block";
        console.log("Logged in")
    } else {
        console.log("User is signed out.");
        
        // Sign in anonymously if the user is not signed in
        auth.signInAnonymously()
        
        // Refresh the page after attempting to sign in
        window.location.reload();
    }
});

