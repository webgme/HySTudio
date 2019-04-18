# HySTudio

The purpose of this studio is to provide an integrated workspace for the users 
interested in hybrid system verification tools. Once deployed, it provides an editor
combined with the [HyST](http://verivital.com/hyst/) translator as the central functionality
that can provide different input model formats to the chosen verification method. The bundle also
includes configuration for several tools that are readily available with the basic deployment. It also
provides an easy and seamless way to extend the toolset with just a few necessary steps.

## Installation
The whole deployment - for easy upgradeability and security - is built on 
[docker](https://docs.docker.com/) containers. The base elements are bound together with 
[docker-compose](https://docs.docker.com/compose/). As these containers are separated from the host
machine, no other pre-installation is necessary - however, for easy upgrades a [git](https://git-scm.com/) 
installation would serve the user. For a seamless access to available tool images, one should also get a 
[dockerhub](https://hub.docker.com/) account.

Once everything set up, the following single command will start up the studio (the command should be 
executed from the main directory of the repository which contains the ```docker-compose.yml``` file):

```docker-compose -f docker-compose.local.yml up -d```

By default, the server will function at port 80 of the host computer.

### Alternative deployment for a secure server
For a fully functional and secure (release) deployment there are a few additional steps that should be done:
- instead of starting it right away, you only build the docker images with ```docker-compose build``` command
- make sure the proper [certbot](https://certbot.eff.org/) is installed
- generate certificates for your deployment 
([nginx](https://www.nginx.com/) and [ubuntu](https://www.ubuntu.com/) should be selected as that will be the 
container's environment where nginx will run) with the ```certbot certonly -d yourDomainName``` command
- make sure that no application listens to port 80 and 443 on the host machine 
(usually nginx which service should be stopped)
- copy the ```privkey.pem``` and ```fullchain.pem``` files from the host machine 
(normally in ```/etc/letsencrypt/live/${HOSTNAME}``` directory) to the ssl volume of hysteditor
(```docker volume inspect hysteditor_ssl``` will give you the mounting point on the host machine)
- once everything is done, a simple ```docker-compose up -d``` should start the server.

This version of the deployment accepts connections on ports 80 and 443, and forwards everything through 443
for security purposes.

## Tool instllation
To allow execution of a given verification tool, some preliminary install steps might be required 
as those tools will run in their dedicated containers. Further information on this can be found 
in the ```config``` and ```core-dockerfiles``` directories.

## Main parts of the studio

### Editor
The initial entry-point of the studio is a standard [WebGME](https://webgme.org) editor where the user
can create projects using the ```HySTBase``` project seed. This seed contains an implementation of the 
[SpaceEx](http://spaceex.imag.fr/) meta-model and integrates many plugin for easy manipulation of
hybrid system models.

### Automated verification
When the user is in the correct context - in a model, the first item on the toolbar ```A``` is a 
drop-down button listing all the configured verification tools. Once the user clicks on one of them, 
the system initiates a verification of the model with the tool. It starts with a translation step 
executed with the HyST plugin to get the model into the correct input format. After it, the dedicated 
docker container is started and the tool is executed. The result is then packaged and provided in the 
form of a link to the user - pop-up notification in the top middle portion of the screen.

The last item in the drop-down list is ```- last-result -``` helps to bring back the latest execution 
result as the notification disappears after a certain amount of time.

### Plugins
A short description about the plugins that implements useful features to help the user.
- __ImportSpaceEx__: Imports a model from a spaceex file. The plugin is only accessible in the ```Models``` 
container context.
- __ImportSpaceExConfig__: Imports a configuration associated with the given model from a cfg file. Can be 
run in the context of a ```model```.
- __HyST__: Translates the given model to the resuired output format. Though this plugin is part of the 
automated verification, the user can use it in a standalone mode to generate the necessary format out 
of the model. The plugin can be initiated in any ```model``` context.
- __ExportSapceEx__: Exports the given model into a spaceex file. Can be run at a ```model```.
- __ExportSpaceExConfig__: Prints out the given configuration into a cfg file. It can be initiated in any 
```configuration``` element.
