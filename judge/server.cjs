const http = require("http");
const { spawn } = require("child_process");

const runtime = {
  language: "javascript",
  version: process.version.replace(/^v/, ""),
  aliases: ["node", "js"],
};

function send(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        req.destroy();
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function execute(content) {
  return new Promise((resolve) => {
    const child = spawn("node", ["--input-type=commonjs", "--eval", content], {
      timeout: 5000,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("error", (error) => {
      stderr += error.message;
    });
    child.on("close", (code, signal) => {
      resolve({
        stdout,
        stderr,
        code,
        signal,
      });
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/api/v2/runtimes") {
    return send(res, 200, [runtime]);
  }

  if (req.method === "POST" && req.url === "/api/v2/execute") {
    try {
      const payload = await readJson(req);
      const language = String(payload.language || "").toLowerCase();
      const file = Array.isArray(payload.files) ? payload.files[0] : null;

      if (!["javascript", "js", "node"].includes(language)) {
        return send(res, 400, { message: "Only javascript is supported by the local judge" });
      }
      if (!file?.content) {
        return send(res, 400, { message: "Missing file content" });
      }

      const run = await execute(file.content);
      return send(res, 200, {
        language: runtime.language,
        version: runtime.version,
        run,
        compile: null,
      });
    } catch (error) {
      return send(res, 400, { message: error.message });
    }
  }

  return send(res, 404, { message: "Not found" });
});

server.listen(2000, "0.0.0.0", () => {
  console.log("Local JavaScript judge listening on http://0.0.0.0:2000");
});
