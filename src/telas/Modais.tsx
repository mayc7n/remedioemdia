import { CaixaModal } from '../componentes/CaixaModal';
import { ConsultaForm } from './ConsultaForm';
import { CuidadorForm } from './CuidadorForm';

export type ModalConsultaProps = {
  visivel: boolean;
  fechar: () => void;
  titulo: string;
  setTitulo: (value: string) => void;
  data: string;
  setData: (value: string) => void;
  tipo: 'consulta' | 'exame';
  setTipo: (value: 'consulta' | 'exame') => void;
  local: string;
  setLocal: (value: string) => void;
  observacao: string;
  setObservacao: (value: string) => void;
  salvar: () => void;
};

export function ModalConsulta({ visivel, fechar, titulo, setTitulo, data, setData, tipo, setTipo, local, setLocal, observacao, setObservacao, salvar }: ModalConsultaProps) {
  return <CaixaModal visivel={visivel} fechar={fechar} titulo="Novo compromisso">
    <ConsultaForm titulo={titulo} setTitulo={setTitulo} data={data} setData={setData} tipo={tipo} setTipo={setTipo} local={local} setLocal={setLocal} observacao={observacao} setObservacao={setObservacao} salvar={salvar} />
  </CaixaModal>;
}

export type ModalCuidadorProps = {
  visivel: boolean;
  fechar: () => void;
  nome: string;
  setNome: (value: string) => void;
  contato: string;
  setContato: (value: string) => void;
  avisos: { esquecido: boolean; adiado: boolean; consulta: boolean };
  setAvisos: (value: { esquecido: boolean; adiado: boolean; consulta: boolean }) => void;
  salvar: () => void;
  revogar?: () => void;
};

export function ModalCuidador({ visivel, fechar, nome, setNome, contato, setContato, avisos, setAvisos, salvar, revogar }: ModalCuidadorProps) {
  return <CaixaModal visivel={visivel} fechar={fechar} titulo="Cuidador autorizado">
    <CuidadorForm nome={nome} setNome={setNome} contato={contato} setContato={setContato} avisos={avisos} setAvisos={setAvisos} salvar={salvar} revogar={revogar} />
  </CaixaModal>;
}
