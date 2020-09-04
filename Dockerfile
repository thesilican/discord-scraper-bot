FROM node:lts-alpine

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN JOEMAMA

CMD ["node", "dist/index.js"]
