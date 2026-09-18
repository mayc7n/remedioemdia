export type EstadoRegistro = 'pendente' | 'taken' | 'snoozed' | 'missed';
export type OrigemRegistro = 'app' | 'notification' | 'widget';
export type Frequencia =
  | { tipo: 'diaria' }
  | { tipo: 'diasDaSemana'; dias: number[] }
  | { tipo: 'intervalo'; aCadaDias: number };

export type Medicamento = {
  id: string;
  nome: string;
  horarios: string[];
  frequencia: Frequencia;
  ativo: boolean;
  criadoEm: string;
};

export type RegistroMedicamento = {
  id: string;
  medicamentoId: string;
  medicamentoNome: string;
  horario: string;
  previstoPara: string;
  estado: EstadoRegistro;
  registradoEm?: string;
  origem: OrigemRegistro;
};

export type Consulta = {
  id: string;
  tipo: 'consulta' | 'exame';
  titulo: string;
  marcadoPara: string;
  local?: string;
  lembretes: boolean;
  concluida: boolean;
};

export type Cuidador = {
  nome: string;
  contato: string;
  consentimentoAtivo: boolean;
  avisos: { esquecido: boolean; adiado: boolean; consulta: boolean };
};

export type EstadoApp = {
  concluiuBoasVindas: boolean;
  medicamentos: Medicamento[];
  registros: RegistroMedicamento[];
  consultas: Consulta[];
  cuidador?: Cuidador;
};

const dataLocal = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const diasDesde = (inicio: string, atual: Date) => {
  const origem = new Date(`${inicio}T00:00:00`);
  const hoje = new Date(`${dataLocal(atual)}T00:00:00`);
  return Math.floor((hoje.getTime() - origem.getTime()) / 86400000);
};

const frequenciaAtiva = (medicamento: Medicamento, data: Date) => {
  if (medicamento.frequencia.tipo === 'diaria') return true;
  if (medicamento.frequencia.tipo === 'diasDaSemana') {
    return medicamento.frequencia.dias.includes(data.getDay());
  }
  return diasDesde(medicamento.criadoEm.slice(0, 10), data) % medicamento.frequencia.aCadaDias === 0;
};

export const ocorrenciasDoDia = (medicamentos: Medicamento[], data: Date) => {
  if (!Number.isFinite(data.getTime())) return [];
  const dia = dataLocal(data);
  return medicamentos
    .filter((medicamento) => medicamento.ativo && frequenciaAtiva(medicamento, data))
    .flatMap((medicamento) => medicamento.horarios.map((horario) => ({
      id: `${medicamento.id}-${dia}-${horario}`,
      medicamentoId: medicamento.id,
      medicamentoNome: medicamento.nome,
      horario,
      previstoPara: `${dia}T${horario}:00`,
    })))
    .sort((a, b) => a.horario.localeCompare(b.horario));
};

export const criarRegistro = (medicamento: Medicamento, dia: string, horario: string): RegistroMedicamento => ({
  id: `${medicamento.id}-${dia}-${horario}`,
  medicamentoId: medicamento.id,
  medicamentoNome: medicamento.nome,
  horario,
  previstoPara: `${dia}T${horario}:00`,
  estado: 'pendente',
  origem: 'app',
});

export const atualizarRegistro = (
  registro: RegistroMedicamento,
  estado: Exclude<EstadoRegistro, 'pendente'>,
  origem: OrigemRegistro,
) => registro.estado === 'pendente'
  ? { ...registro, estado, origem, registradoEm: new Date().toISOString() }
  : registro;

export const estadoInicial: EstadoApp = {
  concluiuBoasVindas: false,
  medicamentos: [],
  registros: [],
  consultas: [],
};
