app.post("/api/json", express.json({ limit: "2mb" }), async (req, res) => {
  try {
    const nombre = (req.query.n || "datos") + ".json";
    const buf = Buffer.from(JSON.stringify(req.body, null, 2));
    const fd = new FormData();
    fd.append("chat_id", process.env.TG_CHAT);
    fd.append("document", new Blob([buf], { type: "application/json" }), nombre);
    console.log("JSON", buf.length);
    const r = await fetch(tg("sendDocument"), { method: "POST", body: fd });
    const j = await r.json();
    if (!j.ok) throw new Error(j.description);
    res.send("ok");
  } catch (e) {
    console.log("ERR json", e.message);
    res.status(500).send("e:" + e.message);
  }
});

app.post("/api/beacon", express.text({ type: "*/*", limit: "1mb" }), async (req, res) => {
  try {
    const t = "SALIDA " + (req.body || "").slice(0, 3000);
    await fetch(tg("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.TG_CHAT, text: t })
    });
    res.send("ok");
  } catch (e) {
    res.status(500).send("e:" + e.message);
  }
});
