# ============================================
# BACKEND - Córtex Beach (Easypanel)
# ============================================
FROM node:20-alpine

WORKDIR /app

# Instalar dependências primeiro (cache de camada)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Código da aplicação
COPY src ./src
COPY migrations ./migrations

# Pasta de uploads — Easypanel deve montar um volume persistente aqui
RUN mkdir -p /app/uploads
ENV UPLOADS_DIR=/app/uploads

EXPOSE 5001

CMD ["node", "src/index.js"]
