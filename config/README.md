# How to configure the HySTEditor
There are two main parts of the configuration of the system. The parameters of the WebGME system can be 
configured using the methods described in [WebGME](#webgme-configuration-parameters) section.

##Analyzer Configuration
Any ```dockerized``` verification tool can be easily setup in a deployment, allowing huge extensibility. 
The following example snipet show what confiugraion options can be used to integrate any given tool.
```
"IdOfMyTool": { <-- this is what the list will contain in the toolbar drop-down button
    "description": "My awesome tool.", <-- this is the tooltip of the list entry
    "input": "spaceex", <-- set to the required format ["hycreate","flowstar","dreach","spaceex","hycomp"]
    "useConfig": true, <-- the config object will be written out into the working directory
    "noConversion": true, <-- bypasses the HyST translation and uses the built-in spaceex format
    "dockerImage": "myDocker/MyTool:0.1.2", <-- the tag of the docker image that contains the tool
    "workingDir": "/usr/myTool", <-- the directory of the execution
    "commands": [
      "run mytool -w some parameters" <-- list of commands to run inside the container to get the result
    ],
    "outputFormat": "archive" <-- Packages all final and intermediate artifacts into a single zip file
    "userOptions":{} <-- object describing the list of options that the user can change before each execution
``` 

After adding such snipet to the ```hyst.analyzers.json``` file, the tool will be accessible for 
the end-user. No restart is required, only a refresh for the page.

####User Options
The user options can be defined in the regular [plugin configration](https://github.com/webgme/webgme/wiki/GME-Plugins#metadatajson) manner. 
The values given by the user can be later used within the commands. For item ```myOption```, its value 
can be used by entering ```$myOption``` into any of the command texts. The ```$dir``` and ```$name``` 
values are already used. The first will always point to the proper working directory inside the 
tool container - so the results should be generated there, while the second will always have the name 
of the model which is used throughout the verification process.
##WebGME Configuration Parameters
On `npm start`, the webgme app will load `config.default.js` which will override the configuration [defaults](https://github.com/webgme/webgme/tree/master/config).

If `NODE_ENV` is set, it will first try to load the configuration settings from `config/config.ENV.js` where `ENV` is the value of `NODE_ENV`. For example,
```
NODE_ENV=debug npm start
```
will load the configuration settings from `config/config.debug.js` if it exists and fallback to `config/config.default.js` otherwise
