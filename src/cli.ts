import { createConnection, createServer, type Socket } from "node:net";

class Parser {
  private clientSocket: Socket | null = null;
  private chunk: string = "";
  private method = "";
  private path = "";
  private version = "";
  private RequestHeaders: Record<string, string> = {};
  private body = "";
  private contentLength = 0;

  private host: URL | null = null;
  private _connection: Socket | null = null;

  constructor({ clientSocket }: { clientSocket: Socket }) {
    this.clientSocket = clientSocket;
  }

  private get targetConnection() {
    if (!this._connection) {
      this._connection = createConnection({
        host: this.host?.hostname ?? "",
        port: this.host?.port ? parseInt(this.host.port, 10) : 80,
      });

      this._connection.addListener("data", (data) => {
        console.log("服务端返回数据", data);
      });
    }
    return this._connection;
  }

  public appendChunk(data: string): void {
    this.chunk += data;

    this.parse();
  }

  private parse(): void {
    const lines = this.chunk.split("\r\n");
    const divider = lines.indexOf("");

    const [header, body] = [lines.slice(0, divider), lines.slice(divider + 1)];

    // Parse request line
    const firstLine = header[0];
    const [method, path, version] = firstLine.split(" ");
    this.method = method;
    this.path = path;
    this.version = version;

    // Parse headers
    header.splice(1).forEach((line) => {
      const [key, value] = line.split(": ");
      this.RequestHeaders[key] = value;
    });

    // 获取重要参数
    this.contentLength = parseInt(this.RequestHeaders["Content-Length"], 10);

    // Parse body
    this.body = body.join("\r\n");

    // 获取业务参数
    this.host = new URL(this.path);

    console.log({
      method: this.method,
      path: this.path,
      version: this.version,
      RequestHeaders: this.RequestHeaders,
      body: this.body,
      contentLength: this.contentLength,
    });

    console.log("host", this.host);

    if (divider) {
      this.targetConnection.write(this.chunk);
    }
  }
}

const server = createServer((socket) => {
  const parser = new Parser({ clientSocket: socket });
  socket.on("data", (data) => {
    parser.appendChunk(data.toString());
  });

  socket.on("end", () => {
    console.log("Client disconnected");
  });

  socket.on("error", (err) => {
    console.error("Socket error:", err);
  });
});

server.listen(6677).addListener("listening", () => {
  console.log("Server is listening on port 6677");
});
