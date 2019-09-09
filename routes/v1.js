var fs = require('fs');

const express           = require('express');
const router            = express.Router();
var NodeInfoModel       = require('../models.js').NodeInfo;

const lmdb_env_module   = require('../lmdb_env');
const path              = require('path');

const lmdb_env = lmdb_env_module.env;
const lmdb_db  = lmdb_env_module.dbi;

var confHandler   = require('../global_config/vstore_config_handler');


function makeJsonPayload(status_text, message_text, data_obj) {
    return {status: status_text, message: message_text, data: data_obj};
}

function getDateTime() {
    return (new Date()).toJSON().slice(0, 19).replace(/[-T]/g, ':');
}

function readKVJsonFromDb(file_id) {
    //Create database transaction (see https://github.com/Venemo/node-lmdb)
    var txn = lmdb_env.beginTxn();
    var data = txn.getString(lmdb_db, file_id)
    txn.commit();

    //Parse entry from database
    var valueJson;
    try {
        valueJson = JSON.parse(data);
    }
    catch(e) {}

    if(!valueJson) { valueJson = undefined; }
    return valueJson;
}

function insertKVIntoDb(file_id, json_value) {
    try
    {
        //Insert array as json string into database
        var txn = lmdb_env.beginTxn();
        txn.putString(lmdb_db, file_id, JSON.stringify(json_value));
        txn.commit();
        return true;
    }
    catch(e)
    {
        console.log(e);
    }
    return false;
}

function deleteKVFromDb(file_id) {
    try
    {
        //Delete mapping from database
        var txn = lmdb_env.beginTxn();
        txn.del(lmdb_db, file_id);
        txn.commit();
        return true;
    }
    catch(e)
    {
        console.log(e);
    }
    return false;
}

function getNodesFromDb(callback_func) {
    NodeInfoModel.find({}, { _id: 0 }, callback_func);
}

/* GET root route */
router.get('/', function(req, res, next) {
  res.json(makeJsonPayload(
      "success",
      "vStore File-Node Lookup Service REST-API",
      {"version":"v1.0.0"}
  ));
});

//Gets a node id for the given file id
router.get('/file_node_mapping/:file_id', function(req, res, next) {
    if(!req.params || !req.params.file_id)
    {
        console.log("["+getDateTime()+"] Invalid GET request received for file-node mapping. File ID: " + req.params.file_id);
        var err = new Error("Invalid request!");
        err.status = 400;
        next(err);
        return;
    }
    console.log("["+getDateTime()+"] GET request received for file-node mapping. File ID: " + req.params.file_id);

    var jsonValue = readKVJsonFromDb(req.params.file_id);
    if(!jsonValue)
    {
        //Create error message and go to error handler route.
        var err = new Error("No node id found for the given file id.");
        err.status = 404;
        next(err);
        return;
    }

    res.status(200);
    res.json(makeJsonPayload(
        "success",
        "Found an entry for the given file id!",
        {"array": jsonValue.nodeEntries}
    ));
});
// Saves a new file-node mapping to the database
router.post('/file_node_mapping', function(req, res, next) {
    if(!req.body || !req.body.file_id || !req.body.node_id || !req.body.device_id)
    {
        console.log("["+getDateTime()+"] Invalid POST request ("
        + req.body.file_id + " => " + req.body.node_id
        + ", Device: " + req.body.device_id + ")");

        var err = new Error("Invalid request");
        err.status = 400;
        next(err);
        return;
    }
    var file_id = req.body.file_id;
    var node_id = req.body.node_id;
    var device_id = req.body.device_id;

    console.log("["+getDateTime()+"] POST request ("
    + file_id + " => " + node_id + ", Device: " + device_id + ")");

    //First, get entries from database, if there are any for this file id
    var jsonData = readKVJsonFromDb(file_id);
    if(!jsonData || !jsonData.nodeEntries)
    {
        //No file_node_mapping exists yet. Create a new one.
        jsonData = {};
        jsonData.deviceId = device_id;
        jsonData.nodeEntries = [];
        jsonData.nodeEntries.push(node_id);
    }
    else
    {
        //Only allow original user to modify the file_node_mapping
        if(jsonData.deviceId != device_id)
        {
            var err_to_send = new Error("Not allowed.");
            err_to_send.status = 403;
            next(err_to_send);
            return;
        }

        if(!jsonData.nodeEntries.includes(node_id))
        {
            jsonData.nodeEntries.push(node_id);
        }
    }

    try
    {
        //Insert into database
        if(!insertKVIntoDb(file_id, jsonData))
        {
            throw "Error while adding to database.";
        }
        res.status(201);
        res.json(makeJsonPayload(
            "success",
            "Entry was added successfully!",
            {}
        ));
    }
    catch(err)
    {
        console.log(err);
        var err_to_send = new Error("An error occurred!");
        err_to_send.status = 500;
        next(err_to_send);
    }
});

// Delete file-node mapping from database
router.delete('/file_node_mapping', function(req, res, next) {
    if(!req.body || !req.body.file_id || !req.body.device_id)
    {
        console.log("["+getDateTime()+"] Invalid DELETE request (File: " + req.body.file_id + ", Device: " + req.body.device_id + ")");
        var err = new Error("Invalid request");
        err.status = 400;
        next(err);
        return;
    }
    var file_id = req.body.file_id;
    var device_id = req.body.device_id;

    console.log("["+getDateTime()+"] DELETE request (File: " + file_id + ", Device: " + device_id + ")");

    //First, get entry from database, if there is one for this file id
    var jsonData = readKVJsonFromDb(file_id);
    if(!jsonData) {
        var err = new Error("No resource found.");
        err.status = 404;
        next(err);
        return;
    }

    //Delete from database, if allowed
    if(jsonData.deviceId != device_id)
    {
        var err_to_send = new Error("Not allowed.");
        err_to_send.status = 403;
        next(err_to_send);
        return;
    }

    var success = deleteKVFromDb(file_id);
    if(!success)
    {
        var err_to_send = new Error("Server error occurred.");
        err_to_send.status = 500;
        next(err_to_send);
        return;
    }

    //Success
    res.status(200);
    res.json(makeJsonPayload(
        "success",
        "Entry was deleted successfully!",
        {}
    ));
});

// Post request for getting the vStore configuration
router.post('/configuration', function(req, res, next) {
    if(!req.body || !req.body.device_id) {
        console.log("["+getDateTime()+"] Invalid configuration request");
        var err = new Error("Invalid request");
        err.status = 400;
        next(err);
        return;
    }

    var device_id = req.body.device_id;

    try 
    {
        getNodesFromDb(function(err, result)
        {
            var config = {}; 
            if(err || !result) {
                config.nodes = [];
            }
            config.nodes = result;

            //Rules are still read from file and not from database
            config.rules = confHandler.readConfigModule("rules");
            if(config.rules == null) { config.rules = []; }

            //Matching mode is currently hardcoded.
            config.matchingMode = "RULES_NEXT_ON_NO_MATCH";
            
            res.status = 200;
            res.json(config);
        });

        console.log("["+getDateTime()+"] Serving configuration request, received from device " + device_id);
    } 
    catch(err) 
    {
        var err_to_send = new Error("Error in configuration file.");
        err_to_send.status = 500;
        next(err_to_send);
        return;
    }
});


// Simple route for getting the storage node information of all nodes
router.get('/nodes', function(req, res, next) {
    //Get all nodes from MongoDB
    getNodesFromDb(function(err, result) {
        if(!result || result.length == 0)
        {
            res.status(200);
            res.json(makeJsonPayload(
                "success",
                "Empty storage node result set",
                {}
            ));
            return;
        }
        
        //Reply with the result set
        res.status(200);
        res.json(makeJsonPayload(
            "success",
            "Storage node result set",
            {nodes: result}
        ));
    });
});

// route for removing a single node from a file-node mapping
router.delete('/remove_node', function(req, res, next) {
    if (!req.body || !req.body.file_id || !req.body.node_id) {
        console.log("["+getDateTime()+"] Invalid DELETE Node request (File: " + req.body.file_id + ", Node: " + req.body.node_id + ")");
        var err = new Error("Invalid request");
        err.status = 400;
        next(err);
        return;
    }

    // get existing mapping from DB, remove respective node and save it back
    var existingMapping = readKVJsonFromDb(req.body.file_id);

    if (existingMapping != undefined) {
        for (var i = 0; i < existingMapping.nodeEntries.length; i++) {
            if (existingMapping.nodeEntries[i] === req.body.node_id) {
                existingMapping.nodeEntries.splice(i, 1);   // removes array entry at that index
                break;
            }
        }
    }
    
    var success = insertKVIntoDb(req.body.file_id, existingMapping);
    if (success) {
        res.status(200);
        res.json(makeJsonPayload(
            "success",
            "Removed node from mapping",
            {nodes: existingMapping.nodeEntries}
        ));
    } else {
        var error = new Error("Removing node from mapping failed");
        error.status = 500;
        next(error);
        return;
    }

});

//// 404 routes

// Catch 404 and forward to error handler
router.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// Error handler
router.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    res.status(err.status);
    res.json(makeJsonPayload(
        "error",
        err.message,
        {}
    ));
});


module.exports = router;
