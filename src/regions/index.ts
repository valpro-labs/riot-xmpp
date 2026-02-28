export interface XmppRegionObject {
  affinity: string;
  domain: string;
  lookupName?: string;
}

export class XmppRegions {
  static Asia1 = { affinity: 'jp1', domain: 'jp1', lookupName: 'asia' };
  static Asia2 = { affinity: 'as2', domain: 'as2', lookupName: 'as2' };
  static Brasil = { affinity: 'br', domain: 'br1', lookupName: 'br1' };
  static Europe1 = { affinity: 'ru1', domain: 'ru1', lookupName: 'eu' };
  static Europe2 = { affinity: 'eu3', domain: 'eu3', lookupName: 'eu3' };
  static EuropeNordicAndEast = { affinity: 'eun1', domain: 'eu2', lookupName: 'eun1' };
  static EuropeWest = { affinity: 'euw1', domain: 'eu1', lookupName: 'euw1' };
  static Japan = { affinity: 'jp1', domain: 'jp1', lookupName: 'jp1' };
  static LatinAmericaNorth = { affinity: 'la1', domain: 'la1', lookupName: 'la1' };
  static LatinAmericaSouth = { affinity: 'la2', domain: 'la2', lookupName: 'la2' };
  static NorthAmerica1 = { affinity: 'na2', domain: 'na1', lookupName: 'na1' };
  static NorthAmerica2 = { affinity: 'la1', domain: 'la1', lookupName: 'us' };
  static NorthAmerica3 = { affinity: 'br', domain: 'br1', lookupName: 'us-br1' };
  static NorthAmerica4 = { affinity: 'la2', domain: 'la2', lookupName: 'us-la2' };
  static NorthAmerica5 = { affinity: 'us2', domain: 'us2', lookupName: 'us2' };
  static Oceania = { affinity: 'oc1', domain: 'oc1', lookupName: 'oc1' };
  static PBE = { affinity: 'pbe1', domain: 'pb1', lookupName: 'pbe1' };
  static Russia = { affinity: 'ru1', domain: 'ru1', lookupName: 'ru1' };
  static SouthEastAsia1 = { affinity: 'sa1', domain: 'sa1', lookupName: 'sea1' };
  static SouthEastAsia2 = { affinity: 'sa2', domain: 'sa2', lookupName: 'sea2' };
  static SouthEastAsia3 = { affinity: 'sa3', domain: 'sa3', lookupName: 'sea3' };
  static SouthEastAsia4 = { affinity: 'sa4', domain: 'sa4', lookupName: 'sea4' };
  static SouthKorea = { affinity: 'kr1', domain: 'kr1', lookupName: 'kr1' };
  static Turkey = { affinity: 'tr1', domain: 'tr1', lookupName: 'tr1' };

  static findByLookupName(name: string): XmppRegionObject | undefined {
    return Object.values(XmppRegions).find(
      (region) => typeof region === 'object' && (region as XmppRegionObject).lookupName === name
    ) as XmppRegionObject | undefined;
  }

  static getHost(region: XmppRegionObject): string {
    return `${region.affinity}.chat.si.riotgames.com`;
  }
}
