import { EstadoApp, Cuidador, ModoCuidador } from './dominio/agenda';

export type DadosCuidador = Pick<Cuidador, 'nome' | 'contato' | 'avisos'>;

export function salvarCuidadorComConsentimento(estado: EstadoApp, dados: DadosCuidador, confirmacao: boolean): EstadoApp {
  if (!confirmacao) return estado;
  return {
    ...estado,
    modoCuidador: 'comCuidador',
    cuidador: {
      nome: dados.nome.trim(),
      contato: dados.contato.trim(),
      consentimentoAtivo: true,
      autorizadoEm: new Date().toISOString(),
      avisos: { ...dados.avisos },
    },
  };
}

export function definirModoCuidador(
  estado: EstadoApp,
  modo: Exclude<ModoCuidador, 'naoInformado'>,
  confirmacaoRevogacao: boolean,
): EstadoApp {
  if (modo === 'comCuidador') return { ...estado, modoCuidador: modo };
  if (estado.cuidador?.consentimentoAtivo && !confirmacaoRevogacao) return estado;
  const revogado = estado.cuidador ? revogarCuidador(estado, true) : estado;
  return { ...revogado, modoCuidador: 'semCuidador' };
}

export function revogarCuidador(estado: EstadoApp, confirmacao: boolean): EstadoApp {
  if (!confirmacao || !estado.cuidador) return estado;
  return {
    ...estado,
    cuidador: {
      ...estado.cuidador,
      consentimentoAtivo: false,
      avisos: { esquecido: false, adiado: false, consulta: false },
    },
  };
}

export function resumoCompartilhamento(cuidador?: Cuidador) {
  if (!cuidador) return 'Nenhum cuidador autorizado. Nenhum aviso externo foi enviado.';
  if (!cuidador.consentimentoAtivo) return 'Autorização revogada. Nenhum aviso externo foi enviado.';
  const avisos: string[] = [];
  if (cuidador.avisos.esquecido) avisos.push('medicamento esquecido');
  if (cuidador.avisos.adiado) avisos.push('medicamento adiado');
  if (cuidador.avisos.consulta) avisos.push('consulta próxima');
  return `${avisos.length ? `Avisos selecionados: ${avisos.join(', ')}. ` : ''}Nenhum aviso externo foi enviado.`;
}
