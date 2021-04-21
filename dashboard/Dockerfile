FROM node:14

WORKDIR /usr/src/app
COPY package*.json ./

ENV NODE_ENV=production
RUN yarn install
COPY . .

EXPOSE 80
CMD [ "yarn", "start" ]