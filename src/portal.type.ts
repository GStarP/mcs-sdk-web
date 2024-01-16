import type { RtpCapabilities } from 'mediasoup-client/lib/RtpParameters'

// ! should share between portal(server) and sdk(client)
export enum PortalReqType {
  ALLOC_MEDIA = 'ALLOC_MEDIA',
}

export enum PortalNotificationType {
  JOIN_SUCCESS = 'JOIN_SUCCESS',
}

export type PortalServerEmitMap = {
  [PortalNotificationType.JOIN_SUCCESS]: (uid: string) => void
}

export type PortalClientEmitMap = {
  [PortalReqType.ALLOC_MEDIA]: (
    cb: (res: PortalRes<AllocMediaRet>) => void,
  ) => void
}

export type AllocMediaRet = {
  server: string // server name
  rid: string // router id
  rtp: RtpCapabilities // routerRtpCapabilities
}

export type PortalRes<R> =
  | {
      code: 0
      data: R
    }
  | {
      code: 1
      data: string
    }
