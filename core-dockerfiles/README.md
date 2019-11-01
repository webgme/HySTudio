
# Core Docker files

This is a collection of completed analyzer tool docker files. Additionally we provide the image building commands, so that they match with the default configuration provided with the Design Studio.

## Install commands

These commands are intended to be executed from the main directory of the HySTudio.

```docker build -f .\core-dockerfiles\Dockerfile.flowstar -t flowstar:1.2.3 .\```

```docker build -f .\core-dockerfiles\Dockerfile.spaceex -t spaceex:0.9.8c .\```
