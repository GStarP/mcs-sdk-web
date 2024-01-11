import { io } from 'socket.io-client'

class MCSClient {
  static PORTAL_URL = 'wss://localhost.com'

  async join() {
    const socket = io(MCSClient.PORTAL_URL)
    socket.on('connect_error', () => {
      console.log('connect error')
    })
  }
}

export default MCSClient
