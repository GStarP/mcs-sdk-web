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
})(ClientStatus || (ClientStatus = {}));

// ! should share between portal(server) and sdk(client)
var PortalReqType;
(function (PortalReqType) {
    PortalReqType["ALLOC_MEDIA"] = "ALLOC_MEDIA";
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
        // workerId => MediaWorker
        this.workers = new Map();
    }
    join(channel) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.socket = io(MCSClient.PORTAL_URL, {
                    auth: {
                        channel,
                    },
                });
                this.socket.once(PortalNotificationType.JOIN_SUCCESS, (uid) => {
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
            console.log('[publish]', options);
            if (this.status === ClientStatus.IDLE || this.socket === null) {
                throw new Error(PublishError.INVALID_OPERATION);
            }
            const res = yield this.socket
                .timeout(this.options.timeout)
                .emitWithAck(PortalReqType.ALLOC_MEDIA);
            if (res.code === 0) {
                const { server, rid, rtp } = res.data;
                const workerId = encodeWorkerId(server, rid);
                if (!this.workers.has(workerId)) {
                    this.workers.set(workerId, {
                        serverName: server,
                        routerId: rid,
                    });
                }
                const mediaWorker = this.workers.get(workerId);
                if (!mediaWorker.device) {
                    const device = new Device();
                    yield device.load({ routerRtpCapabilities: rtp });
                    mediaWorker.device = device;
                }
            }
        });
    }
}
MCSClient.PORTAL_URL = 'ws://localhost:8080';
const WORKER_ID_SPLITTER = '_';
function encodeWorkerId(serverName, routerId) {
    return serverName + WORKER_ID_SPLITTER + routerId;
}

export { MCSClient };
