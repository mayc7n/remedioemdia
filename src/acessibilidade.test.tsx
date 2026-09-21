import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Medicamento } from './dominio/agenda';
import { Botao } from './componentes/Botao';
import { CaixaModal } from './componentes/CaixaModal';
import { HorarioPicker } from './componentes/HorarioPicker';
import { SeletorFrequencia } from './componentes/SeletorFrequencia';
import { CuidadorForm } from './telas/CuidadorForm';
import { DetalheMedicamento } from './telas/DetalheMedicamento';
import { Inicio } from './telas/Inicio';
import { Mais } from './telas/Mais';
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

  it('expõe a preferência de privacidade da notificação', async () => {
    const tela = await render(<Mais consultas={[]} abrirConsulta={jest.fn()} abrirCuidador={jest.fn()} mostrarDetalhesNotificacao={false} alternarDetalhesNotificacao={jest.fn()} />);
    expect(tela.getByRole('button', { name: 'Mostrar detalhes nas notificações' }).props.accessibilityState).toEqual(expect.objectContaining({ disabled: false, selected: false }));
  });

  it('mantém ações da rotina acessíveis na lista inicial', async () => {
    const tela = await render(<Inicio ocorrencias={[{ id: 'm1-2026-09-18-08:00', medicamentoId: 'm1', medicamentoNome: 'Remédio', horario: '08:00', previstoPara: '2026-09-18T08:00:00' }]} registros={[]} consultas={[]} marcar={jest.fn()} abrirMedicamento={jest.fn()} desfazerDisponivel={false} desfazer={jest.fn()} />);
    expect(tela.getByRole('button', { name: 'Tomei' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Adiar' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Esqueci' })).toBeTruthy();
    expect(tela.getByText('○ Pendente')).toBeTruthy();
  });

  it('mantém alvos de toque mínimos e permite fonte ampliada nos controles', async () => {
    const tela = await render(<><Botao texto="Ação" onPress={jest.fn()} /><HorarioPicker indice={0} valor="08:00" onChange={jest.fn()} remover={jest.fn()} /><CaixaModal visivel fechar={jest.fn()} titulo="Exemplo"><Text>Conteúdo</Text></CaixaModal></>);

    expect(tela.getByRole('button', { name: 'Ação' })).toHaveStyle({ minHeight: 48 });
    expect(tela.getByText('Ação')).toHaveProp('allowFontScaling', true);
    expect(tela.getByRole('button', { name: 'Remover horário 1' })).toHaveStyle({ width: 48, height: 48 });
    expect(tela.getByRole('button', { name: 'Fechar' })).toHaveStyle({ minHeight: 48 });
  });

  it('usa linguagem simples para repetir um medicamento', async () => {
    const tela = await render(<SeletorFrequencia value={{ tipo: 'intervalo', aCadaDias: 2 }} onChange={jest.fn()} />);

    expect(tela.getByText('Com que frequência você usa este medicamento?')).toBeTruthy();
    expect(tela.getByLabelText('A cada quantos dias')).toBeTruthy();
    expect(tela.queryByLabelText('Intervalo em dias')).toBeNull();
  });
});
