import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const OUT="shots/resp"; mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:`/tmp/gr-resp-${process.pid}`,args:["--no-first-run","--font-render-hinting=none"]});
const problems=[];
for (const w of [375, 390, 430]) {
  const p=await b.newPage();
  await p.setViewport({width:w,height:812,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  p.on("pageerror",e=>problems.push(`${w}: pageerror ${e.message.slice(0,120)}`));
  p.on("console",m=>{if(m.type()==="error")problems.push(`${w}: console ${m.text().slice(0,120)}`)});
  await p.goto("http://127.0.0.1:4825",{waitUntil:"networkidle0"});
  await wait(700);
  for (const [name, label] of [["Today","today"],["Jobs","jobs"],["Schedule","schedule"],["Money","money"],["Inbox","inbox"]]) {
    const h=await p.evaluateHandle((t)=>{const els=[...document.querySelectorAll("button")].filter(e=>e.offsetParent!==null&&!e.closest("[inert]"));return els.find(e=>(e.textContent||"").trim().startsWith(t))??null;},name);
    const el=h.asElement(); if(el){await el.click(); await wait(500);}
    await p.screenshot({path:`${OUT}/${label}-${w}.png`});
    // overflow check
    const over = await p.evaluate(() => {
      const bad = [];
      const root = document.querySelector(".screen");
      if (!root) return bad;
      const rw = root.getBoundingClientRect().width;
      for (const el of root.querySelectorAll("*")) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 && (r.right > rw + 1.5 || r.left < -1.5)) {
          if (el.closest(".hscroll,.rec-strip,.tl-scroll,.chip-row,[data-allow-overflow]")) continue;
          bad.push(`${el.className || el.tagName} right=${r.right.toFixed(0)} vs ${rw}`);
        }
      }
      return bad.slice(0, 4);
    });
    if (over.length) problems.push(`${w} ${label}: ${over.join(" | ")}`);
  }
  await p.close();
}
await b.close();
console.log(problems.length ? problems.join("\n") : "no overflow, no console errors at 375/390/430");
