FROM golang:1.24-alpine AS builder

ENV GOSUMDB=off

RUN go install -v github.com/minio/minio@latest
RUN go install -v github.com/minio/mc@latest

FROM alpine:latest

COPY --from=builder /go/bin/minio /usr/local/bin/minio
COPY --from=builder /go/bin/mc /usr/local/bin/mc

EXPOSE 9000 9001

CMD ["minio", "server", "/data", "--console-address", ":9001"]
