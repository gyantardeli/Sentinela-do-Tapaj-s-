FROM node:22-alpine
WORKDIR /app
COPY . .
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=8787 DATA_DIR=/app/data ENABLE_AUTO_COLLECT=1
EXPOSE 8787
CMD ["node","server.mjs"]
