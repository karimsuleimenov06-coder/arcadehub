import puppeteer from "puppeteer-core";

const BASE = "https://arcadehub-dun.vercel.app";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ROOM_RE = /[A-HJ-NP-Z2-9]{6}/;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function switchToOnline(page) {
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = await page.evaluate((el) => el.textContent, b);
    if (t && t.includes("Онлайн")) {
      await b.click();
      return;
    }
  }
  throw new Error("no online button");
}

async function clickByText(page, text) {
  const btns = await page.$$("button");
  for (const b of btns) {
    const t = await page.evaluate((el) => el.textContent, b);
    if (t && t.trim().includes(text)) {
      await b.click();
      return true;
    }
  }
  return false;
}

async function createRoom(page) {
  await clickByText(page, "Создать комнату");
  for (let i = 0; i < 20; i++) {
    await sleep(800);
    const txt = await page.evaluate(() => document.body.innerText);
    const m = txt.match(ROOM_RE);
    if (m && (txt.includes("Ожидание противника") || txt.includes("Код комнаты"))) {
      return m[0];
    }
  }
  throw new Error("room code not found");
}

async function joinRoom(page, code) {
  await page.evaluate((c) => {
    const input = document.querySelector("input");
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(input, c);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, code);
  await sleep(300);
  await clickByText(page, "Войти");
}

async function waitPlaying(page, label) {
  for (let i = 0; i < 25; i++) {
    await sleep(1000);
    const txt = await page.evaluate(() => document.body.innerText);
    if (txt.includes("Противник") || txt.includes("vs") || txt.includes("Игрок 1")) {
      return true;
    }
  }
  throw new Error(label + " did not reach playing state");
}

async function testGame(name, run) {
  console.log(`\n===== ${name} =====`);
  try {
    await run();
    console.log(`PASS ${name}`);
  } catch (e) {
    console.log(`FAIL ${name}:`, e.message);
  }
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-gpu", "--window-size=900,800"],
  });

  // ---- TIC TAC TOE ----
  await testGame("TicTacToe", async () => {
    const a = await browser.newPage();
    const b = await browser.newPage();
    await a.goto(BASE + "/game/tictactoe", { waitUntil: "domcontentloaded" });
    await b.goto(BASE + "/game/tictactoe", { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await switchToOnline(a);
    await switchToOnline(b);
    const code = await createRoom(a);
    await joinRoom(b, code);
    await waitPlaying(a, "P1");
    await sleep(1500);
    // P1 clicks cell 0
    await clickByText(a, "Создать комнату").catch(() => {});
    const cellsA = await a.$$("div.grid.grid-cols-3 button");
    if (!cellsA.length) throw new Error("no tictactoe cells");
    await cellsA[0].click();
    await sleep(2500);
    const aText = await a.evaluate(() => document.body.innerText);
    const bText = await b.evaluate(() => document.body.innerText);
    if (!aText.includes("X") && !aText.includes("❌")) throw new Error("P1 board missing X");
    await sleep(2000);
    const bText2 = await b.evaluate(() => document.body.innerText);
    if (!bText2.includes("X") && !bText2.includes("❌")) throw new Error("P2 did not see X");
    console.log("  P1 board has X; P2 sees it");
    await a.close(); await b.close();
  });

  // ---- POKER ----
  await testGame("Poker", async () => {
    const a = await browser.newPage();
    const b = await browser.newPage();
    await a.goto(BASE + "/game/poker", { waitUntil: "domcontentloaded" });
    await b.goto(BASE + "/game/poker", { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await switchToOnline(a);
    await switchToOnline(b);
    const code = await createRoom(a);
    await joinRoom(b, code);
    await waitPlaying(a, "P1");
    await sleep(2000);
    // both players call until flop
    for (let step = 0; step < 3; step++) {
      const clicked = await clickByText(a, "Колл").catch(() => false);
      await sleep(2500);
      const txt = await a.evaluate(() => document.body.innerText);
      if (txt.includes("Флоп") || txt.includes("Flop") || txt.includes("Turn") || txt.includes("River")) {
        console.log("  flop/turn reached on P1");
        break;
      }
      if (!clicked) { throw new Error("could not click Колл"); }
    }
    const bText = await b.evaluate(() => document.body.innerText);
    if (!bText.includes("Флоп") && !bText.includes("Turn") && !bText.includes("River")) {
      console.log("  WARN: P2 screen text unknown:", bText.slice(0, 120).replace(/\n/g, " | "));
    } else {
      console.log("  P2 shows flop/turn too");
    }
    await a.close(); await b.close();
  });

  // ---- PONG ----
  await testGame("Pong", async () => {
    const a = await browser.newPage();
    const b = await browser.newPage();
    await a.goto(BASE + "/game/pong", { waitUntil: "domcontentloaded" });
    await b.goto(BASE + "/game/pong", { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await switchToOnline(a);
    await switchToOnline(b);
    const code = await createRoom(a);
    await joinRoom(b, code);
    await waitPlaying(a, "P1");
    await sleep(5000); // allow MQTT connect + ball to start
    const shot = async (page) => {
      const el = await page.$("canvas");
      const clip = await el.boundingBox();
      return page.screenshot({ clip });
    };
    const s1 = await shot(a);
    await sleep(800);
    const s2 = await shot(a);
    const diff = Buffer.compare(s1, s2);
    console.log("  P1 canvas frames differ:", diff !== 0);
    if (diff === 0) throw new Error("P1 ball not moving");
    const s3 = await shot(b);
    await sleep(800);
    const s4 = await shot(b);
    const diff2 = Buffer.compare(s3, s4);
    console.log("  P2 canvas frames differ:", diff2 !== 0);
    if (diff2 === 0) throw new Error("P2 ball not moving");
    await a.close(); await b.close();
  });

  // ---- SNAKE ----
  await testGame("Snake", async () => {
    const a = await browser.newPage();
    const b = await browser.newPage();
    await a.goto(BASE + "/game/snake", { waitUntil: "domcontentloaded" });
    await b.goto(BASE + "/game/snake", { waitUntil: "domcontentloaded" });
    await sleep(1500);
    await switchToOnline(a);
    await switchToOnline(b);
    const code = await createRoom(a);
    await joinRoom(b, code);
    await waitPlaying(a, "P1");
    await sleep(5000); // MQTT + tick
    const gridSnap = async (page) =>
      page.evaluate(() => {
        const cells = [...document.querySelectorAll("div[style]")].filter(
          (d) => d.style.background && d.style.background.includes("rgb")
        );
        return cells.slice(0, 30).map((c) => c.style.background);
      });
    const g1 = await gridSnap(a);
    await sleep(1200);
    const g2 = await gridSnap(a);
    console.log("  P1 grid changed:", JSON.stringify(g1) !== JSON.stringify(g2));
    if (JSON.stringify(g1) === JSON.stringify(g2)) throw new Error("snake not moving");
    const bText = await b.evaluate(() => document.body.innerText);
    if (!bText.includes("vs")) throw new Error("P2 not in game");
    console.log("  P2 shows game header (vs)");
    await a.close(); await b.close();
  });

  await browser.close();
  console.log("\nDONE");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
