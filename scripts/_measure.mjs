import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"/tmp/gr-measure",args:["--no-first-run"]});
const p = await b.newPage();
await p.setViewport({width:520,height:1000,deviceScaleFactor:2});
await p.goto("http://127.0.0.1:4825",{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,800));
const out = await p.evaluate(() => {
  const sel = [".screen",".nav-host",".screen-view",".screen-scroll",".stack.gap-2",".attn",".attn-head",".attn-reason",".attn-foot"];
  return sel.map(s => { const el = document.querySelector(s); return el ? `${s}: w=${el.getBoundingClientRect().width.toFixed(1)} sw=${el.scrollWidth}` : `${s}: none`; });
});
console.log(out.join("\n"));
await b.close();
