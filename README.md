# Hellco Video

Live streaming video using HLS and chat using socket.io.

## How to use

```
Login as root, service redis_6379 start
forever start --killSignal=SIGTERM index.js USE THIS ON ALL NODE CLUSTER SERVERS

add all node cluster servers to nginx.conf location loadcluster
```

And point your browser to `http://localhost:80`. Optionally, specify
a port by supplying the `PORT` env variable.