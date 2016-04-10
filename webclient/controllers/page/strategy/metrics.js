/**
 * Page controller for strategy/metrics page
 */
var metrics = function() {

    var metrics = this;

    metrics.buildParams = function(callback) {

        // temporary code - will eventually query mongodb for this
        var filename = __dirname + '/../../../../data/stats.csv';
        var parse    = require('csv-parse');
        
        var balanceHist   = {};
        var balance       = {};
        var bounds        = {};
        var strategyIndex = [];

        var parser = parse({delimiter: ','}, function (err, data) {
            
            var i = 0;
            data.shift().forEach(function(strategy) {
                if (i) {
                    balanceHist[strategy] = [];
                    balance[strategy]     = [];
                }
                strategyIndex.push(strategy);
                i++;
            });
            
            var timestamp;

            data.forEach(function(line) {
                
                var j = 0;

                line.forEach(function(column) {
                    if (!j) {
                        var ts = column.split(' ');
                        timestamp = strftime('%Y,%m,%d,%H,%M,%S', new Date(ts[1] + 'T' + ts[2]));
                        var date = timestamp.split(',');
                        date[1]--;
                        timestamp = date.join(', ');
                    } else { 
                        var strategy = strategyIndex[j];
                        column = parseFloat(column).toFixed(2);
                        if (!balanceHist[strategy].length || column != _.last(balanceHist[strategy])[1]) {
                            balanceHist[strategy].push([timestamp, column]);
                            balance[strategy].push(column);
                        }
                    }
                    j++;
                });

            });

            for (strategy in balanceHist)
                if (balanceHist[strategy].length == 1)
                    balanceHist[strategy].push([timestamp, balanceHist[strategy][0][1]]);

            var returnVal = {};

            for (strategy in balanceHist) {
                returnVal[strategy] = {
                    min:     Math.min.apply(null, balance[strategy]),
                    max:     Math.max.apply(null, balance[strategy]),
                    balance: balanceHist[strategy]
                }
            }
            
            callback(null, { strategies: returnVal});

        });

        fs.createReadStream(filename).pipe(parser);

    };

};

module.exports = function() {
    return new metrics();
};