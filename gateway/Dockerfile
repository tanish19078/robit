FROM node:20-alpine
WORKDIR /app
COPY gateway/package*.json ./
RUN npm ci --omit=dev
COPY gateway/server.js ./
COPY frontend ./frontend
COPY data ./data
ENV PORT=3000 FRONTEND_DIR=/app/frontend DATA_DIR=/app/data
EXPOSE 3000
CMD ["node", "server.js"]
