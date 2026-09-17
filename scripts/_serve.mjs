import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
const types={".html":"text/html",".js":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".svg":"image/svg+xml",".webmanifest":"application/manifest+json",".woff2":"font/woff2"};
createServer(async (req,res)=>{
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  try { const buf = await readFile(join(process.cwd(),"dist",p)); res.writeHead(200,{"content-type":types[extname(p)]||"application/octet-stream"}); res.end(buf); }
  catch { res.writeHead(404); res.end("nope"); }
}).listen(4830, "127.0.0.1", ()=>console.log("dist on 4830"));
