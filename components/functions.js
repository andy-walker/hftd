/**
 * Util functions
 */
if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}

hftd.log = function(message, level) {
    
    level = level || 'message';

    var prefix = {
        'message': '',
        'warning': color('Warning', 'yellow') + ': ',
        'error':   color('Error', 'red') + ': '
    }[level];

    console.log(sprintf("[%s] %s%s", 
        strftime('%a %Y-%m-%d %H:%M:%S', new Date()),
        prefix,
        message
    ));

};

hftd.error = function(message) {
    hftd.log(message, 'error');
};

hftd.warning = function(message) {
    hftd.log(message, 'warning');
};

/**
 * Sum numbers in an array - equivalent to php's array_sum function
 */
global.arraySum = function(array) {
    var key, sum = 0;
    for (key in array) {
        if (!isNaN(array[key])) 
            sum += array[key];
    }
    return sum;
};

/**
 * Read in command-line params
 * @return array
 */
global.getParams = function() {
    
    var argv   = process.argv.slice(2);
    var params = {};

    argv.forEach(function(argument) {
         
        if (argument.substr(0, 2) == '--') {
            
            // options
            argument = argument.substr(2).split('=');
            params[argument[0]] = argument[1] !== undefined ? argument[1] : 1;
        
        } else {

            // arguments
            if (params.runtest !== undefined)
                params.test = argument;

            switch (true) {
                
                case params.auto === undefined && argument == 'auto':
                    params.auto = 1;
                    break;

                case params.backtest === undefined && argument == 'backtest':
                    params.backtest = 1;
                    break;

                case params.runtest === undefined && argument == 'runtest':
                    params.runtest = 1;
                    break;

                case params.start_time === undefined:
                    params.start_time = argument;
                    break;

                case params.end_time === undefined:
                    params.end_time = argument;
                    break;

            }

        }

    });

    return params;

};

global.getPercentageDifference = function(a, b) {
    var difference = ((b - a) / b) * 100;
    return Math.sqrt(difference * difference);
};

/**
 * Convert date string to unix timestamp
 */
global.getTimestamp = function(dateString) {
    var date = new Date(dateString);
    return Math.floor(date.getTime() / 1000);
};

