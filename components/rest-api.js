/**
 * REST API component
 */
var restAPI = function() {

};

restAPI.prototype.start = function(callback) {
    console.log('starting rest api');
    callback();
};

module.exports = function() {
    return new restAPI();
};
