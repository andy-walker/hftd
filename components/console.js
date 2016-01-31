String.prototype.lpad = function(padString, length) {
    var str = this;
    while (str.length < length)
        str = padString + str;
    return str;
}

/**
 * Console colour function
 */
global.color = function(message, color, bgColor) {
    
    if (bgColor) {

        var bgCode = {
            'red':     "\033[41m",
            'green':   "\033[42m",
            'yellow':  "\033[43m",
            'blue':    "\033[44m",
            'magenta': "\033[45m",
            'cyan':    "\033[46m",
            'grey':    "\033[47m"
        }[bgColor] || '';
    
    } else {
        var bgCode = '';
    }
    
    switch (color) {

        case 'red':     return ["\033[31m",   bgCode, message, "\033[0m"].join('');
        case 'lred':    return ["\033[1;31m", bgCode, message, "\033[0m"].join('');
        case 'blue':    return ["\033[1;34m", bgCode, message, "\033[0m"].join('');
        case 'magenta': return ["\033[0;35m", bgCode, message, "\033[0m"].join('');
        case 'cyan':    return ["\033[36m",   bgCode, message, "\033[0m"].join('');
        case 'lcyan':   return ["\033[1;36m", bgCode, message, "\033[0m"].join('');
        case 'green':   return ["\033[32m",   bgCode, message, "\033[0m"].join('');
        case 'lgreen':  return ["\033[1;32m", bgCode, message, "\033[0m"].join('');
        case 'yellow':  return ["\033[1;33m", bgCode, message, "\033[0m"].join('');
        case 'grey':    return ["\033[1;30m", bgCode, message, "\033[0m"].join('');
        case 'lgrey':   return ["\033[0;37m", bgCode, message, "\033[0m"].join('');
        case 'white':   return ["\033[1;37m", bgCode, message, "\033[0m"].join('');
        case 'black':   return ["\033[0;30m", bgCode, message, "\033[0m"].join('');

    }

    return message;

};

global.labelValue = function(labelValues) {

    // get longest key
    var longestKey = 0;

    for (var key in labelValues)
        if (key.length > longestKey)
            longestKey = key.length;

    var output = [];

    for (var key in labelValues)
        output.push(sprintf('%s: %s', key.lpad(' ', longestKey), labelValues[key]));

    return output.join("\n");

};

hftd.log = function(message, level) {
    
    level = level || 'message';

    var prefix = {
        'message': '',
        'warning': color('Warning', 'yellow') + ': ',
        'error':   color('Error', 'red') + ': ',
        'command': color('Service port', 'blue') + ': '
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

hftd.fatal = function(message) {
    hftd.error(message);
    process.exit(1);
};

hftd.warning = function(message) {
    hftd.log(message, 'warning');
};
