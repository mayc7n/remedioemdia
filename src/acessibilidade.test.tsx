import { render } from '@testing-library/react-native';
import { Medicamento } from './dominio/agenda';
import { CuidadorForm } from './telas/CuidadorForm';
import { DetalheMedicamento } from './telas/DetalheMedicamento';
import { Navegacao } from './componentes/Navegacao';

const medicamento: Medicamento = {
  id: 'm1',
  nome: 'Medicamento com um nome longo para validar quebra de linha',
  horarios: ['08:00'],
  frequencia: { tipo: 'diaria' },
  observacao: 'Observação longa fornecida pelo médico para continuar legível com fonte ampliada.',
  situacao: 'ativo',
  criadoEm: '2026-09-18T00:00:00.000Z',
  atualizadoEm: '2026-09-18T00:00:00.000Z',
};

describe('acessibilidade dos fluxos críticos', () => {
  it('expõe ações de medicamento com role e label completos', async () => {
    const tela = await render(<DetalheMedicamento medicamento={medicamento} registros={[]} onSalvar={jest.fn()} onPausar={jest.fn()} onExcluir={jest.fn()} />);
    expect(tela.getByRole('button', { name: 'Pausar lembretes' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Excluir medicamento' })).toBeTruthy();
    expect(tela.getByLabelText('Observação do médico (opcional)')).toHaveProp('allowFontScaling', true);
  });

  it('troca para retomar e mantém labels dos avisos do cuidador', async () => {
    const tela = await render(<DetalheMedicamento medicamento={{ ...medicamento, situacao: 'pausado' }} registros={[]} onSalvar={jest.fn()} onPausar={jest.fn()} onExcluir={jest.fn()} />);
    expect(tela.getByRole('button', { name: 'Retomar lembretes' })).toBeTruthy();

    const cuidador = await render(<CuidadorForm nome="" setNome={jest.fn()} contato="" setContato={jest.fn()} avisos={{ esquecido: true, adiado: false, consulta: true }} setAvisos={jest.fn()} salvar={jest.fn()} />);
    expect(cuidador.getByRole('button', { name: 'Medicamento esquecido' })).toBeTruthy();
    expect(cuidador.getByRole('button', { name: 'Consulta próxima' })).toBeTruthy();
    expect(cuidador.getByRole('button', { name: 'Medicamento esquecido' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: false, selected: true }));
    expect(cuidador.getByRole('button', { name: 'Medicamento adiado' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: false, selected: false }));
  });

  it('expõe a aba ativa pelo estado de acessibilidade', async () => {
    const tela = await render(<Navegacao aba="medicamentos" onChange={jest.fn()} />);
    expect(tela.getByRole('tab', { name: 'Remédios' }).props.accessibilityState).toEqual({ selected: true });
    expect(tela.getByRole('tab', { name: 'Hoje' }).props.accessibilityState).toEqual({ selected: false });
  });
});
