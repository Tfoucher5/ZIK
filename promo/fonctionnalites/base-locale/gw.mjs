import http from "node:http";
http
  .createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "*");
    res.setHeader("Access-Control-Allow-Methods", "*");
    res.setHeader("Access-Control-Expose-Headers", "*");
    if (req.method === "OPTIONS") return res.end();
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (!req.url.startsWith("/rest/v1")) {
      console.log("STUB", req.method, req.url.slice(0, 100));
      res.writeHead(req.url.startsWith("/auth/v1/user") ? 401 : 200, {
        "content-type": "application/json",
      });
      return res.end(
        req.url.startsWith("/auth/v1/user") ? '{"msg":"no session"}' : "{}",
      );
    }
    const h = { ...req.headers };
    delete h.host;
    delete h.connection;
    delete h["accept-encoding"];
    const r = await fetch("http://127.0.0.1:3100" + req.url.slice(8), {
      method: req.method,
      headers: h,
      body: ["GET", "HEAD"].includes(req.method)
        ? undefined
        : Buffer.concat(chunks),
    });
    if (r.status >= 400)
      console.log("ERR", r.status, req.method, req.url.slice(0, 160));
    const out = {};
    r.headers.forEach((v, k) => {
      if (
        ![
          "content-encoding",
          "content-length",
          "transfer-encoding",
          "connection",
        ].includes(k)
      )
        out[k] = v;
    });
    res.writeHead(r.status, out);
    res.end(Buffer.from(await r.arrayBuffer()));
  })
  .listen(54321, "127.0.0.1");
