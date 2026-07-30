# Base image
FROM node:18-alpine As build
WORKDIR /usr/src/app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/node_modules/@prisma ./node_modules/@prisma
EXPOSE 3000
CMD ["npm", "run", "start:prod"]
