export type SituacionEconomica = 'Pobre' | 'Extremo Pobre';

export interface Colaborador {
  id: string; // uuid
  name: string; // Updated from 'nombres' to 'name' as per new SQL schema
  apellidos: string | null; // New field as per new SQL schema, replaces apellidoPaterno and apellidoMaterno
  dni: string | null;
  cargo: string | null;
  created_at: string; // timestamp with time zone
}

export interface Cuenta {
  id: string; // uuid
  name: string;
  created_at: string | null; // timestamp with time zone
}

export interface Gasto {
  id: string; // uuid
  amount: number; // numeric
  account: string;
  date: string; // date (YYYY-MM-DD)
  category: string;
  sub_category: string | null;
  description: string | null;
  created_at: string; // timestamp with time zone
  numero_gasto: string | null; // text UNIQUE
  colaborador_id: string | null; // uuid, foreign key to colaboradores
}

export interface Ingreso {
  id: number; // bigint GENERATED ALWAYS AS IDENTITY
  receipt_number: string; // text UNIQUE
  dni: string; // text, foreign key to socio_titulares
  full_name: string;
  amount: number; // numeric
  account: string;
  date: string; // date (YYYY-MM-DD)
  transaction_type: string;
  created_at: string; // timestamp with time zone
}

export interface SocioTitular {
  id: string; // uuid
  nombres: string;
  apellidoMaterno: string;
  apellidoPaterno: string;
  dni: string | null; // character varying UNIQUE
  created_at: string | null; // timestamp with time zone
  ubicacionReferencia: string | null;
  direccionDNI: string | null;
  edad: number | null; // integer
  distritoDNI: string | null;
  provinciaDNI: string | null;
  regionDNI: string | null;
  fechaNacimiento: string | null; // text
  celular: string | null; // character varying
  direccionVivienda: string | null;
  mz: string | null;
  lote: string | null;
  localidad: string | null;
  distritoVivienda: string | null;
  provinciaVivienda: string | null;
  regionVivienda: string | null;
  situacionEconomica: SituacionEconomica | null; // text CHECK ('Pobre' or 'Extremo Pobre')
  genero: string | null;
}

export type Transaction = Ingreso | Gasto;
