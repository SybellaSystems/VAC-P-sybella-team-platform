
export type Sector = 'FISCAL' | 'PERSONNEL' | 'INFRASTRUCTURE' | 'STRATEGY' | 'OPERATIONS';

export interface OperationalNode {
  id: string;
  name: string;
  sector: Sector;
  description: string;
  status: 'OPTIMAL' | 'DEGRADED' | 'STANDBY' | 'MAINTENANCE';
  boosterFactor: string;
  interconnects: string[]; // IDs of other nodes
}

// Generating 200+ distinct operational nodes for the Sybella ecosystem
export const OPERATIONAL_REGISTRY: OperationalNode[] = Array.from({ length: 200 }).map((_, i) => {
  const sectors: Sector[] = ['FISCAL', 'PERSONNEL', 'INFRASTRUCTURE', 'STRATEGY', 'OPERATIONS'];
  const sector = sectors[i % sectors.length];
  
  const nodeNames = {
    FISCAL: ['Revenue Stream', 'Tax Optimization', 'Venture Capital Pulse', 'Burn Rate Ledger', 'Dividend Orchestrator'],
    PERSONNEL: ['Acquisition Pipeline', 'Retention Neural', 'Benefit Grid', 'Workforce Velocity', 'Talent Matrix'],
    INFRASTRUCTURE: ['Cold Storage Node', 'GPU Cluster', 'Latency Relay', 'Hashrate Proxy', 'Packet Shaper'],
    STRATEGY: ['Market Expansion', 'Competitor Shadow', 'Brand Integrity', 'Exit Strategy Pulse', 'Growth Vector'],
    OPERATIONS: ['Supply Chain Link', 'Logistic Mesh', 'Quality Protocol', 'Incident Command', 'Protocol Sentinel']
  };

  const id = `NODE-X${Math.floor(i / 10)}-${i % 10}`;
  const baseName = nodeNames[sector][i % nodeNames[sector].length];
  
  return {
    id,
    name: `${baseName} ${Math.floor(i / 5) + 1}`,
    sector,
    description: `High-integrity ${sector.toLowerCase()} processing unit optimized for the Sybella Booster ecosystem.`,
    status: Math.random() > 0.1 ? 'OPTIMAL' : 'MAINTENANCE',
    boosterFactor: `${(Math.random() * 5 + 1).toFixed(1)}x`,
    interconnects: [`NODE-X${Math.floor((i + 1) % 200 / 10)}-${(i + 1) % 10}`, `NODE-X${Math.floor((i + 10) % 200 / 10)}-${(i + 10) % 10}`]
  };
});
