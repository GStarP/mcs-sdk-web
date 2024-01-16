import type { Socket } from 'socket.io-client'
import type { PortalClientEmitMap, PortalServerEmitMap } from './portal.type'
import type { Device } from 'mediasoup-client'
import type { Transport } from 'mediasoup-client/lib/types'

export type ClientSocket = Socket<PortalServerEmitMap, PortalClientEmitMap>

export type MediaType = 'audio' | 'video' | 'screen'

export type PublishOptions = {
  type: MediaType
}

export enum ClientStatus {
  IDLE,
  JOINED,
}

export type MediaWorker = {
  serverName: string
  routerId: string
  device?: Device
  transport?: Transport
}
