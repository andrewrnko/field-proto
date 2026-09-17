import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
const BASE="http://127.0.0.1:4825";
const OUT="shots/deep"; mkdirSync(OUT,{recursive:true});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const dark = process.argv.includes("--dark");
const b=await puppeteer.launch({executablePath:"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",headless:"new",userDataDir:`/tmp/gr-deep-${process.pid}`,args:["--no-first-run","--font-render-hinting=none"]});
const p=await b.newPage(); await p.setViewport({width:520,height:1000,deviceScaleFactor:3});
const problems=[];
p.on("pageerror",e=>problems.push("pageerror: "+e.message.slice(0,160)));
p.on("console",m=>{if(m.type()==="error")problems.push("console: "+m.text().slice(0,160))});
await p.evaluateOnNewDocument((t)=>localStorage.setItem("gr-theme",t), dark?"dark":"light");
await p.goto("http://127.0.0.1:4825",{waitUntil:"networkidle0"}); await wait(800);
async function tap(t,{nth=0,settle=850}={}) {
  const h=await p.evaluateHandle((t,n)=>{
    const els=[...document.querySelectorAll("button,[role=tab],[role=button],a,[data-shot]")].filter(el=>el.offsetParent!==null&&!el.closest("[inert]")&&el.getClientRects().length>0);
    const hits=els.filter(el=>{const l=(el.dataset.shot||el.getAttribute("aria-label")||el.textContent||"").trim();return l===t||l.startsWith(t);});
    return hits[n]??null;},t,nth);
  const el=h.asElement(); if(!el) throw new Error("no target: "+t);
  await el.click(); await wait(settle);
}
const sfx = dark?"--dark":"";
const shot=async n=>{const d=await p.$(".screen"); await d.screenshot({path:`${OUT}/${n}${sfx}.png`}); console.log("shot",n);};
const esc=async()=>{await p.keyboard.press("Escape"); await wait(500);};
/* each step starts from a cold open, so one failure cannot poison the next */
const step=async (name, fn)=>{
  await p.goto(BASE, { waitUntil: "networkidle0" });
  await wait(700);
  try { await fn(); } catch(e){ problems.push(`${name}: ${e.message}`); }
};

await step("create", async()=>{ await tap("create"); await shot("01-create"); await tap("Lead"); await shot("02-new-lead"); await esc(); });
await step("deck", async()=>{ await tap("deck"); await shot("03-deck"); await esc(); });
await step("settings", async()=>{ await tap("account"); await shot("04-settings"); await tap("What wakes your phone"); await shot("05-notif-primer"); await esc(); await esc(); });
await step("money", async()=>{ await tap("deck"); await tap("Money"); await wait(300); await tap("Open invoices"); await shot("06-invoices-sheet"); await esc();
  await tap("Estimates with no answer"); await shot("07-waiting-sheet"); await tap("Open", {settle: 1100}); await shot("08-estimate"); await tap("What they see", {settle: 900}); await shot("09-estimate-paper");
  await p.evaluate(()=>[...document.querySelectorAll("button")].find(b=>/^Send to /.test(b.textContent||""))?.click()); await wait(800); await shot("10-send-flow"); await esc(); await esc(); });
await step("inspect", async()=>{ await tap("deck"); await tap("Jobs", {settle: 1000}); await tap("Aimee Duclos", {settle: 900}); await tap("job-actions"); await tap("Log a finding", {settle: 950});
  const stepTitle = () => p.evaluate(()=>document.querySelector(".insp-title h2")?.textContent ?? "");
  const advanceTo = async (want) => {
    for (let i = 0; i < 8 && (await stepTitle()) !== want; i++) await tap("Continue", {settle: 900});
    if ((await stepTitle()) !== want) {
      const why = await p.evaluate(() => ({
        picked: !!document.querySelector(".pick.is-on"),
        cta: [...document.querySelectorAll(".insp-foot button")].map((b) => `${b.textContent}|disabled=${b.disabled}`),
      }));
      throw new Error(`stuck before ${want} (at ${await stepTitle()}) ${JSON.stringify(why)}`);
    }
  };
  const pick = async (label) => {
    for (let i = 0; i < 3; i++) {
      await tap(label, {settle: 500});
      if (await p.evaluate(() => !!document.querySelector(".pick.is-on"))) return;
    }
    throw new Error(`could not select ${label}`);
  };
  await pick("Crawl space"); await advanceTo("How bad");
  await pick("Active rot"); await advanceTo("Photos"); await shot("11-inspect-photos");
  await p.evaluate(()=>{const c=[...document.querySelectorAll(".cap-cell")]; c[0]?.click(); c[2]?.click();}); await wait(500); await tap("Continue"); await shot("12-inspect-review"); await esc(); });
await step("changeorder", async()=>{ await tap("deck"); await tap("Jobs", {settle: 1000}); await tap("Aimee Duclos", {settle: 900}); await tap("job-actions"); await tap("Raise a change order"); await shot("13-change-order"); await tap("Price "); await shot("14-change-order-price"); });

console.log(problems.length?problems.join("\n"):"clean");
await b.close();
