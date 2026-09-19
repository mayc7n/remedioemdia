import { EstadoApp } from './dominio/agenda';
import { revogarCuidador, salvarCuidadorComConsentimento, resumoCompartilhamento } from './cuidador';

const estado: EstadoApp = {
  versao: 2,
  concluiuBoasVindas: true,
  medicamentos: [],
  registros: [],
  consultas: [],
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
});
