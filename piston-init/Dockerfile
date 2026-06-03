FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /opt
RUN git clone --depth 1 https://github.com/engineer-man/piston.git

WORKDIR /opt/piston/cli
RUN npm install

COPY install-runtimes.sh /usr/local/bin/install-runtimes
RUN chmod +x /usr/local/bin/install-runtimes

ENTRYPOINT ["install-runtimes"]
