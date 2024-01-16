import { io } from 'socket.io-client'
import {
  ClientSocket,
  ClientStatus,
  MediaWorker,
  PublishOptions,
} from './client.type'
import { PortalNotificationType, PortalReqType } from './portal.type'
import { PublishError } from './error'
import { Device } from 'mediasoup-client'

class MCSClient {
  static PORTAL_URL = 'ws://localhost:8080'

  status = ClientStatus.IDLE

  private options = {
    timeout: 10 * 1000,
  }
  private socket: ClientSocket | null = null
  // workerId => MediaWorker
  private workers: Map<string, MediaWorker> = new Map()

  async join(channel: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket = io(MCSClient.PORTAL_URL, {
        auth: {
          channel,
        },
      })

      this.socket.once(PortalNotificationType.JOIN_SUCCESS, (uid) => {
        this.status = ClientStatus.JOINED
        resolve(uid)
      })

      this.socket.on('connect_error', (err) => {
        this.status = ClientStatus.IDLE
        reject(err)
      })

      this.socket.on('disconnect', (reason) => {
        this.status = ClientStatus.IDLE
        reject(new Error(reason))
      })
    })
  }

  async publish(options: PublishOptions) {
    console.log('[publish]', options)
    if (this.status === ClientStatus.IDLE || this.socket === null) {
      throw new Error(PublishError.INVALID_OPERATION)
    }

    const res = await this.socket
      .timeout(this.options.timeout)
      .emitWithAck(PortalReqType.ALLOC_MEDIA)
    if (res.code === 0) {
      const { server, rid, rtp } = res.data

      const workerId = encodeWorkerId(server, rid)
      if (!this.workers.has(workerId)) {
        this.workers.set(workerId, {
          serverName: server,
          routerId: rid,
        })
      }

      const mediaWorker = this.workers.get(workerId)!
      if (!mediaWorker.device) {
        const device = new Device()
        await device.load({ routerRtpCapabilities: rtp })
        mediaWorker.device = device
      }
    }
  }
}

const WORKER_ID_SPLITTER = '_'
function encodeWorkerId(serverName: string, routerId: string): string {
  return serverName + WORKER_ID_SPLITTER + routerId
}
// function decodeWorkerId(workerId: string): MediaWorker {
//   const li = workerId.split(WORKER_ID_SPLITTER)
//   if (li.length !== 2) throw new Error(`cannot decode workerId: ${workerId}`)
//   return {
//     serverName: li[0],
//     routerId: li[1],
//   }
// }

export default MCSClient
