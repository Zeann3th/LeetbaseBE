FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --only=production

COPY . .

EXPOSE 7554

ENV NODE_ENV=production

CMD ["node", "src/index.js"]

