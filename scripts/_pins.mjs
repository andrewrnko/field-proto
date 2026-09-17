import puppeteer from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const OUT="/tmp/pins"; mkdirSync(OUT,{recursive:true});
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:`/tmp/gr-pin-${process.pid}`,args:["--no-first-run","--window-size=1400,1800"]});
const p=await b.newPage();
await p.setViewport({width:1400,height:1800,deviceScaleFactor:1});
await p.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36");
await p.goto("https://www.pinterest.com/wealthvisions/elements/",{waitUntil:"networkidle2",timeout:60000});
await wait(3000);
const urls=new Set();
for (let i=0;i<14;i++){
  const found=await p.evaluate(()=>[...document.querySelectorAll("img")].map(im=>im.srcset?.split(",").pop()?.trim().split(" ")[0]||im.src).filter(u=>u&&u.includes("pinimg.com")));
  found.forEach(u=>urls.add(u.replace(/\/\d+x\d*\//,"/originals/").replace("/236x/","/originals/").replace("/474x/","/originals/")));
  await p.evaluate(()=>window.scrollBy(0,1600)); await wait(1200);
}
writeFileSync("/tmp/pins/urls.txt",[...urls].join("\n"));
console.log("collected", urls.size);
await b.close();
