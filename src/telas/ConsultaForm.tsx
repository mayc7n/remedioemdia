import { Text, View } from 'react-native';
import { Botao } from '../componentes/Botao';
import { Campo } from '../componentes/Campo';
import { DataHoraPicker } from '../componentes/DataHoraPicker';
import { estilos } from '../componentes/tema';

type Props = { titulo: string; setTitulo: (valor: string) => void; data: string; setData: (valor: string) => void; tipo: 'consulta' | 'exame'; setTipo: (valor: 'consulta' | 'exame') => void; local: string; setLocal: (valor: string) => void; observacao: string; setObservacao: (valor: string) => void; salvar: () => void; };

export function ConsultaForm({ titulo, setTitulo, data, setData, tipo, setTipo, local, setLocal, observacao, setObservacao, salvar }: Props) {
  return <View style={estilos.formularioConteudo}>
    <Text allowFontScaling style={estilos.label}>Tipo</Text>
    <View style={estilos.escolhas}>
      <Botao texto="Consulta" variante={tipo === 'consulta' ? 'primario' : 'suave'} onPress={() => setTipo('consulta')} accessibilityState={{ selected: tipo === 'consulta' }} />
      <Botao texto="Exame" variante={tipo === 'exame' ? 'primario' : 'suave'} onPress={() => setTipo('exame')} accessibilityState={{ selected: tipo === 'exame' }} />
    </View>
    <Campo label="Nome" value={titulo} onChangeText={setTitulo} placeholder="Ex.: Retorno com cardiologista" />
    <DataHoraPicker valor={data} onChange={setData} />
    <Campo label="Local (opcional)" value={local} onChangeText={setLocal} placeholder="Ex.: Clínica" />
    <Campo label="Observação (opcional)" value={observacao} onChangeText={setObservacao} placeholder="Informação fornecida pelo médico" multiline />
    <View style={estilos.formularioAcao}><Botao texto="Salvar compromisso" onPress={salvar} /></View>
  </View>;
}
