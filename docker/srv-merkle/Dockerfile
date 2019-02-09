FROM ruby:2.5.3
MAINTAINER "Christoph Fabianek" christoph@ownyourdata.eu

RUN mkdir /usr/src/app
WORKDIR /usr/src/app
RUN useradd docker \
        && mkdir /home/docker \
        && chown docker:docker /home/docker \
        && addgroup docker staff
USER docker

RUN gem install \
        httparty \
        merkle-hash-tree \
        digest

COPY merkle.rb .
COPY run.sh /bin/run.sh

CMD [ "/bin/bash" ]
