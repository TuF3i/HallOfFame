# Stage 1: Build frontend
FROM docker.jiaxin.site/library/node:20-alpine AS frontend-builder
WORKDIR /web
COPY web/package.json web/package-lock.json* ./
RUN npm install
COPY web/ ./
RUN node scripts/build.mjs

# Stage 2: Build backend
FROM docker.jiaxin.site/library/golang:1.24-alpine AS backend-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go env -w GOPROXY=https://goproxy.cn,direct && go mod download
COPY . .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o server ./cmd/server/

# Stage 3: Runtime
FROM docker.jiaxin.site/library/alpine:3.21
RUN apk add --no-cache ca-certificates tzdata
RUN adduser -D -u 1000 appuser
USER appuser
WORKDIR /app
COPY --from=backend-builder /app/server .
COPY --from=frontend-builder /web/dist ./frontend
COPY config/config.json ./config.json

ENV FRONTEND_DIR=/app/frontend
ENV CONFIG_PATH=/app/config.json

EXPOSE 8080 9090

ENTRYPOINT ["./server", "server"]
