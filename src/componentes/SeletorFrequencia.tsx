import { Text, TextInput, View } from 'react-native';
import { Frequencia } from '../dominio/agenda';
import { Botao } from './Botao';
import { Rotulo } from './Campo';
import { estilos } from './tema';

type Props = { value: Frequencia; onChange: (value: Frequencia) => void };
const dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];

export function SeletorFrequencia({ value, onChange }: Props) {
  const selecionaTipo = (tipo: Frequencia['tipo']) => {
    if (tipo === 'diaria') onChange({ tipo });
    if (tipo === 'diasDaSemana') onChange({ tipo, dias: value.tipo === 'diasDaSemana' && value.dias.length ? value.dias : [1, 2, 3, 4, 5] });
    if (tipo === 'intervalo') onChange({ tipo, aCadaDias: value.tipo === 'intervalo' ? value.aCadaDias : 2 });
  };
  const alternaDia = (dia: number) => {
    if (value.tipo !== 'diasDaSemana') return;
    const proximos = value.dias.includes(dia) ? value.dias.filter((atual) => atual !== dia) : [...value.dias, dia].sort((a, b) => a - b);
    onChange({ tipo: 'diasDaSemana', dias: proximos });
  };
  return (
    <View style={estilos.campo}>
      <Rotulo>Quando usar</Rotulo>
      <Text style={estilos.ajudaCampo}>Com que frequência você usa este medicamento?</Text>
      <View style={estilos.escolhas}>
        <Botao texto="Todos os dias" variante={value.tipo === 'diaria' ? 'primario' : 'suave'} onPress={() => selecionaTipo('diaria')} accessibilityLabel="Frequência todos os dias" />
        <Botao texto="Alguns dias" variante={value.tipo === 'diasDaSemana' ? 'primario' : 'suave'} onPress={() => selecionaTipo('diasDaSemana')} accessibilityLabel="Usar apenas alguns dias" />
        <Botao texto="A cada alguns dias" variante={value.tipo === 'intervalo' ? 'primario' : 'suave'} onPress={() => selecionaTipo('intervalo')} accessibilityLabel="Repetir a cada alguns dias" />
      </View>
      {value.tipo === 'diasDaSemana' && <View style={estilos.escolhas}>
        {dias.map((nome, dia) => <Botao key={nome} texto={nome} variante={value.dias.includes(dia) ? 'primario' : 'suave'} onPress={() => alternaDia(dia)} accessibilityLabel={`Dia ${nome}`} />)}
      </View>}
      {value.tipo === 'intervalo' && <View><Text style={estilos.ajudaCampo}>Digite de quantos em quantos dias você usa o medicamento.</Text><TextInput accessibilityLabel="A cada quantos dias" value={String(value.aCadaDias)} onChangeText={(texto) => onChange({ tipo: 'intervalo', aCadaDias: Number(texto.replace(/\D/g, '')) || 0 })} keyboardType="number-pad" allowFontScaling style={estilos.input} /></View>}
      {value.tipo === 'diasDaSemana' && value.dias.length === 0 && <Text style={estilos.erro}>Escolha pelo menos um dia.</Text>}
      {value.tipo === 'intervalo' && value.aCadaDias < 1 && <Text style={estilos.erro}>Digite um número maior que zero.</Text>}
    </View>
  );
}
