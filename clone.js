async function(bot, ctx, url, fetch, archiver, JSDOM, fs) {
  await ctx.reply("⏳ Sedang mengambil data website...");

  try {
    const response = await fetch(url);
    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const domain = new URL(url).hostname.replace("www.", "");
    const zipPath = `${domain}_${Date.now()}.zip`;

    const output = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.pipe(output);
    archive.append(html, { name: "index.html" });

    // Ambil CSS
    const links = [...document.querySelectorAll("link[rel='stylesheet']")];
    for (let link of links) {
      try {
        let href = new URL(link.href, url).href;
        const cssResp = await fetch(href);
        const css = await cssResp.text();
        archive.append(css, { name: "assets/" + href.split("/").pop() });
      } catch {}
    }

    // Ambil JS
    const scripts = [...document.querySelectorAll("script[src]")];
    for (let script of scripts) {
      try {
        let src = new URL(script.src, url).href;
        const jsResp = await fetch(src);
        const js = await jsResp.text();
        archive.append(js, { name: "assets/" + src.split("/").pop() });
      } catch {}
    }

    await archive.finalize();

    output.on("close", async () => {
      await ctx.reply(
        `✅ Ini file web-nya ya\n` +
        ` bagus ya\n\n` +
        `🌐 URL Asli: ${url}`
      );

      await ctx.replyWithDocument({
        source: zipPath,
        filename: `${domain}.zip`,
      });

      fs.unlinkSync(zipPath);
    });
  } catch (err) {
    ctx.reply("❌ Gagal clone: " + err.message);
  }
}
