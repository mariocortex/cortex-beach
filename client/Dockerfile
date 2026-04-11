# ============================================
# FRONTEND - Córtex Beach (Easypanel)
# ============================================
# Multi-stage: build com Node, serve estático com `serve`

# ---- Stage 1: build ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

# REACT_APP_API_URL embutido em build-time (Easypanel nao expoe Build Args na UI)
ARG REACT_APP_API_URL=https://btenis.cortexsolucoes.com.br
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ---- Stage 2: serve estático ----
FROM node:20-alpine
WORKDIR /app

RUN npm install -g serve@14

COPY --from=builder /app/build ./build

EXPOSE 5000

CMD ["serve", "-s", "build", "-l", "5000"]
