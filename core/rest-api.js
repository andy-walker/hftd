/**
 * REST API component
 */
var OANDAAdapter = require('oanda-adapter');

var restAPI = function() {
    
    var restAPI = this;
    
    restAPI.start = function(callback) {

        var account     = hftd.config.account;
        var environment = account.accountType == 'demo' ? 'practice' : 'live';

        // suppress info messages
        console.info = function() {};

        restAPI.client = new OANDAAdapter({
            environment: environment,
            accessToken: account.accessToken
        });

        // use master (live system) for retrieving price information etc,
        // as it's more reliable
        if ('master' in hftd.config) {
            var master = hftd.config.master;
            environment = master.accountType == 'demo' ? 'practice' : 'live';
            restAPI.master = new OANDAAdapter({
                environment: environment,
                accessToken: master.accessToken
            });
        } else {
            restAPI.master = restAPI.client;
        }

        callback();
    
    };

};

module.exports = function() {
    return new restAPI();
};
