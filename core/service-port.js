/**
 * Service port component
 * Run a json-rpc service for executing commands via a client
 */
var servicePort = function() {

    var servicePort = this;

    servicePort.server = {};

    /**
     * Add command information about commands to this object
     */
    servicePort.commandInfo = {
        
        account: {
            description: "Get account information for the specified account",
            usage:       "account <account name>"
        },  

        close: {
            description: "Close position on account",
            usage:       "close <instrument> on <account name>"
        },

        disable: {
            description: "Disable a module",
            usage:       "disable <module key>"
        },

        enable: {
            description: "Enable a module",
            usage:       "enable <module key>"
        },   

        uninstall: {
            description: "Uninstall a module",
            usage:       "uninstall <module key>"
        }   

    };

    servicePort.account = function(params, callback) {

        var account = params[0];

        hftd.log('Retrieving account info for ' + account, 'command');
        
        if ('mirror' in hftd && account in hftd.mirror.accounts) 
            return callback(null, {
                message:   sprintf("Account information for '%s':", account),
                data:      hftd.mirror.accounts[account],
                formatter: "labelValue"
            }); 
        
        var error = sprintf("Unable to find account for '%s'", account);

        hftd.error(error);
        callback({ message: error });
            
    };

    servicePort.close = function(params, callback) {

        var instrument = params[0];
        var account    = params[1];

        hftd.log('Retrieving account info for ' + account, 'command');
        
        if ('mirror' in hftd && account in hftd.mirror.accounts) {
            
            hftd.mirror.closeSingle(account, instrument, function(error, result) {
                
                if (error) {
                    hftd.error(error);
                    return callback({ message: error });
                }

                callback(null, {
                    message: sprintf("Successfully closed %s position on '%s':", instrument, account),
                    data:    hftd.mirror.accounts[account]
                });
            
            });
        
        } else {
        
            var error = sprintf("Unable to find account for '%s'", account);

            hftd.error(error);
            callback({ message: error });

        }
            
    };

    servicePort.disable = function(params, callback) {

        var module = params[0];

        hftd.module.disable(module, function(error) {
            if (error)
                return callback({ message: error });
            callback(null, { message: sprintf("Module '%s' successfully disabled", module) });
        });

    };

    servicePort.enable = function(params, callback) {

        var module = params[0];

        hftd.module.enable(module, function(error) {
            if (error)
                return callback({ message: error });
            callback(null, { message: sprintf("Module '%s' successfully enabled", module) });
        });

    };

    /**
     * Used by client to test connection
     */
    servicePort.ping = function(params, callback) {
        callback(null, { message: 'pong'});
    };

    /**
     * Initialize component
     */
    servicePort.start = function(callback) {

        if ('servicePort' in hftd.config) {

            servicePort.config = hftd.config.servicePort;

            if (servicePort.config.enabled) {

                hftd.log('Initializing service port ...');

                var rpc    = require('node-json-rpc');
                var server = new rpc.Server(servicePort.config.options);

                // add system commands
                server.addMethod('ping', servicePort.ping);

                // add method for each of the commands in commandInfo
                for (command in servicePort.commandInfo)
                    server.addMethod(command, servicePort[command]);

                // start the server
                server.start(function(error) {
                    
                    // fail ..
                    if (error) {
                        hftd.error('Service port failed to initialize.');
                        return callback(error);
                    }
                    
                    // success ..
                    hftd.log(sprintf('Service port initialized - [ %s ]', color('OK', 'green')));
                    callback();
                
                });

            } else return callback(); // not enabled

        } else return callback(); // not configured

    };

    servicePort.uninstall = function(params, callback) {

        var module = params[0];

        hftd.module.uninstall(module, function(error) {
            if (error)
                return callback({ message: error });
            callback(null, { message: sprintf("Module '%s' successfully uninstalled", module) });
        });

    };

};

module.exports = function() {
    return new servicePort();
};