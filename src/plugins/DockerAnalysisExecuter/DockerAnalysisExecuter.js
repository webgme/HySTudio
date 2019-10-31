/*globals define*/
/*eslint-env node, browser*/

define([
    'plugin/PluginConfig',
    'text!./metadata.json',
    'plugin/PluginBase',
    'q'
], function (PluginConfig,
             pluginMetadata,
             PluginBase,
             Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of DockerAnalysisExecuter.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin DockerAnalysisExecuter.
     * @constructor
     */
    function DockerAnalysisExecuter() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    /**
     * Metadata associated with the plugin. Contains id, name, version, description, icon, configStructure etc.
     * This is also available at the instance at this.pluginMetadata.
     * @type {object}
     */
    DockerAnalysisExecuter.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    DockerAnalysisExecuter.prototype = Object.create(PluginBase.prototype);
    DockerAnalysisExecuter.prototype.constructor = DockerAnalysisExecuter;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(Error|null, plugin.PluginResult)} callback - the result callback
     */
    DockerAnalysisExecuter.prototype.main = function (callback) {
        // Use this to access core, project, result, logger etc from PluginBase.
        var self = this,
            Docker = require('dockerode'),
            docker = new Docker(),
            haveDirectory = false,
            haveContainer = false,
            haveStreams = false,
            aborted = false,
            container;

        self._config = self.getCurrentConfig();
        self._fs = require('fs');
        self._cp = require('child_process');
        self._path = require('path');
        self._zip = require('zip-folder');
        self._rimraf = require('rimraf');
        // self._basedir = self._path.join(process.cwd(), 'work_temp');
        self._basedir = '/webgmeshare/work_temp';
        self._name = self.core.getAttribute(self.activeNode, 'name');
        self._streams = {};

        self.onAbort = function () {
            var shouldCallCallback = false,
                promises = [];

            aborted = true;

            if (haveDirectory) {
                shouldCallCallback = true;
                promises.push(Q.nfcall(self._rimraf, self._workdir));
            }

            if (haveContainer) {
                shouldCallCallback = true;
                promises.push(container.kill());
            }

            Q.all(promises)
                .then(function () {
                    if (haveStreams) {
                        shouldCallCallback = true;
                        self._streams.stdout.end();
                        self._streams.stderr.end();
                    }

                    if (haveContainer) {
                        container.remove();
                    }

                    if (shouldCallCallback) {
                        callback(new Error('Execution was aborted.'));
                    }
                });
        };

        self._getDirectory();

        self._getAnalyzerConfig()
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                return self._prepareContainer();
            })
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                haveDirectory = true;
                return docker.createContainer({
                    Image: self._config.dockerImage,
                    Tty: false,
                    Cmd: ['node', self._path.join(self._path.join('/webgmedata', self._dirname), 'execute.js')],
                    WorkingDir: self._config.workingDir,
                    HostConfig: {
                        Binds: [
                            'hystudio_work:/webgmedata'
                        ]
                    }
                });
            })
            .then(function (container_) {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                haveContainer = true;
                container = container_;
                return container.attach({stream: true, stdout: true, stderr: true});

            })
            .then(function (stream) {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                container.modem.demuxStream(stream, self._streams.stdout, self._streams.stderr);
                haveStreams = true;
                return container.start();
            })
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                return container.wait();
            })
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                haveStreams = false;
                haveContainer = false;
                self._streams.stdout.end();
                self._streams.stderr.end();
                return container.remove();
            })
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                return self._createArtifact();
            })
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                haveDirectory = false;
                return Q.nfcall(self._rimraf, self._workdir);
            })
            .then(function () {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                if (aborted) {
                    throw new Error('Aborted already.');
                }
                self.logger.error(err);
                if (!aborted) {
                    callback(err, self.result);
                }
            });
    };

    DockerAnalysisExecuter.prototype._getAnalyzerConfig = function () {
        var self = this,
            deferred = Q.defer();

        Q.ninvoke(self._fs, 'readFile', self._path.join(process.cwd(), 'config/hyst.analyzers.json'), 'utf8')
            .then(function (fileContent) {
                var jsonContent = JSON.parse(fileContent);
                self._config.workingDir = jsonContent[self._config.analyzer].workingDir;
                self._config.commands = jsonContent[self._config.analyzer].commands;
                self._config.input = jsonContent[self._config.analyzer].input;
                self._config.dockerImage = jsonContent[self._config.analyzer].dockerImage;
                self._config.needConfigFile = jsonContent[self._config.analyzer].useConfig;
                self._config.noConversion = jsonContent[self._config.analyzer].noConversion;
                self._config.outputFormat = jsonContent[self._config.analyzer].outputFormat;

                deferred.resolve();
            })
            .catch(deferred.reject);
        return deferred.promise;
    };

    DockerAnalysisExecuter.prototype._prepareCommands = function (commandArray) {
        var commands = commandArray.join(' *** '),
            keys = Object.keys(this._config.userOptions || {});

        keys.forEach(function (option) {
            commands = commands.replace(new RegExp('\\\$' + option, 'g'), this._config.userOptions[option]);
        });

        // keys: $name are predefined
        commands = commands.replace(new RegExp('\\\$name', 'g'), this._name);
        // keys: $wdir are predefined
        commands = commands.replace(new RegExp('\\\$wdir', 'g'), this._config.workingDir);
        return commands.split(' *** ');
    };

    DockerAnalysisExecuter.prototype._prepareContainer = function () {
        //TODO create config file with executable commands and other configs for the docker
        var self = this,
            deferred = Q.defer(),
            config = {};

        config.workDir = self._config.workDir;
        config.commands = self._prepareCommands(self._config.commands || []);
        Q.ninvoke(self._fs, 'writeFile', self._path.join(self._workdir, 'options.cfg'), JSON.stringify(config, null, 2), 'utf8')
            .then(function () {
                return Q.ninvoke(
                    self._fs,
                    'copyFile',
                    self._path.join(process.cwd(), 'src/utils/runToolInDocker.js'),
                    self._path.join(self._workdir, 'execute.js')
                );
            })
            .then(function () {
                if (self._config.noConversion) {
                    return self._noConversionInput();
                } else {
                    return self._hystInput();
                }
            })
            .then(function () {
                self._streams.stdout = self._fs.createWriteStream(self._path.join(self._workdir, 'stdout.stream.log'));
                self._streams.stderr = self._fs.createWriteStream(self._path.join(self._workdir, 'stderr.stream.log'));
            })
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    };

    DockerAnalysisExecuter.prototype._noConversionInput = function () {
        var self = this,
            deferred = Q.defer(),
            exportPlugin;

        self.invokePlugin('ExportSpaceEx', {})
            .then(function (result) {
                if (result.success !== true) {
                    throw new Error('Cannot generate basic SpaceEx output!');
                }

                exportPlugin = result.pluginInstance;
                return Q.ninvoke(
                    self._fs,
                    'writeFile',
                    self._path.join(self._workdir, self._name + '.xml'),
                    exportPlugin._result.content,
                    'utf8'
                );
            })
            .then(function () {
                if (self._config.needConfigFile === true) {
                    return self._getConfig();
                } else {
                    return null;
                }
            })
            .then(function (configContent) {
                if (configContent !== null) {
                    return Q.ninvoke(
                        self._fs,
                        'writeFile',
                        self._path.join(self._workdir, self._name + '.cfg'),
                        configContent,
                        'utf8'
                    );
                }
            })
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;

    };

    DockerAnalysisExecuter.prototype._hystInput = function () {
        var self = this,
            deferred = Q.defer(),
            hystPlugin;

        self.invokePlugin('HyST', {pluginConfig: {tool: self._config.input}})
            .then(function (result) {
                if (result.success !== true) {
                    throw new Error('Initial conversion to proper input format failed!');
                }

                hystPlugin = result.pluginInstance;
                return Q.ninvoke(
                    self._fs,
                    'writeFile',
                    self._path.join(self._workdir, hystPlugin._result.filename),
                    hystPlugin._result.content,
                    'utf8'
                );
            })
            .then(function () {
                if (self._config.needConfigFile === true) {
                    return Q.ninvoke(
                        self._fs,
                        'writeFile',
                        self._path.join(self._workdir, hystPlugin._configFile.name),
                        hystPlugin._configFile.content,
                        'utf8'
                    );
                }
            })
            .then(deferred.resolve)
            .catch(deferred.reject);
        return deferred.promise;
    };

    DockerAnalysisExecuter.prototype._getConfig = function () {
        var self = this,
            deferred = Q.defer(),
            config = null;

        self.core.loadChildren(self.activeNode)
            .then(function (children) {
                children.forEach(function (child) {
                    if (self.core.isTypeOf(child, self.META.Configuration)) {
                        config = self.core.getAttribute(child, 'content');
                    }
                });
                deferred.resolve(config);
            })
            .catch(deferred.reject);

        return deferred.promise;
    };

    DockerAnalysisExecuter.prototype._getDirectory = function () {
        var chars = 'zxcvbnmasdfghjklqwertyuiop1234567890_',
            iterations = 20,
            dirname = '',
            workdir;
        while (iterations--) {
            dirname += chars.charAt(Math.trunc(Math.random() * chars.length));
        }

        this._dirname = dirname;
        workdir = this._path.join(this._basedir, dirname);
        this._fs.mkdirSync(workdir);
        this._workdir = workdir;
    };

    DockerAnalysisExecuter.prototype._createArtifact = function () {
        var self = this,
            chars = 'zxcvbnmasdfghjklqwertyuiop1234567890_',
            iterations = 10,
            fileName = '.result.zip',
            deferred = Q.defer();
        while (iterations--) {
            fileName = chars.charAt(Math.trunc(Math.random() * chars.length)) + fileName;
        }

        Q.nfcall(self._zip, self._workdir, self._path.join(self._workdir, '../' + fileName))
            .then(function () {
                return self.blobClient.putFile(
                    fileName, self._fs.readFileSync(self._path.join(self._workdir, '../' + fileName)));
            })
            .then(function (hash) {
                self.result.addArtifact(hash);
                return Q.ninvoke(self._fs, 'unlink', self._path.join(self._workdir, '../' + fileName));
            })
            .then(function () {
                // check if figures have to be saved separately
                var figures = [];
                if (Array.isArray(self._config.outputFormat.figures)) {
                    self._config.outputFormat.figures.forEach(function (figure) {
                        figures.push(self.blobClient.putFile(
                            figure, self._fs.readFileSync(self._path.join(self._workdir, figure))));
                    });
                }

                return Q.all(figures);
            })
            .then(function (hashes) {
                hashes.forEach(function (hash) {
                    self.result.addArtifact(hash);
                });
            })
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    };

    return DockerAnalysisExecuter;
});
