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
        
        accountInfo: {
            description: "Get account information for the specified account",
            usage:       "account-info <account name>"
        }

    };

    servicePort.accountInfo = function(params, callback) {

        hftd.log('Retrieving account info for ' + params.account, 'command');
        
        if ('mirror' in hftd && params.account in hftd.mirror.accounts) 
            return callback(null, {
                message:   sprintf("Account information for '%s'", 
                data:      hftd.mirror.accounts[params.account]),
                formatter: "labelValue"
            }); 
        

            
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

};

module.exports = function() {
    return new servicePort();
};