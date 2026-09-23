FROM python:3.13-slim

ARG DENO_VERSION=2.9.7
ARG TARGETARCH=amd64

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates curl unzip \
    && case "$TARGETARCH" in \
         amd64) DENO_ARCH="x86_64" ;; \
         arm64) DENO_ARCH="aarch64" ;; \
         *) echo "Unsupported architecture: $TARGETARCH" && exit 1 ;; \
       esac \
    && curl -fsSL "https://github.com/denoland/deno/releases/download/v$DENO_VERSION/deno-$DENO_ARCH-unknown-linux-gnu.zip" -o /tmp/deno.zip \
    && unzip /tmp/deno.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/deno \
    && rm -rf /var/lib/apt/lists/* /tmp/deno.zip

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

EXPOSE 8787
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8787"]
