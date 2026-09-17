/**
 * Bake a small map for every property.
 *
 * Tiles come from OpenStreetMap once, at build time, and are composited into a
 * single image per property that ships with the app — so the prototype has real
 * maps without a key, without a runtime dependency, and without hammering a
 * community tile server every time a sheet opens.
 *
 *   node scripts/maps.mjs          # only the ones that are missing
 *   node scripts/maps.mjs --force  # rebuild all
 */
import { mkdirSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const OUT = "public/maps";
mkdirSync(OUT, { recursive: true });
const force = process.argv.includes("--force");

/* pull the coordinates straight out of the fixtures */
const seed = readFileSync("src/data/seed.ts", "utf8");
const block = seed.match(/const properties: Property\[\] = \[([\s\S]*?)\n\];/)[1];
const props = [...block.matchAll(/id: "(pr\d+)"[\s\S]*?lat: (-?[\d.]+), lng: (-?[\d.]+)/g)]
  .map((m) => ({ id: m[1], lat: Number(m[2]), lng: Number(m[3]) }));

const Z = 15;
const lon2x = (lon, z) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat, z) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

const tile = async (z, x, y) => {
  const cache = join("/tmp/osm-tiles", `${z}-${x}-${y}.png`);
  mkdirSync("/tmp/osm-tiles", { recursive: true });
  if (!existsSync(cache)) {
    const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
      headers: { "User-Agent": "gotrot-field-prototype/1.0 (local prototype, one-off bake)" },
    });
    if (!res.ok) throw new Error(`tile ${z}/${x}/${y}: ${res.status}`);
    writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
    await new Promise((r) => setTimeout(r, 120)); // be polite
  }
  return cache;
};

let made = 0;
for (const p of props) {
  const out = join(OUT, `${p.id}.jpg`);
  if (existsSync(out) && !force) continue;

  const fx = lon2x(p.lng, Z), fy = lat2y(p.lat, Z);
  const x0 = Math.floor(fx) - 1, y0 = Math.floor(fy) - 1;
  const paths = [];
  for (let dy = 0; dy < 3; dy++) {
    for (let dx = 0; dx < 3; dx++) paths.push(await tile(Z, x0 + dx, y0 + dy));
  }
  /* 3x3 tiles = 768px, then crop 640x420 centred on the exact point */
  const px = Math.round((fx - x0) * 256), py = Math.round((fy - y0) * 256);
  const cropX = Math.max(0, Math.min(768 - 640, px - 320));
  const cropY = Math.max(0, Math.min(768 - 420, py - 210));
  /* rows first, then stack them — montage wants a font it does not have */
  for (let r = 0; r < 3; r++) {
    execFileSync("convert", [...paths.slice(r * 3, r * 3 + 3), "+append", `/tmp/osm-row${r}.png`]);
  }
  execFileSync("convert", ["/tmp/osm-row0.png", "/tmp/osm-row1.png", "/tmp/osm-row2.png", "-append", "/tmp/osm-merge.png"]);
  execFileSync("convert", [
    "/tmp/osm-merge.png",
    "-crop", `640x420+${cropX}+${cropY}`, "+repage",
    "-modulate", "100,88,100",            // calm the saturation to match the app
    "-quality", "82", out,
  ]);
  made++;
  process.stdout.write(`.`);
}
console.log(`\n${made} maps baked, ${props.length} properties total`);
