FROM node:10.12

# @NOTE This Dockerfile pulls in a private repository
# In order to accomplish this, it makes use of a GH Personal Access Token:
# https://github.com/settings/tokens (Make sure you have the `repo` scope, ...and only that)
#
# Make sure you either set it in your environment or build the docker image with it
# Eg: docker build --build-arg GH_PAT='XXX' .
ARG GH_PAT

# Make the dapp's ENV values to have the option to be set at build time
# But fall back to a default
ARG LOADER=network
ARG NETWORK=goerli
ARG VERBOSE=false
ARG COLONY_NETWORK_ENS_NAME=joincolony.eth
ARG PINNING_ROOM=PINION_DEV_ROOM
ARG PINNER_ID=QmXZKaLLuJzHZ3dnjHJiHLMHo4bFKaR3wWcf4ZbbqtxhBv

# @FIX Debian Jessie / Docker issue with apt.
# See: https://stackoverflow.com/questions/46406847/docker-how-to-add-backports-to-sources-list-via-dockerfile
RUN echo "deb http://archive.debian.org/debian/ jessie main\n" \
        "deb-src http://archive.debian.org/debian/ jessie main\n" \
        "deb http://security.debian.org jessie/updates main\n" \
        "deb-src http://security.debian.org jessie/updates main" > /etc/apt/sources.list

# @FIX Allow the nginx service to start at build time, so that the installation will work
# Otherwise nginx-common and nginx-full fails to install, and won't set up the service
# See: https://askubuntu.com/questions/365911/why-the-services-do-not-start-at-installation
RUN sed -i "s|exit 101|exit 0|g" /usr/sbin/policy-rc.d

# Update the apt cache
RUN apt-get clean
RUN apt-get update

# Apt-utils needs to be in before installing the rest
RUN apt-get install -y \
  locales \
  apt-utils \
  build-essential \
  curl \
  file \
  zip \
  nginx

# Reconfigure locales
RUN echo "en_US.UTF-8 UTF-8" >> /etc/locale.gen
RUN locale-gen

# Clone the repo
RUN git clone "https://$GH_PAT@github.com/JoinColony/colonyDapp.git"
WORKDIR /colonyDapp

# Install node_modules
RUN yarn

# Setup the repo's ENV file
RUN echo "LOADER=$LOADER\n" \
        "NETWORK=$NETWORK\n" \
        "VERBOSE=$VERBOSE\n" \
        "COLONY_NETWORK_ENS_NAME=$COLONY_NETWORK_ENS_NAME\n" \
        "PINNING_ROOM=$PINNING_ROOM\n" \
        "PINNER_ID=$PINNER_ID\n" > .env

# Build the production bundle
RUN yarn webpack:build:prod

# Copy the production bundle
RUN mkdir ../colonyDappProd
RUN cp -R ./dist/* ../colonyDappProd

# Cleanup the source folder
WORKDIR /
RUN rm -Rf colonyDapp
WORKDIR /colonyDappProd

# Setup a basic nginx config
RUN echo "server {\n" \
        "    listen       80;\n" \
        "    server_name  default_server;\n\n" \
        "    location / {\n" \
        "        root   /colonyDappProd;\n" \
        "        try_files \$uri /index.html;\n" \
        "    }\n" \
        "}" > /etc/nginx/sites-available/default

# Expose the HTTP port
EXPOSE 80

# @NOTE Run the actual command, rather then the service
# so that the docker container won't exit
CMD ["nginx", "-g", "daemon off;"]

# READY TO GO !