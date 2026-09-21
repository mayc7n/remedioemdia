import { Text, View } from 'react-native';
import { Medicamento } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { CartaoMedicamento } from '../componentes/CartaoMedicamento';
import { estilos } from '../componentes/tema';

type Props = { medicamentos: Medicamento[]; abrirDetalhe: (id: string) => void; abrirNovo: () => void };

export function Medicamentos({ medicamentos, abrirDetalhe, abrirNovo }: Props) {
  const ativos = medicamentos.filter((medicamento) => medicamento.situacao !== 'excluido');
  return <View>
    <Text style={estilos.titulo}>Medicamentos</Text>
    <Text style={estilos.lead}>Lembretes no horário combinado com seu médico.</Text>
    <Botao texto="Adicionar medicamento" onPress={abrirNovo} />
    {ativos.length === 0 ? <View style={estilos.vazio}>
      <Text style={estilos.nome}>Sua lista está vazia</Text>
      <Text style={estilos.secundario}>Cadastre o primeiro lembrete para começar.</Text>
    </View> : <View style={{ marginTop: 8 }}>
      {ativos.map((medicamento) => <CartaoMedicamento key={medicamento.id} medicamento={medicamento} abrir={() => abrirDetalhe(medicamento.id)} />)}
    </View>}
  </View>;
}
