/*globals define, WebGMEGlobal, $ */
define([
    'js/logger',
    'js/Utils/ComponentSettings',
    'js/Layouts/DefaultLayout/DefaultLayout',
    'text!js/Layouts/DefaultLayout/templates/DefaultLayout.html',
    'text!./AnalyzerToolbarConfig.json'
], function (Logger,
             ComponentSettings,
             DefaultLayout,
             defaultLayoutTemplate,
             LayoutConfigJSON) {
    'use strict';

    var CONFIG = JSON.parse(LayoutConfigJSON);

    var AnalyzerToolbar = function (params) {

        DefaultLayout.call(this);

        this._logger = (params && params.logger) || Logger.create('gme:Layouts:AnalyzerToolbar',
            WebGMEGlobal.gmeConfig.client.log);
        this.config = AnalyzerToolbar.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this.config, AnalyzerToolbar.getComponentId());
        this._logger.debug('Resolved component-settings', this.config);

        this.panels = this.config.panels;
        this._template = (params && params.template) || defaultLayoutTemplate;

    };

    // Prototypical inheritance from PluginBase.
    AnalyzerToolbar.prototype = Object.create(DefaultLayout.prototype);
    AnalyzerToolbar.prototype.constructor = AnalyzerToolbar;

    AnalyzerToolbar.getComponentId = function () {
        return 'AnalyzerToolbar';
    };

    AnalyzerToolbar.getDefaultConfig = function () {
        return CONFIG;
    };

    return AnalyzerToolbar;
});
