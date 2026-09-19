import { Text, View } from 'react-native';
import { Medicamento } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { CartaoMedicamento } from '../componentes/CartaoMedicamento';
import { estilos } from '../componentes/tema';

type Props = { medicamentos: Medicamento[]; abrirDetalhe: (id: string) => void; abrirNovo: () => void };

export function Medicamentos({ medicamentos, abrirDetalhe, abrirNovo }: Props) {
  return <View>
    <Text style={estilos.secundario}>Sua lista</Text>
    <Text style={estilos.titulo}>Medicamentos</Text>
    <Text style={estilos.lead}>Lembretes simples, no horário que você combinou com seu médico.</Text>
    <Botao texto="Adicionar medicamento" onPress={abrirNovo} />
    {medicamentos.filter((medicamento) => medicamento.situacao !== 'excluido').map((medicamento) => <CartaoMedicamento key={medicamento.id} medicamento={medicamento} abrir={() => abrirDetalhe(medicamento.id)} />)}
    {medicamentos.every((medicamento) => medicamento.situacao === 'excluido') && <View style={estilos.cartao}><Text style={estilos.nome}>Sua lista está vazia</Text><Text style={estilos.secundario}>Cadastre o primeiro lembrete para começar.</Text></View>}
  </View>;
}
