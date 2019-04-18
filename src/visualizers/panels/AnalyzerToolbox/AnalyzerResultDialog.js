/*
 *
 * @author kecso / https://github.com/kecso
 *
 */
define([
    'text!./templates/AnalyzerResultDialog.html',
    'css!./styles/AnalyzerResultDialog.css'
], function (dialogTemplate) {
    'use strict';

    function AnalyzerResultDialog() {
    }

    AnalyzerResultDialog.prototype.show = function (params, finished) {
        var self = this,
            timer = null;

        this._dialog = $(dialogTemplate);
        this._content = this._dialog.find('.modal-content');
        this._body = this._dialog.find('.modal-body');
        this._resultArchive = this._dialog.find('.result-archive');
        this._resultImage = this._dialog.find('.result-image');

        // filling out default parameters
        params.id = params.id || 'unknown';
        params.timer = params.timer || 80000;

        if (params.success) {
            this.addSuccessText(params.id, params.content);
        } else {
            this.addFailureText(params.id, params.err, params.content);
        }

        if (Array.isArray(params.figures) && params.figures.length > 0) {
            params.figures.forEach(function (figure) {
                self.appendFigure(figure);
            });
            // TODO this needs to be addressed at some point
            this._body.css("max-height", "2000px");
            this._body.css("max-width", "2000px");
        }

        this._dialog.on('hide.bs.modal', function () {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }

            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            if (typeof finished === 'function') {
                finished();
            }
        });


        this._content.mouseenter(function () {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        });

        this._content.mouseleave(function () {
            if (timer === null) {
                timer = setTimeout(function () {
                    self._dialog.modal('hide');
                }, params.timer);
            }
        });

        this._dialog.modal('show');

        timer = setTimeout(function () {
            self._dialog.modal('hide');
        }, params.timer);
    };

    AnalyzerResultDialog.prototype.appendFigure = function (figureUrl) {
        this._resultImage.append('<img src="' + figureUrl + '" >');
    };

    AnalyzerResultDialog.prototype.addSuccessText = function (id, content) {
        var htmlContent = 'Execution of [' + id + '] succeeded';

        if (content) {
            htmlContent += '<br>Detailed results can be found <a href="' +
                content + '" target="_blank">here</a>';
        }

        this._resultArchive.html(htmlContent);
    };

    AnalyzerResultDialog.prototype.addFailureText = function (id, errMsg, content) {
        var htmlContent = 'Execution of [' + id + '] failed';

        if (errMsg) {
            htmlContent += ' {' + errMsg + '}.'
        }
        if (content) {
            htmlContent += '<br>Detailed information and partial results can be found <a href="' +
                content + '" target="_blank">here</a>';
        }

        this._resultArchive.html(htmlContent);

    };

    return AnalyzerResultDialog;
});
