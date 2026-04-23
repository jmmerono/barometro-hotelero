export interface DatoCCAA {
  ccaa: string;
  pernoctaciones: number;
  viajeros: number;
  variacion_anual: number;
  ocupacion: number;
}

export interface DatoMensual {
  mes: string;       // "2024-01", "2024-02", ...
  label: string;     // "Ene 24"
  pernoctaciones: number;
  viajeros: number;
}

export interface KPIs {
  total_pernoctaciones: number;
  variacion_anual: number;
  revpar: number;
  adr: number;
  ocupacion: number;
  iph: number;
  periodo: string;   // "Enero 2025"
}

export interface SnapshotMes {
  periodo: string;
  actualizado: string;
  kpis: KPIs;
  por_ccaa: DatoCCAA[];
  mensual: DatoMensual[];
}
