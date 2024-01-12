declare class MCSClient {
    static PORTAL_URL: string;
    join(channel: string): Promise<string>;
}
export default MCSClient;
