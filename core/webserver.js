/**
 * Web server component
 */
var webserver = function() {

    var webserver  = this;
    var express    = require('express');
    var exphbs     = require('express-handlebars');
    var app        = express();
    var server     = require('http').Server(app);
    var io         = require('socket.io')(server);
    var config     = hftd.config.webserver;
    var webroot    = __dirname + '/../webclient/static';
    var routing    = require(__dirname + '/../webclient/routing.json');

    // subcomponents
    webserver.subscriptions = require(__dirname + '/webserver/subscriptions')();

    var hbs = exphbs.create({
        defaultLayout: 'main',
        extname: '.hbs',
        layoutsDir: __dirname + '/../webclient/views/layouts',

        partialsDir: [
            __dirname + '/../webclient/views/'
        ]

    });

    app.engine('.hbs', hbs.engine);
    app.set('view engine', '.hbs');

    webserver.processRoute = function(request, response) {
        
        //console.log(request);
        var url = request.originalUrl;

        if (url in routing) {

            async.waterfall([

                // check for page controller and instantiate + run buildParams method if exists
                function(taskCallback) {

                    // if route defines a page controller, instantiate it and run buildParams method
                    if (routing[url] && 'controller' in routing[url]) {
                        
                        var controller = require(__dirname + '/../webclient/controllers/page/' + routing[url].controller)();
                        controller.buildParams(taskCallback);
                    
                    // if no page controller, run callback immediately
                    } else taskCallback();

                }

               // render the view 
            ], function(error, templateParams) {

                templateParams = templateParams || {};

                // if route defines a view, use that - otherwise attempt to load template with
                // the same path as the route
                if (routing[url] && 'view' in routing[url]) {
                    view = routing[url].view;
                } else {
                    view = url.slice(1, -1);
                }

                // if route defines a page title, set it
                if (routing[url] && 'title' in routing[url])
                    templateParams.title = routing[url].title;
                
                // if route defines a page description, set it
                if (routing[url] && 'description' in routing[url])
                    templateParams.description = routing[url].description;

                // helper to provide raw output, so angular templates can use {{ }}
                // and prevents handlebars trying to parse them server-side
                templateParams.helpers = {
                    angular: function(options) {
                        return options.fn();
                    }
                }

                response.render(__dirname + '/../webclient/views/' + view, templateParams);

            });

        }

    };

    webserver.start = function(callback) {
        
        hftd.log('Initializing web server ...');

        // Authentication callback
        app.use(function(req, res, next) {
            
            var auth;

            // check whether an authorization header was sent   
            if (req.headers.authorization) {
                auth = new Buffer(req.headers.authorization.substring(6), 'base64').toString().split(':');
            }

            if (!auth || auth[0] !== config.authName || auth[1] !== config.authPass) {
                // if any of the tests failed ..
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="Please log in.."');
                res.end('Unauthorized');
            } else {
                // continue with processing, user was authenticated
                next();
            }
        });
        
        /*
        app.get('/', function(req, res) {
            res.sendFile('index.html', { root: webroot });
        });
        */

        // load routes
        for (path in routing)
            app.get(path, webserver.processRoute);

        app.use(express.static(webroot));

        var port = 'port' in config ? config.port : 5080;
        var ip   = 'ip' in config ? config.ip : '0.0.0.0';
        
        server.listen(port, ip, 511, function(error, result) {
            hftd.log(sprintf('Web server initialized, listening on port %d - [ %s ]', port, color('OK', 'green')));
            callback();
        });

    };

    io.on('connection', function(socket) {
        console.log('socket connected!');

        socket.on('trades:get', function(params) {

            var trades   = {};
            var chartist = hftd.chartist;

            for (var tid in hftd.execution.trades) {
                
                var trade = {};
                for (var property in hftd.execution.trades[tid])
                    trade[property] = hftd.execution.trades[tid][property];

                var quote = chartist.getQuote(hftd.execution.trades[tid].instrument); 
                
                trade.current = trade.side == 'buy' ? quote.bid : quote.ask;         
                trade.profit  = {
                    base:    (chartist.convert(hftd.stats.calculateProfitLoss(trade.side, trade.price, trade.current), trade.instrument.split('_')[1], 'GBP') * trade.units).toFixed(2),
                    percent: hftd.stats.calculateProfitLossPercent(trade.side, trade.price, trade.current).toFixed(2)
                };
                trades[tid] = trade;

            }

            socket.emit('trades:all', trades);
        });

        socket.on('subscribe:tradeUpdates', function(params) {
            webserver.subscriptions.subscribe(socket, 'tradeUpdates');
            socket.on('disconnect', function() {
                webserver.subscriptions.unsubscribe(socket, 'tradeUpdates');
            });
        });

    });

};

module.exports = function() {
    return new webserver();
};