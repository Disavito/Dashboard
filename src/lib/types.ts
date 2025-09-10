export type EconomicSituation = 'Pobre' | 'Extremo Pobre';

export interface EconomicSituationOption {
  value: EconomicSituation;
  label: string;
}

export interface SocioTitular {
  id: number;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  fechaNacimiento: string;
  edad: number | null;
  celular: string | null;
  situacionEconomica: EconomicSituation;
  direccionDNI: string;
  regionDNI: string;
  provinciaDNI: string;
  distritoDNI: string;
  localidad: string;
  regionVivienda: string | null;
  provinciaVivienda: string | null;
  distritoVivienda: string | null;
  direccionVivienda: string | null;
  mz: string | null;
  lote: string | null;
  created_at: string;
}

export interface Cuenta {
  id: number;
  name: string;
  balance: number;
  created_at: string;
}

export interface Ingreso {
  id: number;
  receipt_number: string;
  dni: string;
  full_name: string;
  amount: number;
  account: string;
  date: string;
  transaction_type: 'Ingreso' | 'Anulacion' | 'Devolucion';
  numeroOperacion: string | null; // Campo corregido
  created_at: string;
}

// NEW: Gasto Interface
export interface Gasto {
  id: number;
  category: string;
  subcategory: string | null; // Corregido a subcategory
  description: string | null;
  amount: number;
  date: string;
  numero_gasto: string | null; // Permitir que sea null
  colaborador_id: string | null; // Link to a collaborator if applicable (UUID string)
  account: string; // Añadido el campo account
  created_at: string;
}

// NEW: Colaborador Interface
export interface Colaborador {
  id: string; // Cambiado a string para UUID
  name: string; // Cambiado de nombres a name para consistencia
  apellidos: string; // Añadido apellidos
  dni: string;
  celular: string | null;
  email: string | null;
  created_at: string;
}

// NEW: Transaction Type (Union of Ingreso and Gasto)
export type Transaction = Ingreso | Gasto;
