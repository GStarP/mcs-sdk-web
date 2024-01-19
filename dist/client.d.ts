import { ClientStatus, PublishOptions } from './client.type';
declare class MCSClient {
    static PORTAL_URL: string;
    status: ClientStatus;
    private options;
    private socket;
    private produceWorkers;
    join(channel: string): Promise<string>;
    publish(options: PublishOptions): Promise<void>;
}
export default MCSClient;
