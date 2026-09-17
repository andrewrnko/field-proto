import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const OUT = "shots/flow"; mkdirSync(OUT, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:"/tmp/gr-flow",args:["--no-first-run","--font-render-hinting=none"]});
const p = await b.newPage();
await p.setViewport({width:520,height:1000,deviceScaleFactor:3});
const problems=[];
p.on("console",m=>{if(m.type()==="error")problems.push("console: "+m.text().slice(0,200));});
p.on("pageerror",e=>problems.push("pageerror: "+e.message.slice(0,200)));
await p.goto("http://127.0.0.1:4825",{waitUntil:"networkidle0"});
await wait(700);

async function tap(text,{nth=0,settle=650}={}) {
  const h = await p.evaluateHandle((t,n)=>{
    const els=[...document.querySelectorAll("button,[role=tab],[role=button],a,[data-shot]")].filter(el=>el.offsetParent!==null&&!el.closest("[inert]")&&el.getClientRects().length>0);
    const hits=els.filter(el=>{const l=(el.dataset.shot||el.getAttribute("aria-label")||el.textContent||"").trim();return l===t||l.startsWith(t);});
    return hits[n]??null;},text,nth);
  const el=h.asElement(); if(!el) throw new Error("no target: "+text);
  await el.click(); await wait(settle);
}
const shot = async n => { const d = await p.$(".screen"); await d.screenshot({path:`${OUT}/${n}.png`}); console.log("shot",n); };

try {
  await tap("deck"); await tap("Jobs"); await wait(400);
  await tap("Aimee Duclos"); await shot("01-job-record");
  await tap("deck"); await tap("Money"); await shot("02-job-money-sheet");
  await p.keyboard.press("Escape"); await wait(500);
  await tap("All "); await shot("03-findings-sheet");
  await p.keyboard.press("Escape"); await wait(500);
  await tap("job-actions"); await shot("04-job-actions");
  await tap("Log a finding"); await shot("05-inspect-where");
  await tap("Crawl space"); await tap("Continue"); await shot("06-inspect-severity");
  await tap("Active rot"); await tap("Continue"); await shot("07-inspect-moisture");
  await tap("Skip moisture"); await tap("Continue"); await shot("08-inspect-photos");
} catch(e){ problems.push("flow: "+e.message); }
console.log(problems.length?problems.join("\n"):"clean");
await b.close();
