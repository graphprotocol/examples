FROM node:20-alpine

COPY . /usr/src/app

WORKDIR /usr/src/app

RUN apk add git

RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

RUN corepack enable

RUN corepack prepare pnpm@9.10.0 --activate

RUN pnpm install

COPY $PWD/entrypoint.sh /usr/local/bin

ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]
