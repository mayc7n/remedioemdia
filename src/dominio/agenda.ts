export type EstadoRegistro = 'pendente' | 'taken' | 'snoozed' | 'missed';
export type OrigemRegistro = 'app' | 'notification' | 'widget';
export type SituacaoMedicamento = 'ativo' | 'pausado' | 'excluido';
export type Frequencia =
  | { tipo: 'diaria' }
  | { tipo: 'diasDaSemana'; dias: number[] }
  | { tipo: 'intervalo'; aCadaDias: number };

export type Medicamento = {
  id: string;
  nome: string;
  horarios: string[];
  frequencia: Frequencia;
  observacao?: string;
  situacao: SituacaoMedicamento;
  criadoEm: string;
  atualizadoEm: string;
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
  observacao?: string;
  lembretes: boolean;
  concluida: boolean;
};

export type Cuidador = {
  nome: string;
  contato: string;
  consentimentoAtivo: boolean;
  avisos: { esquecido: boolean; adiado: boolean; consulta: boolean };
  autorizadoEm?: string;
};

export type EstadoApp = {
  versao: 2;
  concluiuBoasVindas: boolean;
  medicamentos: Medicamento[];
  registros: RegistroMedicamento[];
  consultas: Consulta[];
  cuidador?: Cuidador;
  fusoHorarioObservado?: string;
};

type Objeto = Record<string, unknown>;

const ehObjeto = (valor: unknown): valor is Objeto => typeof valor === 'object' && valor !== null;
const ehHorario = (valor: unknown): valor is string => typeof valor === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
const ehData = (valor: unknown): valor is string => typeof valor === 'string' && Number.isFinite(new Date(valor).getTime());

const dataLocal = (data: Date) => {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
};

const dataLocalDaString = (valor: string) => new Date(valor);

const normalizarHorarios = (valor: unknown) => Array.from(new Set(
  Array.isArray(valor) ? valor.filter(ehHorario) : [],
)).sort();

const normalizarFrequencia = (valor: unknown): Frequencia => {
  if (!ehObjeto(valor) || typeof valor.tipo !== 'string') return { tipo: 'diaria' };
  if (valor.tipo === 'diasDaSemana') {
    const dias = Array.from(new Set(Array.isArray(valor.dias) ? valor.dias.filter((dia): dia is number => Number.isInteger(dia) && dia >= 0 && dia <= 6) : [])).sort((a, b) => a - b);
    return dias.length > 0 ? { tipo: 'diasDaSemana', dias } : { tipo: 'diaria' };
  }
  if (valor.tipo === 'intervalo' && Number.isInteger(valor.aCadaDias) && Number(valor.aCadaDias) > 0) {
    return { tipo: 'intervalo', aCadaDias: Number(valor.aCadaDias) };
  }
  return { tipo: 'diaria' };
};

const normalizarMedicamento = (valor: unknown): Medicamento | null => {
  if (!ehObjeto(valor) || typeof valor.id !== 'string' || typeof valor.nome !== 'string') return null;
  const criadoEm = ehData(valor.criadoEm) ? valor.criadoEm : '1970-01-01T00:00:00.000Z';
  const situacao: SituacaoMedicamento = valor.situacao === 'pausado' || valor.situacao === 'excluido'
    ? valor.situacao
    : valor.ativo === false ? 'pausado' : 'ativo';
  const observacao = typeof valor.observacao === 'string' && valor.observacao.trim() ? valor.observacao.trim() : undefined;
  return {
    id: valor.id,
    nome: valor.nome.trim(),
    horarios: normalizarHorarios(valor.horarios),
    frequencia: normalizarFrequencia(valor.frequencia),
    ...(observacao ? { observacao } : {}),
    situacao,
    criadoEm,
    atualizadoEm: ehData(valor.atualizadoEm) ? valor.atualizadoEm : criadoEm,
  };
};

const normalizarRegistro = (valor: unknown): RegistroMedicamento | null => {
  if (!ehObjeto(valor) || typeof valor.id !== 'string' || typeof valor.medicamentoId !== 'string' || typeof valor.medicamentoNome !== 'string' || typeof valor.previstoPara !== 'string' || !ehHorario(valor.horario)) return null;
  const estado: EstadoRegistro = valor.estado === 'taken' || valor.estado === 'snoozed' || valor.estado === 'missed' ? valor.estado : 'pendente';
  const origem: OrigemRegistro = valor.origem === 'notification' || valor.origem === 'widget' ? valor.origem : 'app';
  return {
    id: valor.id,
    medicamentoId: valor.medicamentoId,
    medicamentoNome: valor.medicamentoNome,
    horario: valor.horario,
    previstoPara: valor.previstoPara,
    estado,
    ...(ehData(valor.registradoEm) ? { registradoEm: valor.registradoEm } : {}),
    origem,
  };
};

const normalizarConsulta = (valor: unknown): Consulta | null => {
  if (!ehObjeto(valor) || typeof valor.id !== 'string' || typeof valor.titulo !== 'string' || (valor.tipo !== 'consulta' && valor.tipo !== 'exame') || typeof valor.marcadoPara !== 'string') return null;
  return {
    id: valor.id,
    tipo: valor.tipo,
    titulo: valor.titulo,
    marcadoPara: valor.marcadoPara,
    ...(typeof valor.local === 'string' && valor.local.trim() ? { local: valor.local.trim() } : {}),
    ...(typeof valor.observacao === 'string' && valor.observacao.trim() ? { observacao: valor.observacao.trim() } : {}),
    lembretes: valor.lembretes !== false,
    concluida: valor.concluida === true,
  };
};

const normalizarCuidador = (valor: unknown): Cuidador | undefined => {
  if (!ehObjeto(valor) || typeof valor.nome !== 'string' || typeof valor.contato !== 'string') return undefined;
  const avisos = ehObjeto(valor.avisos) ? valor.avisos : {};
  return {
    nome: valor.nome,
    contato: valor.contato,
    consentimentoAtivo: valor.consentimentoAtivo === true,
    avisos: {
      esquecido: avisos.esquecido === true,
      adiado: avisos.adiado === true,
      consulta: avisos.consulta === true,
    },
    ...(ehData(valor.autorizadoEm) ? { autorizadoEm: valor.autorizadoEm } : {}),
  };
};

export const estadoInicial: EstadoApp = {
  versao: 2,
  concluiuBoasVindas: false,
  medicamentos: [],
  registros: [],
  consultas: [],
};

export const normalizarEstado = (entrada: unknown): EstadoApp => {
  if (!ehObjeto(entrada)) return estadoInicial;
  const medicamentos = Array.isArray(entrada.medicamentos) ? entrada.medicamentos.map(normalizarMedicamento).filter((item): item is Medicamento => item !== null) : [];
  const registros = Array.isArray(entrada.registros) ? entrada.registros.map(normalizarRegistro).filter((item): item is RegistroMedicamento => item !== null) : [];
  const consultas = Array.isArray(entrada.consultas) ? entrada.consultas.map(normalizarConsulta).filter((item): item is Consulta => item !== null) : [];
  const cuidador = normalizarCuidador(entrada.cuidador);
  return {
    versao: 2,
    concluiuBoasVindas: entrada.concluiuBoasVindas === true,
    medicamentos,
    registros,
    consultas,
    ...(cuidador ? { cuidador } : {}),
    ...(typeof entrada.fusoHorarioObservado === 'string' ? { fusoHorarioObservado: entrada.fusoHorarioObservado } : {}),
  };
};

const diasDesde = (inicio: string, atual: Date) => {
  const origem = new Date(`${inicio.slice(0, 10)}T00:00:00`);
  const hoje = new Date(`${dataLocal(atual)}T00:00:00`);
  return Math.floor((hoje.getTime() - origem.getTime()) / 86400000);
};

const frequenciaAtiva = (medicamento: Medicamento, data: Date) => {
  if (medicamento.frequencia.tipo === 'diaria') return true;
  if (medicamento.frequencia.tipo === 'diasDaSemana') return medicamento.frequencia.dias.includes(data.getDay());
  const distancia = diasDesde(medicamento.criadoEm, data);
  return distancia >= 0 && distancia % medicamento.frequencia.aCadaDias === 0;
};

export const ocorrenciasDoDia = (medicamentos: Medicamento[], data: Date) => {
  if (!Number.isFinite(data.getTime())) return [];
  const dia = dataLocal(data);
  return medicamentos
    .filter((medicamento) => medicamento.situacao === 'ativo' && frequenciaAtiva(medicamento, data))
    .flatMap((medicamento) => normalizarHorarios(medicamento.horarios).map((horario) => ({
      id: `${medicamento.id}-${dia}-${horario}`,
      medicamentoId: medicamento.id,
      medicamentoNome: medicamento.nome,
      horario,
      previstoPara: `${dia}T${horario}:00`,
    })))
    .sort((a, b) => a.horario.localeCompare(b.horario));
};

export type Ocorrencia = ReturnType<typeof ocorrenciasDoDia>[number];

export const ocorrenciaPorId = (medicamentos: Medicamento[], ocorrenciaId: string): Ocorrencia | null => {
  const medicamento = [...medicamentos]
    .filter((item) => ocorrenciaId.startsWith(`${item.id}-`))
    .sort((a, b) => b.id.length - a.id.length)[0];
  if (!medicamento) return null;
  const restante = ocorrenciaId.slice(medicamento.id.length + 1);
  const dia = restante.slice(0, 10);
  const horario = restante.slice(11);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(horario)) return null;
  return ocorrenciasDoDia([medicamento], new Date(`${dia}T12:00:00`)).find((item) => item.id === ocorrenciaId) ?? null;
};

export const proximaOcorrencia = (medicamentos: Medicamento[], aPartirDe: Date): Ocorrencia | null => {
  if (!Number.isFinite(aPartirDe.getTime())) return null;
  for (let deslocamento = 0; deslocamento <= 370; deslocamento += 1) {
    const dia = new Date(aPartirDe);
    dia.setHours(0, 0, 0, 0);
    dia.setDate(dia.getDate() + deslocamento);
    const ocorrencia = ocorrenciasDoDia(medicamentos, dia).find((item) => dataLocalDaString(item.previstoPara).getTime() >= aPartirDe.getTime());
    if (ocorrencia) return ocorrencia;
  }
  return null;
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

export const aplicarAcaoNaOcorrencia = (
  estado: EstadoApp,
  ocorrenciaId: string,
  acao: Exclude<EstadoRegistro, 'pendente'>,
  origem: OrigemRegistro,
) => {
  const medicamento = [...estado.medicamentos]
    .filter((item) => ocorrenciaId.startsWith(`${item.id}-`))
    .sort((a, b) => b.id.length - a.id.length)[0];
  if (!medicamento) return estado;
  const restante = ocorrenciaId.slice(medicamento.id.length + 1);
  const dia = restante.slice(0, 10);
  const horario = restante.slice(11);
  const ocorrencia = ocorrenciaPorId([medicamento], ocorrenciaId);
  if (!ocorrencia) return estado;
  const atual = estado.registros.find((registro) => registro.id === ocorrenciaId) ?? criarRegistro(medicamento, dia, horario);
  const atualizado = atualizarRegistro(atual, acao, origem);
  if (atualizado === atual) return estado;
  const registros = estado.registros.some((registro) => registro.id === atual.id)
    ? estado.registros.map((registro) => registro.id === atual.id ? atualizado : registro)
    : [...estado.registros, atualizado];
  return { ...estado, registros };
};
