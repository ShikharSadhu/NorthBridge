/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });

import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// Create Task API
export const createTask = onRequest(async (req, res) => {
  try {
    const { title, price } = req.body;

    const taskRef = await db.collection("tasks").add({
      title: title || "Test Task",
      price: price || 100,
      status: "open",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    res.status(200).send({
      message: "Task created successfully",
      taskId: taskRef.id,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creating task");
  }
});