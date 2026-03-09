export const mockIntegrations = [
  { id: '1', airline: 'Azul', status: 'active', lastSync: '10 min atrás', pointsCaptured: 154000 },
  { id: '2', airline: 'Smiles', status: 'waiting_auth', lastSync: '2 horas atrás', pointsCaptured: 320000 },
  { id: '3', airline: 'LATAM', status: 'active', lastSync: '5 min atrás', pointsCaptured: 89000 },
];

export const mockEmissions = [
  { id: 'e1', airline: 'Azul', locator: 'XYZ123', passenger: 'João Silva', origin: 'VCP', destination: 'CNF', date: '2026-03-10', miles: 15000, status: 'synced' },
  { id: 'e2', airline: 'Smiles', locator: 'ABC987', passenger: 'Maria Santos', origin: 'GRU', destination: 'JFK', date: '2026-04-15', miles: 85000, status: 'pending_sync' },
  { id: 'e3', airline: 'LATAM', locator: 'LTM456', passenger: 'Carlos Lima', origin: 'CGH', destination: 'SDU', date: '2026-03-12', miles: 12000, status: 'synced' },
  { id: 'e4', airline: 'Azul', locator: 'QWE456', passenger: 'Ana Souza', origin: 'VCP', destination: 'REC', date: '2026-03-20', miles: 22000, status: 'synced' },
];

export const mockSystemMetrics = {
  totalEmissions: 1245,
  totalPassengers: 1480,
  totalMiles: 5430000,
  activeAlerts: 2,
  syncStatus: 'Normal'
};
