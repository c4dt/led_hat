FROM debian:bookworm-slim

RUN apt update && apt install -y patchelf ca-certificates

RUN mkdir /web
COPY target/release/led_hat /web
COPY html /web/html
RUN ls -R /web
RUN patchelf --set-interpreter /usr/lib64/ld-linux-x86-64.so.2 /web/led_hat

FROM debian:bookworm-slim
WORKDIR /web
COPY --from=0 /web /web
COPY --from=0 /etc/ssl /etc/ssl
EXPOSE 8080

ENTRYPOINT ["/web/led_hat"]
