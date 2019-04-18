define(['q', 'common/util/xmljsonconverter'], function (Q, converter) {
    'use strict';
    var hyst = {},
        xml2json = new converter.XmlToJson(),
        json2xml = new converter.JsonToXml(),
        ATTRIBUTE_PREFIX = '@',
        CONTENT_KEY = '#text';

    hyst.checkModel = function (core, model, callback) {
        var deferred = Q.defer();
        //TODO implement necessary checks like BaseComponent has to have at least one location
        //TODO also check for NetworkComponents to have only instances of other components in the model
        setTimeout(function () {
            deferred.resolve(true);
        });
        return deferred.promise.nodeify(callback);
    };

    function orderLocations(locationArray) {
        locationArray.sort(function (a, b) {
            return a['@id'].localeCompare(b['@id']);
        });
    }

    function _orderComponents(componentArray) {
        componentArray.sort(function (a, b) {
            return a['@id'].localeCompare(b['@id']);
        });
    }

    function orderComponents(componentArray) {
        var componentHash = {},
            graph = {},
            idList = [],
            S = [],
            i,
            removeEdge = function (id) {
                idList.forEach(function (vertex) {
                    var index = graph[vertex].indexOf(id);
                    if (index !== -1) {
                        graph[vertex].splice(index, 1);
                        if (graph[vertex].length === 0) {
                            S.push(vertex);
                        }
                    }
                });
            };

        // First we order the elements so the result will be canonical
        componentArray.sort(function (a, b) {
            return a['@id'].localeCompare(b['@id']);
        });

        // Building the graph information
        componentArray.forEach(function (component) {
            var id = hyst.getAttribute(component, 'id');
            idList.push(id);
            componentHash[id] = component;
            if (component.hasOwnProperty('location')) {
                graph[id] = [];
            } else {
                graph[id] = [];
                if (!Array.isArray(component.bind)) {
                    component.bind = [component.bind];
                }
                component.bind.forEach(function (bind) {
                    graph[id].push(hyst.getAttribute(bind, 'component'));
                });
            }
        });
        // Empty the original array
        for (i = componentArray.length; i > 0; i--) {
            componentArray.pop();
        }


        // Initial fillup of S
        idList.forEach(function (vertex) {
            if (graph[vertex].length === 0) {
                S.push(vertex);
            }
        });

        // The ordering loop
        while (S.length > 0) {
            componentArray.push(componentHash[S[0]]);
            removeEdge(S.shift());
        }

        //Check if there is leftover vertices
        if (componentArray.length !== idList.length) {
            throw new Error('Circular reference among components exists!');
        }
    }

    function orderTransitions(transitionArray) {
        transitionArray.sort(function (a, b) {
            return (a['@source'] + a['@target']).localeCompare(b['@source'] + b['@target']);
        });
    }

    function orderParams(paramArray) {
        paramArray.sort(function (a, b) {
            return a['@name'].localeCompare(b['@name']);
        });
    }

    function orderMappings(mapArray) {
        mapArray.sort(function (a, b) {
            return a['@key'].localeCompare(b['@key']);
        });
    }

    function orderBindings(bindingArray) {
        bindingArray.sort(function (a, b) {
            return (a['@component'] + a['@as']).localeCompare(b['@component'] + b['@as']);
        });
    }

    function orderSpaceExArrayElement(arrayElement) {
        arrayElement.forEach(function (element) {
            if (typeof element === 'object') {
                orderSpaceExModelElement(element);
            }
        });
    }

    function orderSpaceExModelElement(modelElement) {
        var keys = Object.keys(modelElement || {});
        keys.forEach(function (key) {
            var element = modelElement[key];
            if (element instanceof Array) {
                switch (key) {
                    case'component':
                        orderComponents(element);
                        break;
                    case 'param':
                        orderParams(element);
                        break;
                    case 'location':
                        orderLocations(element);
                        break;
                    case 'transition':
                        orderTransitions(element);
                        break;
                    case 'map':
                        orderMappings(element);
                        break;
                    case 'bind':
                        orderBindings(element);
                        break;
                }
                orderSpaceExArrayElement(element);
            } else if (typeof element === 'object') {
                orderSpaceExModelElement(element);
            }
        });
    }

    function orderSpaceExModelObject(model) {
        orderSpaceExModelElement(model);
    }

    function removeEmptyContentFromElement(modelElement) {
        var keys = Object.keys(modelElement || {});
        if (modelElement.hasOwnProperty(CONTENT_KEY) && !((hyst.getContent(modelElement) || '').replace(/[ \r\n]/g, ''))) {
            delete modelElement[CONTENT_KEY];
        }
        keys.forEach(function (key) {
            if (modelElement[key] instanceof Array) {
                removeEmptyContentFromArrayElement(modelElement[key]);
            } else if (typeof modelElement[key] === 'object') {
                removeEmptyContentFromElement(modelElement[key]);
            }
        });
    }

    function removeEmptyContentFromArrayElement(arrayElement) {
        arrayElement.forEach(function (element) {
            if (typeof element === 'object') {
                removeEmptyContentFromElement(element);
            }
        });
    }

    function removeEmptyContentFromModel(model) {
        removeEmptyContentFromElement(model);
    }

    function checkXmlFormat(convertedSpaceExObject) {
        if (!convertedSpaceExObject.sspaceex) {
            throw new Error('Missing main component \'sspaceex\'.');
        }

        if (hyst.getAttribute(convertedSpaceExObject.sspaceex, 'math') !== 'SpaceEx') {
            throw new Error('Attribute math is not \'SpaceEx\'.');
        }

        if (hyst.getAttribute(convertedSpaceExObject.sspaceex, 'version') !== '0.2') {
            throw new Error('Given version is not supported.');
        }

        if (hyst.getAttribute(convertedSpaceExObject.sspaceex, 'xmlns') !==
            'http://www-verimag.imag.fr/xml-namespaces/sspaceex') {
            throw new Error('No proper \'xmlns\' tag was found.');
        }
    }

    function appendXmlFormatInfo(modelObject) {
        var completeXML = {sspaceex: modelObject};

        completeXML.sspaceex[ATTRIBUTE_PREFIX + 'math'] = 'SpaceEx';
        completeXML.sspaceex[ATTRIBUTE_PREFIX + 'version'] = '0.2';
        completeXML.sspaceex[ATTRIBUTE_PREFIX + 'xmlns'] = 'http://www-verimag.imag.fr/xml-namespaces/sspaceex';

        return completeXML;
    }

    hyst.spaceExToJson = function (spaceExString) {
        var spaceExObject = xml2json.convertFromString(spaceExString.replace(/\n/g, ''));

        try {
            checkXmlFormat(spaceExObject);
        } catch (e) {
            //TODO think of propagate the error...
            spaceExObject = {sspaceex: null};
        }

        orderSpaceExModelObject(spaceExObject.sspaceex);
        removeEmptyContentFromModel(spaceExObject.sspaceex);
        return spaceExObject.sspaceex;
    };

    hyst.jsonToSpaceEx = function (modelObject) {
        var xmlText;
        orderSpaceExModelObject(modelObject);
        removeEmptyContentFromModel(modelObject);
        modelObject = appendXmlFormatInfo(modelObject);
        xmlText = json2xml.convertToString(modelObject);
        return xmlText;
    };

    hyst.getAttribute = function (object, name) {
        return object[ATTRIBUTE_PREFIX + name] || null;
    };

    hyst.setAttribute = function (object, name, value) {
        object[ATTRIBUTE_PREFIX + name] = value;
    };

    hyst.delAttribute = function (object, name) {
        delete object[ATTRIBUTE_PREFIX + name];
    };

    hyst.getContent = function (object) {
        return object[CONTENT_KEY] || '';
    };

    hyst.setContent = function (object, content) {
        object[CONTENT_KEY] = typeof content === 'string' ? content
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;') : content;
    };

    hyst.getTextDimensions = function (text, nonLimited) {
        var dimension = {height: 100, width: 0},
            textArray = text.split('\n'),
            maxWidth = 600,
            maxHeight = 600;

        dimension.height = textArray.length * 22;

        textArray.forEach(function (line) {
            if (line.length > dimension.width) {
                dimension.width = line.length;
            }
        });

        dimension.width = dimension.width === 0 ? 200 : dimension.width * 8;

        if (nonLimited !== true) {
            dimension.width = Math.min(dimension.width, maxWidth);
            dimension.height = Math.min(dimension.height, maxHeight);
        }

        return dimension;
    };

    return hyst;
});