import sharp from "sharp";
import { readdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DIR = "public/images/home/services";

const files = (await readdir(DIR)).filter(f => /\.(jpe?g|png)$/i.test(f));

for (const f of files) {
  const src = path.join(DIR, f);
  const input = await readFile(src);          // handle turant band

  const out = await sharp(input)
    .resize(800, 450, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();

  await writeFile(src, out);                   // ab lock nahi hai
  console.log(f, Math.round(input.length / 1024) + " KB", "→", Math.round(out.length / 1024) + " KB");
}