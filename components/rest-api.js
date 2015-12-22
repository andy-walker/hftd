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

        callback();
    
    };

};

module.exports = function() {
    return new restAPI();
};
