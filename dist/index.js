import { io } from 'socket.io-client';
import { Device } from 'mediasoup-client';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var ClientStatus;
(function (ClientStatus) {
    ClientStatus[ClientStatus["IDLE"] = 0] = "IDLE";
    ClientStatus[ClientStatus["JOINED"] = 1] = "JOINED";
    ClientStatus[ClientStatus["PUBLISHING"] = 2] = "PUBLISHING";
})(ClientStatus || (ClientStatus = {}));

// ! should share between portal(server) and sdk(client)
var PortalReqType;
(function (PortalReqType) {
    PortalReqType["ALLOC_MEDIA"] = "ALLOC_MEDIA";
    PortalReqType["CREATE_SEND_TRANSPORT"] = "CREATE_SEND_TRANSPORT";
    PortalReqType["CONNECT_TRANSPORT"] = "CONNECT_TRANSPORT";
    PortalReqType["CREATE_PRODUCER"] = "CREATE_PRODUCER";
})(PortalReqType || (PortalReqType = {}));
var PortalNotificationType;
(function (PortalNotificationType) {
    PortalNotificationType["JOIN_SUCCESS"] = "JOIN_SUCCESS";
})(PortalNotificationType || (PortalNotificationType = {}));

var PublishError;
(function (PublishError) {
    PublishError["INVALID_OPERATION"] = "INVALID_OPERATION";
})(PublishError || (PublishError = {}));

class MCSClient {
    constructor() {
        this.status = ClientStatus.IDLE;
        this.options = {
            timeout: 10 * 1000,
        };
        this.socket = null;
        // server_rid => MediaWorker
        this.produceWorkers = new Map();
    }
    join(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                console.debug(`join: url=${MCSClient.PORTAL_URL} channel=${channel}`);
                this.socket = io(MCSClient.PORTAL_URL, {
                    auth: {
                        channel,
                    },
                    ackTimeout: this.options.timeout,
                });
                this.socket.once(PortalNotificationType.JOIN_SUCCESS, (uid) => {
                    console.debug(`JOIN_SUCCESS: ${uid}`);
                    this.status = ClientStatus.JOINED;
                    resolve(uid);
                });
                this.socket.on('connect_error', (err) => {
                    this.status = ClientStatus.IDLE;
                    reject(err);
                });
                this.socket.on('disconnect', (reason) => {
                    this.status = ClientStatus.IDLE;
                    reject(new Error(reason));
                });
            });
        });
    }
    publish(options) {
        return __awaiter(this, void 0, void 0, function* () {
            console.debug(`publish:`, options);
            if (this.status === ClientStatus.IDLE || this.socket === null) {
                throw new Error(PublishError.INVALID_OPERATION);
            }
            if (this.status === ClientStatus.PUBLISHING)
                return;
            this.status = ClientStatus.PUBLISHING;
            try {
                const allocMediaRes = yield this.socket.emitWithAck(PortalReqType.ALLOC_MEDIA);
                if (allocMediaRes.code !== 0)
                    return;
                const { sid, rid, rtp } = allocMediaRes.data;
                console.debug(`ALLOC_MEDIA:`, allocMediaRes.data);
                // if haven't be allocated to this worker before, remember it
                const workerId = generateWorkerId(sid, rid);
                if (!this.produceWorkers.has(workerId)) {
                    this.produceWorkers.set(workerId, {
                        serverId: sid,
                        routerId: rid,
                        producers: new Map(),
                    });
                }
                const worker = this.produceWorkers.get(workerId);
                // if device not loaded
                if (!worker.device || !worker.device.loaded) {
                    const device = new Device();
                    yield device.load({ routerRtpCapabilities: rtp });
                    worker.device = device;
                    console.debug(`device.load:`, device);
                }
                const device = worker.device;
                // if transport not connected
                if (!worker.transport ||
                    worker.transport.connectionState !== 'connected') {
                    const createTransportRes = yield this.socket.emitWithAck(PortalReqType.CREATE_SEND_TRANSPORT, worker.serverId, worker.routerId);
                    if (createTransportRes.code !== 0)
                        return;
                    const transportOptions = createTransportRes.data;
                    console.debug(`CREATE_SEND_TRANSPORT:`, createTransportRes.data);
                    const transport = device.createSendTransport(transportOptions);
                    worker.transport = transport;
                    console.debug(`device.createSendTransport:`, transport);
                    transport.on('connect', ({ dtlsParameters }, onOk, onErr) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (!this.socket) {
                                throw new Error('socket is null');
                            }
                            console.debug(`transport.onconnect:`, dtlsParameters);
                            const connectRes = yield this.socket.emitWithAck(PortalReqType.CONNECT_TRANSPORT, worker.serverId, worker.routerId, transportOptions.id, dtlsParameters);
                            if (connectRes.code === 0) {
                                onOk();
                            }
                            else {
                                throw new Error(connectRes.data);
                            }
                        }
                        catch (e) {
                            console.error(e);
                            onErr(e);
                        }
                    }));
                    transport.on('connectionstatechange', (state) => {
                        console.debug(`transport.onconnectionstatechange: id=${transport.id} state=${state}`);
                    });
                    transport.on('produce', (params, onOk, onErr) => __awaiter(this, void 0, void 0, function* () {
                        try {
                            if (!this.socket) {
                                throw new Error('socket is null');
                            }
                            console.debug(`transport.onproduce:`, params);
                            const res = yield this.socket.emitWithAck(PortalReqType.CREATE_PRODUCER, worker.serverId, worker.routerId, transportOptions.id, params.kind, params.rtpParameters);
                            if (res.code === 0) {
                                console.debug(`CREATE_PRODUCER:`, res.data);
                                onOk({ id: res.data });
                            }
                            else {
                                throw new Error(res.data);
                            }
                        }
                        catch (e) {
                            console.error(e);
                            onErr(e);
                        }
                    }));
                }
                const transport = worker.transport;
                const mediaStream = yield navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                console.debug('getUserMedia', mediaStream);
                transport.produce({
                    track: mediaStream.getVideoTracks()[0],
                });
            }
            catch (e) {
                this.status = ClientStatus.JOINED;
                throw e;
            }
        });
    }
}
MCSClient.PORTAL_URL = 'ws://localhost:8080';
function generateWorkerId(serverName, routerId) {
    return serverName + '_' + routerId;
}

export { MCSClient };
