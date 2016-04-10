/**
 * Basic db interface
 * Handles connection pooling and parameter escaping
 */
var db = function(config) {

    var db = this;

    db.mysql = require('mysql');

    db.pool  = db.mysql.createPool({

        connectionLimit: 'connectionLimit' in config ? config.connectionLimit : 100, 
        host:            config.host,
        user:            config.user,
        password:        config.password,
        database:        config.name,
        debug:           'debug' in config && config.debug
    
    });

    /**
     * Run a database query - supports either of the following callspecs:
     * db.query(query, params, callback)
     * db.query(query, callback)
     */
    db.query = function(query, arg2, arg3) {

        var callback, params;

        // when 2 arguments supplied, callback is the second argument
        if (arg3 === undefined) {
            params   = [];
            callback = arg2;
        // otherwise params is the 2nd arg, callback is the third
        } else {
            params   = arg2;
            callback = arg3;
        }

        db.pool.getConnection(function(error, connection) {
            
            if (error) {
                connection.release();
                callback("Error acquiring a database connection.");
                return;
            }   

            params = params.map(function(param) {
                return sprintf("'%s'", db.mysql.escape(param));
            });

            connection.query(vsprintf(query, params), function(error, results) {
                connection.release();
                if (!error)
                    callback(null, results);           
            });

            connection.on('error', function(error) {      
                callback(error, null);   
            });

        });

    };

};

module.exports = function(config) {
    return new db(config);
};