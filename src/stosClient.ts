import fetch from "node-fetch";
import FormData from "form-data";
import { load } from "cheerio";
import { convert as convertToMarkdown } from "@kreuzberg/html-to-markdown-node";

type SubmitOptions = {
  code: string;
  filename?: string;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

export class StosClient {
  baseUrl: string;
  pid: number;
  cid: number;
  username: string;
  password: string;
  phpSession?: string;
  cookieBase: string;
  userAgent: string;

  constructor(cfg: any) {
    this.baseUrl = "https://stos.eti.pg.gda.pl";
    this.pid = Number(cfg.PID || 0);
    this.cid = Number(cfg.CID || 0);
    this.username = String(cfg.LOGIN || "");
    this.password = String(cfg.PASSWORD || "");
    this.cookieBase =
      "lang=en; stos_tabsize=8; stos_ws=false; stos_fontsize=16; stos_font=%22courier%20new%22%2C%20courier; stos_lineheight=1; stos_scheme=stos";
    this.userAgent =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
  }

  private getCookieHeader() {
    let c = this.cookieBase;
    if (this.phpSession) c += `; PHPSESSID=${this.phpSession}`;
    return c;
  }

  async login(): Promise<string> {
    const url = `${this.baseUrl}/index.php?p=login`;
    const body = new URLSearchParams({
      login: this.username,
      password: this.password,
    }).toString();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Cookie: this.cookieBase,
        "User-Agent": this.userAgent,
      },
      body,
      redirect: "manual",
    });

    // Try to read set-cookie header(s)
    // node-fetch exposes raw headers via (res.headers as any).raw()['set-cookie']
    const raw =
      (res.headers as any).raw?.()["set-cookie"] ||
      res.headers.get("set-cookie") ||
      null;
    let cookies: string[] = [];
    if (Array.isArray(raw)) cookies = raw as string[];
    else if (typeof raw === "string") cookies = [raw as string];

    const sessions = [];

    for (const cookieString of cookies) {
      const m = cookieString.match(/PHPSESSID=([^;]+)/);
      if (m) {
        sessions.push(m[1]);
      }
    }

    this.phpSession = sessions.pop();

    if (!this.phpSession) {
      throw new Error("Login failed: PHPSESSID not found in set-cookie");
    }

    return this.phpSession;
  }

  async ensureLoggedIn() {
    if (!this.phpSession) {
      await this.login();
    }
  }

  async getTaskDescription(): Promise<string> {
    await this.ensureLoggedIn();
    const url = `${this.baseUrl}/index.php?p=show&pid=${this.pid}&cid=${this.cid}`;
    const res = await fetch(url, {
      headers: {
        Cookie: this.getCookieHeader(),
        "User-Agent": this.userAgent,
        Accept: "text/html",
      },
    });
    const html = await res.text();
    const $ = load(html);
    const problemHtml = $("#problemtext").html();
    return (
      convertToMarkdown(problemHtml || "").content || "No description available"
    );
  }

  async getStatus(): Promise<{
    status: "processing" | "unknown" | "processed";
    details?: string;
  }> {
    await this.ensureLoggedIn();
    const url = `${this.baseUrl}/index.php?p=status&pid=${this.pid}&cid=${this.cid}`;
    const res = await fetch(url, {
      headers: { Cookie: this.getCookieHeader(), "User-Agent": this.userAgent },
    });
    const html = await res.text();
    const $ = load(html);
    const resultText = $("#result").text().trim();
    if (resultText === "Your submission is queued and awaits processing.") {
      return { status: "processing", details: resultText };
    }
    const content = $("#content").html()?.trim();
    const result = convertToMarkdown(content || "").content || resultText;
    if (result) {
      return { status: "processed", details: result };
    }
    return { status: "unknown", details: html.trim() };
  }

  async fetchSubmitToken(): Promise<{ token?: string; userid?: string }> {
    await this.ensureLoggedIn();
    const url = `${this.baseUrl}/index.php?p=submit&pid=${this.pid}&cid=${this.cid}`;
    const res = await fetch(url, {
      headers: {
        Cookie: this.getCookieHeader(),
        "User-Agent": this.userAgent,
        Accept: "text/html",
      },
    });
    const html = await res.text();
    const $ = load(html);
    let token =
      $("input[name=token]").attr("value") || $("input#token").attr("value");
    const userid = $("input[name=userid]").attr("value");
    if (!token) {
      // Fallback: token may be embedded in JS as {"token": "..."}
      const m = html.match(/["']token["']\s*:\s*["']([0-9a-fA-F\-]{8,})["']/i);
      if (m) token = m[1];
    }
    return { token, userid };
  }

  async submitSolution(opts: SubmitOptions): Promise<{
    verdict: string;
    details?: string;
  }> {
    const { code, pollIntervalMs = 2000, timeoutMs = 120000 } = opts;
    await this.ensureLoggedIn();

    const submitInfo = await this.fetchSubmitToken();
    const url = `${this.baseUrl}/index.php?p=put`;

    const filename = opts.filename || "main.cpp";
    const file = new Blob([code], { type: "application/octet-stream" });

    const form = new FormData();
    form.append("pid", String(this.pid));
    form.append("cid", String(this.cid));
    if (submitInfo.token) form.append("token", String(submitInfo.token));
    // uncomment if userid is required, but seems optional based on testing
    // if (submitInfo.userid) params["userid"] = String(submitInfo.userid);

    form.append("mainfile", filename);
    form.append("filedata", Buffer.from(await file.arrayBuffer()), {
      filename: "filedata",
      contentType: file.type,
    });
    form.append("edit0", `0,${file.size},${filename}`);

    const headers = {
      ...form.getHeaders(),
      Cookie: this.getCookieHeader(),
      "X-Requested-With": "XMLHttpRequest",
      "User-Agent": this.userAgent,
    } as any;

    const submit = await fetch(url, {
      method: "POST",
      headers,
      body: form,
      redirect: "manual",
    });

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await this.getStatus();

      if (status.status !== "processing") {
        return { verdict: status.status, details: status.details };
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return { verdict: "timeout", details: "timed out waiting for verdict" };
  }
}

export default StosClient;
