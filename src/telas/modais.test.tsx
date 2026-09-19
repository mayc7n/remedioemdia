import { render } from '@testing-library/react-native';
import { ModalConsulta } from './Modais';

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
  });
});
