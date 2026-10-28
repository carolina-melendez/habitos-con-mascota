FROM node:24-alpine AS development
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci && chown -R node:node /app
USER node
COPY --chown=node:node . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM development AS build
RUN npm run build

FROM nginx:stable-alpine AS production
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
