/**
 * Global functions / components
 */
global.sprintf    = require("sprintf-js").sprintf;
global.vsprintf   = require("sprintf-js").vsprintf;
global.strftime   = require('strftime');
global.async      = require('async');
global.sync       = require('synchronize');
global.fs         = require('fs');
global.pfs        = require('fs-promise');
global.path       = require('path');
global._          = require('underscore');
global.talib      = require('talib');
global.math       = require('mathjs');
global.yaml       = require('js-yaml');
global.Fiber      = require('fibers');
global.co         = require('co');
global.subdirs    = require('subdirs');
global.requireNew = require('require-new');

require("require.async")(require);