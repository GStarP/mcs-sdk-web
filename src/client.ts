import { io } from 'socket.io-client'
import { ClientSocket } from './client.type'
import { PortalNotificationType } from './portal.type'

class MCSClient {
  static PORTAL_URL = 'ws://localhost:8080'

  async join(channel: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket: ClientSocket = io(MCSClient.PORTAL_URL, {
        auth: {
          channel,
        },
      })
      socket.on(PortalNotificationType.JOIN_SUCCESS, (uid) => {
        resolve(uid)
      })
      socket.on('connect_error', (err) => {
        reject(err)
      })
      socket.on('disconnect', (reason) => {
        reject(new Error(reason))
      })
    })
  }
}

export default MCSClient
