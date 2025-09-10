import { listen, send, connect, disconnect } from "@kuyoonjo/tauri-plugin-tcp";
import { UnlistenFn } from "@tauri-apps/api/event";
//@ts-ignore Ignore test in git action
import { mmc } from "~/components/proto/mmc.js";
import { Buffer } from "buffer";

enum ConnectionState {
  Connect = "Connect",
  Disconnect = "Disconnect",
}

interface IServerHandler {
  connect(ip: string, port: string): Promise<void | never>;
  disconnect(clientId: string): void;
  clearError(lindId: number, driverId?: number): void;
  getSystemInfo(lineId: number): Promise<mmc.info.Response.ISystem | never>;
  getLineConfig(): Promise<mmc.core.Response.ILineConfig | never>;
  getServerName(): Promise<string | null>;
}

export class ServerHandler implements IServerHandler {
  private _ipAddress: {
    ip: string;
    port: string;
    clientId: string;
  } = {
    ip: "",
    port: "",
    clientId: crypto.randomUUID(),
  };

  private _connectionState: ConnectionState = ConnectionState.Disconnect;

  private _lockRequest: boolean = false;
  private lock() {
    this._lockRequest = true;
  }
  private unlock() {
    this._lockRequest = false;
  }

  private serverResponses: Map<string, mmc.IResponse> = new Map();
  private _requestId: string | null = null;

  private _unlisten: null | UnlistenFn = null;

  private _clearErrorQueue: number[] = [];

  private _isQueueEmpty: boolean = this._clearErrorQueue.length === 0;

  private async listener(): Promise<UnlistenFn> {
    return await listen(async (x) => {
      if (
        x.payload.id === this._ipAddress.clientId &&
        x.payload.event.message &&
        x.payload.event.message.data
      ) {
        const msg = Buffer.from(x.payload.event.message!.data);
        const decode = mmc.Response.decode(msg);
        if (decode) {
          if (this._requestId) {
            this.serverResponses.set(this._requestId, decode);
            this.unlock();
          }
        }
      }
    });
  }

  async connect(ip: string, port: string): Promise<void | never> {
    if (this._connectionState === ConnectionState.Connect) {
      throw new Error("The server is connected.");
    }

    const clientId = this._ipAddress.clientId;
    try {
      await connect(clientId, `${ip}:${port}`);
      this._unlisten = await this.listener();
      this._ipAddress.ip = ip;
      this._ipAddress.port = port;
      this._connectionState = ConnectionState.Connect;
    } catch (e) {
      if (e) {
        throw new Error(e as string);
      }
    }
    return;
  }

  async disconnect(): Promise<void | never> {
    if (this._connectionState === ConnectionState.Disconnect) {
      throw new Error("The server is disconnected.");
    }
    try {
      if (this._unlisten) {
        this._unlisten();
        this._unlisten = null;
      }
      await disconnect(this._ipAddress.clientId);
      this.serverResponses = new Map();
      this._ipAddress.clientId = crypto.randomUUID();
      this._requestId = null;
      this._connectionState = ConnectionState.Disconnect;
      this.unlock();
      return;
    } catch (e) {
      if (e) {
        throw new Error(e as string);
      }
    }
  }

  async clearError(lineId: number): Promise<void | never> {
    if (this._isQueueEmpty) {
      try {
        this._clearErrorQueue.push(lineId);
        const commandId = await this.requestClearError(lineId);
        if (!commandId) throw new Error("The response is invalid");

        await this.getCommandInfo(commandId);
        const response = await this.requestClearCommand(commandId);
        if (
          response ===
          mmc.command.Response.CommandOperationStatus.COMMAND_STATUS_COMPLETED
        ) {
          this._clearErrorQueue = [];
          return;
        } else {
          this._clearErrorQueue = [];
          throw new Error("Clear command error");
        }
      } catch {
        this._clearErrorQueue = [];
      }
    }
  }

  private async requestClearError(lineId: number): Promise<number | never> {
    if (!this._isQueueEmpty) throw new Error("Error queue is not empty");
    const payload: mmc.IRequest = {
      command: {
        clearErrors: {
          lineId: lineId,
        },
      },
    };
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

    await this.sendRequest(this._ipAddress.clientId, payload);
    await this.waitResponse();

    if (this.serverResponses.has(requestId)) {
      const serverResponse = this.serverResponses.get(requestId)!;
      this.serverResponses.delete(requestId);
      if (serverResponse.command && serverResponse.command.commandId) {
        return serverResponse.command.commandId;
      } else {
        throw new Error("Command Error");
      }
    }
    throw new Error("Command Error");
  }

  private async getCommandInfo(commandId: number): Promise<void> {
    if (this._isQueueEmpty || this._lockRequest) return;
    const commandInfo = await this.requestCommandInfo(commandId);
    const commandStatus = commandInfo[0].status;
    if (
      commandStatus ===
      mmc.info.Response.Commands.Command.Status.STATUS_COMPLETED
    ) {
      return;
    } else {
      this.delay(1);
      return await this.getCommandInfo(commandId);
    }
  }

  private async requestCommandInfo(commandId: number) {
    if (!this._isQueueEmpty) throw new Error("Error queue is not empty");
    const requestId = crypto.randomUUID();
    this._requestId = requestId;
    const payload = {
      info: {
        command: { id: commandId },
      },
    };
    await this.sendRequest(this._ipAddress.clientId, payload);
    await this.waitResponse();

    if (this.serverResponses.has(requestId)) {
      const response = this.serverResponses.get(requestId);
      this.serverResponses.delete(requestId);
      if (
        response &&
        response.info &&
        response.info.commands &&
        response.info.commands.commands
      ) {
        return response.info.commands.commands;
      } else {
        throw new Error("Commnad operation not available");
      }
    }
    if (ConnectionState.Disconnect === this._connectionState)
      throw new Error("The server is disconnected.");
    throw new Error("Commnad operation not available");
  }

  private async requestClearCommand(
    commandId: number,
  ): Promise<mmc.command.Response.CommandOperationStatus | never> {
    if (!this._isQueueEmpty) throw new Error("Error queue is not empty");
    const payload = {
      command: {
        clearCommand: {
          commandId: commandId,
        },
      },
    };
    const requestId = crypto.randomUUID();
    this._requestId = requestId;
    await this.sendRequest(this._ipAddress.clientId, payload);
    await this.waitResponse();

    if (this.serverResponses.has(requestId)) {
      const response = this.serverResponses.get(requestId);
      this.serverResponses.delete(requestId);
      if (response && response.command && response.command.commandOperation) {
        const commandOperation = response.command.commandOperation;
        return commandOperation;
      } else {
        if (ConnectionState.Disconnect === this._connectionState)
          throw new Error("The server is disconnected.");
        throw new Error("Commnad operation not available");
      }
    }
    throw new Error("No response.");
  }

  async getLineConfig(): Promise<mmc.core.Response.ILineConfig | never> {
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

    const payload: mmc.IRequest = {
      core: {
        kind: mmc.core.Request.Kind.CORE_REQUEST_KIND_LINE_CONFIG,
      },
    };
    await this.sendRequest(this._ipAddress.clientId, payload);
    await this.waitResponse();

    if (this.serverResponses.has(requestId)) {
      const serverResponse = this.serverResponses.get(requestId)!;
      this.serverResponses.delete(requestId);
      if (serverResponse.core && serverResponse.core.lineConfig) {
        return serverResponse.core.lineConfig;
      } else {
        if (ConnectionState.Disconnect === this._connectionState)
          throw new Error("The server is disconnected.");
        throw new Error("No Response");
      }
    } else {
      throw new Error("No Response");
    }
  }

  async getSystemInfo(
    lineId: number,
  ): Promise<mmc.info.Response.ISystem | never> {
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

    const payload = {
      info: {
        system: {
          lineId: lineId,
          driver: true,
          axis: true,
          carrier: true,
        },
      },
    };
    this.sendRequest(this._ipAddress.clientId, payload);
    await this.waitResponse();

    if (this.serverResponses.has(requestId)) {
      const serverResponse = this.serverResponses.get(requestId)!;
      this.serverResponses.delete(requestId);
      if (serverResponse.info && serverResponse.info.system) {
        return serverResponse.info!.system;
      } else {
        throw new Error("The response is invalid.");
      }
    } else {
      if (ConnectionState.Disconnect === this._connectionState)
        throw new Error("Server disconnected");
      throw new Error("The response is invalid.");
    }
  }

  async getServerName(): Promise<string | null> {
    const payload: mmc.IRequest = {
      core: {
        kind: mmc.core.Request.Kind.CORE_REQUEST_KIND_SERVER_INFO,
      },
    };
    const requestId = crypto.randomUUID();
    this._requestId = requestId;

    await this.sendRequest(this._ipAddress.clientId, payload);
    await this.waitResponse();

    if (this.serverResponses.has(requestId)) {
      const serverResponse = this.serverResponses.get(requestId)!;
      this.serverResponses.delete(requestId);
      if (
        serverResponse.core &&
        serverResponse.core.server &&
        serverResponse.core.server.name
      ) {
        return serverResponse.core.server.name;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  private async sendRequest(
    cid: string,
    payload: mmc.IRequest,
  ): Promise<void | never> {
    if (this._lockRequest) {
      throw new Error("locked");
    }

    this.lock();
    setTimeout(() => this.unlock(), 500);

    const buffer = mmc.Request.encode(payload).finish();
    const parseBuffer: number[] = Array.from(buffer);

    try {
      if (this._connectionState === ConnectionState.Disconnect)
        throw new Error("Server Disconnected");
      await send(cid, parseBuffer);
    } catch (e) {
      this.unlock();
      throw new Error(e as string);
    }
  }

  private delay = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  private async waitResponse() {
    while (this._lockRequest) {
      if (this._connectionState === ConnectionState.Disconnect) break;
      await this.delay(1);
    }

    if (this._requestId) {
      while (!this.serverResponses.has(this._requestId)) {
        if (this._connectionState === ConnectionState.Disconnect) break;
        await this.delay(1);
      }
      this._requestId = null;
    }
    return;
  }
}
