import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import { Botao } from './Botao';
import { cores, estilos } from './tema';

const horarioParaData = (horario: string) => {
  const [hora, minuto] = horario.split(':').map(Number);
  const data = new Date();
  data.setHours(Number.isFinite(hora) ? hora : 8, Number.isFinite(minuto) ? minuto : 0, 0, 0);
  return data;
};

const dataParaHorario = (data: Date) => `${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;

type Props = {
  indice: number;
  valor: string;
  onChange: (valor: string) => void;
  remover?: () => void;
};

export function HorarioPicker({ indice, valor, onChange, remover }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(() => horarioParaData(valor));

  const abrir = () => {
    setRascunho(horarioParaData(valor));
    setAberto(true);
  };

  const confirmarAndroid = (evento: DateTimePickerEvent, data?: Date) => {
    setAberto(false);
    if (evento.type === 'set' && data) onChange(dataParaHorario(data));
  };

  const confirmarIos = () => {
    onChange(dataParaHorario(rascunho));
    setAberto(false);
  };

  return <View style={estilos.horarioLinha}>
    <View style={estilos.horarioIndice}><Text style={estilos.horarioNumero}>{String(indice + 1).padStart(2, '0')}</Text></View>
    <View style={estilos.horarioConteudo}>
      <Text style={estilos.label}>Horário {indice + 1}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Escolher horário ${indice + 1}`} onPress={abrir} style={({ pressed }) => [estilos.horarioBotao, pressed && estilos.pressionado]}>
        <Text style={estilos.horarioValor}>{valor}</Text>
        <Text style={estilos.horarioDica}>Toque para escolher</Text>
      </Pressable>
    </View>
    {remover && <Pressable accessibilityRole="button" accessibilityLabel={`Remover horário ${indice + 1}`} onPress={remover} hitSlop={8} style={estilos.horarioRemover}><Text style={estilos.horarioRemoverTexto}>×</Text></Pressable>}
    {aberto && Platform.OS === 'ios' && <Modal transparent animationType="slide" visible onRequestClose={() => setAberto(false)}>
      <View style={estilos.pickerBackdrop}>
        <View style={estilos.pickerFolha}>
          <View style={estilos.linhaEntre}><View><Text style={estilos.nome}>Escolha o horário</Text><Text style={estilos.secundario}>O lembrete será salvo neste horário.</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar seletor de horário" onPress={() => setAberto(false)}><Text style={estilos.pickerCancelar}>Fechar</Text></Pressable></View>
          <DateTimePicker value={rascunho} mode="time" display="spinner" onChange={(_, data) => data && setRascunho(data)} locale="pt-BR" />
          <Botao texto="Usar este horário" onPress={confirmarIos} />
        </View>
      </View>
    </Modal>}
    {aberto && Platform.OS === 'android' && <DateTimePicker value={horarioParaData(valor)} mode="time" display="default" onChange={confirmarAndroid} />}
  </View>;
}
