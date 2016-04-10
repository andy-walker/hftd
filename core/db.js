/**
 * Interface to MongoDB
 */
"use strict"

var MongoClient = require('mongodb').MongoClient;

global.initDB = function(callback) {
    
    var config = hftd.config.db;

    var mongoUri = vsprintf('mongodb://%s:%s@%s/%s', [
        config.user,
        config.pass,
        config.host,
        config.name
    ]);

    MongoClient.connect(mongoUri, function(error, database) {
        if (error)
            return callback(error);
        hftd.log(sprintf('Connected to database - [ %s ]', color('OK', 'green')));
        hftd.db = database;
        callback();
    });

};

global.ObjectId = require('mongodb').ObjectID;