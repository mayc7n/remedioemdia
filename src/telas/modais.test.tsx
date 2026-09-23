import { fireEvent, render } from '@testing-library/react-native';
import { ModalConsulta, ModalCuidador } from './Modais';

describe('modais da agenda', () => {
  it('mantém o formulário de consulta acessível após a extração', async () => {
    const tela = await render(
      <ModalConsulta
        visivel
        fechar={jest.fn()}
        titulo="Retorno"
        setTitulo={jest.fn()}
        data="2026-09-20T10:00"
        setData={jest.fn()}
        tipo="consulta"
        setTipo={jest.fn()}
        local="Clínica"
        setLocal={jest.fn()}
        observacao="Levar exames"
        setObservacao={jest.fn()}
        salvar={jest.fn()}
      />,
    );

    expect(tela.getByText('Novo compromisso')).toBeTruthy();
    expect(tela.getByLabelText('Nome')).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Consulta' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Exame' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Escolher data e hora' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Salvar compromisso' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Fechar' })).toBeTruthy();
  });

  it('preserva campos e ações do cuidador', async () => {
    const tela = await render(<ModalCuidador visivel fechar={jest.fn()} nome="Ana" setNome={jest.fn()} contato="11999999999" setContato={jest.fn()} avisos={{ esquecido: true, adiado: false, consulta: false }} setAvisos={jest.fn()} salvar={jest.fn()} revogar={jest.fn()} />);

    expect(tela.getByLabelText('Nome do cuidador')).toBeTruthy();
    expect(tela.getByLabelText('Contato')).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Autorizar cuidador' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Revogar autorização' })).toBeTruthy();
    expect(tela.getByRole('button', { name: 'Fechar' })).toBeTruthy();
  });

  it('informa ao leitor de tela qual tipo de compromisso está selecionado', async () => {
    const setTipo = jest.fn();
    const tela = await render(<ModalConsulta visivel fechar={jest.fn()} titulo="Retorno" setTitulo={jest.fn()} data="2026-09-20T10:00" setData={jest.fn()} tipo="consulta" setTipo={setTipo} local="" setLocal={jest.fn()} observacao="" setObservacao={jest.fn()} salvar={jest.fn()} />);

    expect(tela.getByRole('button', { name: 'Consulta' }).props.accessibilityState).toEqual(expect.objectContaining({ selected: true }));
    expect(tela.getByRole('button', { name: 'Exame' }).props.accessibilityState).toEqual(expect.objectContaining({ selected: false }));
    await fireEvent.press(tela.getByRole('button', { name: 'Exame' }));
    expect(setTipo).toHaveBeenCalledWith('exame');
  });
});
