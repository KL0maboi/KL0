FROM oven/bun:1 AS base
WORKDIR /app

COPY package.json bun.lock tsconfig.json ./

RUN bun install

COPY . .

ENV PORT=9000

EXPOSE 9000

CMD ["bun", "start"]