/*globals process, console, require*/
'use strict';

var fs = require('fs'),
    config = require('./config.default'),
    validateConfig = require('webgme/config/validator');

config.blob.fsDir = '/webgmeshare/blob-local-storage';

config.server.port = 8008;

config.mongo.uri = 'mongodb://mongo:27017/hysteditor-docker';

validateConfig(config);
module.exports = config;