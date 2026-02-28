export interface IXmppAuthProvider {
  getXmppTokens(): Promise<{ rso: string; pas: string }>;
}
