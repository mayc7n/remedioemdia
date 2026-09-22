import { EstadoApp } from './dominio/agenda';
import { definirModoCuidador, revogarCuidador, salvarCuidadorComConsentimento, resumoCompartilhamento } from './cuidador';

const estado: EstadoApp = {
  versao: 3,
  concluiuBoasVindas: true,
  modoCuidador: 'naoInformado',
  mostrarDetalhesNotificacao: false,
  medicamentos: [],
  registros: [],
  consultas: [],
};

const dadosCuidador = {
  nome: 'Ana',
  contato: 'ana@example.com',
  avisos: { esquecido: true, adiado: true, consulta: true },
};

describe('cuidador local', () => {
  it('não altera o estado sem confirmação explícita', () => {
    const resultado = salvarCuidadorComConsentimento(estado, { nome: 'Ana', contato: 'ana@example.com', avisos: { esquecido: true, adiado: false, consulta: true } }, false);
    expect(resultado).toBe(estado);
  });

  it('salva somente os avisos selecionados e informa que não houve envio externo', () => {
    const resultado = salvarCuidadorComConsentimento(estado, { nome: 'Ana', contato: 'ana@example.com', avisos: { esquecido: true, adiado: false, consulta: true } }, true);
    expect(resultado.cuidador).toMatchObject({ nome: 'Ana', consentimentoAtivo: true, avisos: { esquecido: true, adiado: false, consulta: true } });
    expect(resumoCompartilhamento(resultado.cuidador)).toContain('Nenhum aviso externo foi enviado');
    expect(resumoCompartilhamento(resultado.cuidador)).toContain('medicamento esquecido');
  });

  it('revoga a autorização e desativa todos os avisos quando confirmado', () => {
    const autorizado = salvarCuidadorComConsentimento(estado, { nome: 'Ana', contato: 'ana@example.com', avisos: { esquecido: true, adiado: true, consulta: true } }, true);
    const revogado = revogarCuidador(autorizado, true);
    expect(revogado.cuidador).toMatchObject({ consentimentoAtivo: false, avisos: { esquecido: false, adiado: false, consulta: false } });
    expect(resumoCompartilhamento(revogado.cuidador)).toContain('Autorização revogada');
  });

  it('habilita o fluxo sem autorizar automaticamente um cuidador', () => {
    const resultado = definirModoCuidador(estado, 'comCuidador', false);

    expect(resultado).toMatchObject({ modoCuidador: 'comCuidador' });
    expect(resultado.cuidador).toBeUndefined();
  });

  it('não muda para uso individual sem confirmar a revogação ativa', () => {
    const autorizado = salvarCuidadorComConsentimento(estado, dadosCuidador, true);

    expect(definirModoCuidador(autorizado, 'semCuidador', false)).toBe(autorizado);
  });

  it('revoga avisos ao confirmar a mudança para uso individual', () => {
    const autorizado = salvarCuidadorComConsentimento(estado, dadosCuidador, true);
    const resultado = definirModoCuidador(autorizado, 'semCuidador', true);

    expect(resultado.modoCuidador).toBe('semCuidador');
    expect(resultado.cuidador).toMatchObject({ consentimentoAtivo: false, avisos: { esquecido: false, adiado: false, consulta: false } });
  });
});
