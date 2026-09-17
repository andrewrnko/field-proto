import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const OUT="shots/ops"; mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:`/tmp/gr-ops-${process.pid}`,args:["--no-first-run","--font-render-hinting=none"]});
const p=await b.newPage(); await p.setViewport({width:520,height:1000,deviceScaleFactor:3});
const problems=[]; p.on("pageerror",e=>problems.push("pageerror: "+e.message.slice(0,140)));
p.on("console",m=>{if(m.type()==="error")problems.push("console: "+m.text().slice(0,140))});
await p.goto("http://127.0.0.1:4825",{waitUntil:"networkidle0"}); await wait(800);
async function tap(t,{nth=0,settle=650}={}) {
  const h=await p.evaluateHandle((t,n)=>{
    const els=[...document.querySelectorAll("button,[role=tab],[role=button],a,[data-shot]")].filter(el=>el.offsetParent!==null&&!el.closest("[inert]")&&el.getClientRects().length>0);
    const hits=els.filter(el=>{const l=(el.dataset.shot||el.getAttribute("aria-label")||el.textContent||"").trim();return l===t||l.startsWith(t);});
    return hits[n]??null;},t,nth);
  const el=h.asElement(); if(!el) throw new Error("no target: "+t);
  await el.click(); await wait(settle);
}
const shot=async n=>{const d=await p.$(".screen"); await d.screenshot({path:`${OUT}/${n}.png`}); console.log("shot",n);};
const scrollTo=async(sel)=>{await p.evaluate((s)=>{const el=document.querySelector(s); el?.scrollIntoView({block:"center"});},sel); await wait(400);};
try {
  await tap("deck"); await tap("Jobs"); await wait(300);
  await tap("Aimee Duclos"); await wait(500);
  await scrollTo(".burn"); await shot("01-cost");
  await tap("Where the hours went", {settle: 200}).catch(()=>{});
  await p.evaluate(()=>document.querySelector(".burn")?.click()); await wait(700); await shot("02-labour-sheet");
  await p.keyboard.press("Escape"); await wait(500);
  await scrollTo(".mat-row"); await shot("03-materials");
  await p.evaluate(()=>document.querySelector(".mat-row")?.click()); await wait(700); await shot("04-material-sheet");
} catch(e){ problems.push("flow: "+e.message); }
console.log(problems.length?problems.join("\n"):"clean");
await b.close();
