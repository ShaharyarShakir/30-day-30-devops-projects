FROM dxflrs/garage:v2.3.0 AS garage-bin

FROM alpine:latest
RUN apk add --no-cache bash curl
COPY --from=garage-bin /garage /usr/local/bin/garage
COPY init.sh /init.sh
RUN chmod +x /init.sh
ENTRYPOINT ["/init.sh"]
