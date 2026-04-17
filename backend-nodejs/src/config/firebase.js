const admin = require("firebase-admin");

// Initialize Firebase using environment variable
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

module.exports = { db };