FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev && npm cache clean --force

COPY . .

EXPOSE 7554

ENV NODE_ENV=production

CMD ["npm", "start"]

