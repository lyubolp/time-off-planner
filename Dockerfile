FROM alpine:3.21 AS downloader

ARG PB_VERSION=0.36.9
ARG TARGETARCH=amd64
ARG TARGETVARIANT

RUN apk add --no-cache ca-certificates curl unzip

RUN case "${TARGETARCH}" in \
    "amd64"|"arm64") PB_ARCH="${TARGETARCH}" ;; \
    "arm") [ "${TARGETVARIANT}" = "v7" ] && PB_ARCH="armv7" || { echo "Unsupported ARM variant: ${TARGETVARIANT}"; exit 1; } ;; \
    *) echo "Unsupported architecture: ${TARGETARCH}" && exit 1 ;; \
  esac \
  && curl -fsSL -o /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${PB_ARCH}.zip" \
  && unzip /tmp/pocketbase.zip -d /tmp/pocketbase \
  && chmod +x /tmp/pocketbase/pocketbase

FROM alpine:3.21

RUN apk add --no-cache ca-certificates

WORKDIR /pb

COPY --from=downloader /tmp/pocketbase/pocketbase /usr/local/bin/pocketbase
COPY pb_public ./pb_public
COPY pb_migrations ./pb_migrations

VOLUME ["/pb/pb_data"]

EXPOSE 8090

ENTRYPOINT ["/bin/sh", "-c", "pocketbase migrate up --dir=/pb/pb_data && exec pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data"]
