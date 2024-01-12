import type { Socket } from 'socket.io-client'
import type { PortalServerEmitMap } from './portal.type'

type DefaultEventsMap = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [event: string]: (...args: any[]) => void
}

export type ClientSocket = Socket<PortalServerEmitMap, DefaultEventsMap>
