// ! should share between portal(server) and sdk(client)
export enum PortalReqType {
  ALLOC_MEDIA = 'ALLOC_MEDIA',
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

export enum PortalNotificationType {
  JOIN_SUCCESS = 'JOIN_SUCCESS',
}

export type PortalServerEmitMap = {
  [PortalNotificationType.JOIN_SUCCESS]: (uid: string) => void
}
