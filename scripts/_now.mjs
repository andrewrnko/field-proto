import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const OUT="shots/now"; mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const dark=process.argv.includes("--dark");
const sfx=dark?"--dark":"";
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:`/tmp/gr-now-${process.pid}`,args:["--no-first-run","--font-render-hinting=none"]});
const problems=[];

async function open(lens) {
  const p = await b.newPage();
  await p.setViewport({width:520,height:1000,deviceScaleFactor:3});
  p.on("pageerror",e=>problems.push(`${lens}: pageerror ${e.message.slice(0,150)}`));
  p.on("console",m=>{if(m.type()==="error")problems.push(`${lens}: console ${m.text().slice(0,150)}`)});
  await p.evaluateOnNewDocument((t,l)=>{localStorage.setItem("gr-theme",t);localStorage.setItem("gr-lens",l)}, dark?"dark":"light", lens);
  await p.goto("http://127.0.0.1:4825",{waitUntil:"networkidle0"});
  await wait(900);
  return p;
}
const shot=async(p,n)=>{const d=await p.$(".screen"); await d.screenshot({path:`${OUT}/${n}${sfx}.png`}); console.log("shot",n)};
async function tap(p,t,{nth=0,settle=700}={}) {
  const h=await p.evaluateHandle((t,n)=>{
    const els=[...document.querySelectorAll("button,[role=tab],[role=button],a,[data-shot]")].filter(el=>el.offsetParent!==null&&!el.closest("[inert]")&&el.getClientRects().length>0);
    const hits=els.filter(el=>{const l=(el.dataset.shot||el.getAttribute("aria-label")||el.textContent||"").trim();return l===t||l.startsWith(t);});
    return hits[n]??null;},t,nth);
  const el=h.asElement(); if(!el) throw new Error("no target: "+t);
  await el.click(); await wait(settle);
}
const esc=async(p)=>{await p.keyboard.press("Escape"); await wait(900)};
const step=async(n,f)=>{try{await f()}catch(e){problems.push(`${n}: ${e.message}`)}};

const owner = await open("owner");
await shot(owner,"01-now-owner");
await step("deck", async()=>{ await tap(owner,"deck"); await shot(owner,"02-deck"); await esc(owner); });
await step("command", async()=>{ await tap(owner,"command"); await shot(owner,"03-command"); await owner.type(".cmd-field input","jamal"); await wait(700); await shot(owner,"04-command-hits"); await esc(owner); });
await step("create", async()=>{ await tap(owner,"create"); await shot(owner,"05-create"); await tap(owner,"Lead"); await shot(owner,"06-create-lead"); await esc(owner); });
await step("descend", async()=>{
  await tap(owner,"deck"); await tap(owner,"People",{settle:1000}); await shot(owner,"10-people");
  await tap(owner,"person-p3",{settle:1000}); await shot(owner,"11-person");
});
await owner.close();

for (const [lens, name] of [["crew","07-now-crew"],["media","08-now-media"],["estimator","09-now-estimator"],["coordinator","12-now-coordinator"]]) {
  const p = await open(lens);
  await shot(p,name);
  if (lens === "media") { await step("media", async()=>{ await tap(p,"deck"); await tap(p,"Media"); await shot(p,"13-media"); }); }
  await p.close();
}
console.log(problems.length?problems.join("\n"):"clean");
await b.close();
