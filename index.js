let mongoose = require('mongoose');
const Logger = require("./logger.js");
const cron = require("node-cron");
const fs = require('fs');
const taskManager = require("./ClusterManager.js");

require('dotenv').config();
var requestTeplateFile;

mongoose.connect(process.env.MONGO_URL, { useNewUrlParser: true });
var db = mongoose.connection;
if (!db) {
    Logger.info("Error connecting db");
    process.exit();
}
else {
    Logger.info("Db connected successfully")
}

/**
 * This whole code needs to be Commented before putting on Test/Live Env 
 */
fs.readFile('request.txt', 'utf8', function (err, data) {
    if (err) {
        Logger.info("There is problem Reading .env file  .. please check if file Exist ")
        // We should put Email Notification Here for Application Admin 
        process.exit();
    }
    // TODO  - need to comment this later 
    console.log(data);
    requestTeplateFile = data;
    taskManager.executeTask(data, "START");
});

// Enable below code for Scheduling before put it on Test/Live Environment .
/* 
cron.schedule("0 19 * * *", function () {
    console.log("running a Destroy task  every Day at 7:PM");
    fs.readFile('request.txt', 'utf8', function (err, data) {
        if (err) {
            Logger.info("There is problem Reading .env file  .. please check if file Exist ")
            // We should put Email Notification Here to Application Admin 
            process.exit();
        }

        // console.log(data);
        requestTeplateFile = data;
        taskManager.executeTask(data, "DESTROY");
    });
});


cron.schedule("0 07 * * *", function () {
    console.log("running a Start task  every Day at 7:AM ");
    fs.readFile('request.txt', 'utf8', function (err, data) {
        if (err) {
            Logger.info("There is problem Reading .env file  .. please check if file Exist ")
            // We should put Email Notification Here to Application Admin 
            process.exit();
        }

        requestTeplateFile = data;
        taskManager.executeTask(data, "START");
    });
}); */


