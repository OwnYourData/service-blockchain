FROM node:carbon
MAINTAINER "Christoph Fabianek" christoph@ownyourdata.eu

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

RUN useradd docker \
        && mkdir /home/docker \
        && chown docker:docker /home/docker \
        && addgroup docker staff
USER docker

COPY . .
COPY run.sh /bin/run.sh

EXPOSE 3010

CMD [ "/bin/bash" ]