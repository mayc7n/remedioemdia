import { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { estilos } from './tema';

const valorParaData = (valor: string) => {
  const resultado = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(valor);
  if (!resultado) return new Date();
  const [, ano, mes, dia, hora, minuto] = resultado;
  return new Date(Number(ano), Number(mes) - 1, Number(dia), Number(hora), Number(minuto));
};

const dataParaValor = (data: Date) => {
  const dois = (numero: number) => String(numero).padStart(2, '0');
  return `${data.getFullYear()}-${dois(data.getMonth() + 1)}-${dois(data.getDate())}T${dois(data.getHours())}:${dois(data.getMinutes())}`;
};

export const formatarDataHoraBrasileira = (valor: string) => {
  const data = valorParaData(valor);
  if (!Number.isFinite(data.getTime()) || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor)) return 'Escolher data e hora';
  return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()} às ${String(data.getHours()).padStart(2, '0')}:${String(data.getMinutes()).padStart(2, '0')}`;
};

type Props = { valor: string; onChange: (valor: string) => void };

export function DataHoraPicker({ valor, onChange }: Props) {
  const [aberto, setAberto] = useState(false);
  const [rascunho, setRascunho] = useState(() => valorParaData(valor));
  const [etapaAndroid, setEtapaAndroid] = useState<'date' | 'time'>('date');

  useEffect(() => {
    setRascunho(valorParaData(valor));
  }, [valor]);

  const abrir = () => {
    setRascunho(valorParaData(valor));
    setEtapaAndroid('date');
    setAberto(true);
  };

  const concluir = () => {
    onChange(dataParaValor(rascunho));
    setAberto(false);
  };

  const alterarData = (evento: DateTimePickerEvent, data?: Date) => {
    if (evento.type === 'dismissed') {
      setAberto(false);
      return;
    }
    if (!data) return;
    setRascunho(data);
    if (Platform.OS === 'android') setEtapaAndroid('time');
  };

  const alterarHora = (evento: DateTimePickerEvent, data?: Date) => {
    if (evento.type === 'dismissed') {
      setAberto(false);
      return;
    }
    if (data) {
      setRascunho(data);
      onChange(dataParaValor(data));
    }
    setAberto(false);
  };

  return <View style={estilos.campo}>
    <Text style={estilos.label}>Data e hora</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Escolher data e hora" onPress={abrir} style={({ pressed }) => [estilos.horarioBotao, pressed && estilos.pressionado]}>
      <Text style={estilos.horarioValor}>{formatarDataHoraBrasileira(valor)}</Text>
      <Text style={estilos.horarioDica}>Formato brasileiro · toque para escolher</Text>
    </Pressable>

    {aberto && Platform.OS === 'android' && etapaAndroid === 'date' && <DateTimePicker value={rascunho} mode="date" display="default" locale="pt-BR" onChange={alterarData} />}
    {aberto && Platform.OS === 'android' && etapaAndroid === 'time' && <DateTimePicker value={rascunho} mode="time" display="default" locale="pt-BR" onChange={alterarHora} />}

    {aberto && Platform.OS === 'ios' && <Modal transparent animationType="slide" visible onRequestClose={() => setAberto(false)}>
      <View style={estilos.pickerBackdrop}>
        <View style={estilos.pickerFolha}>
          <View style={estilos.linhaEntre}><Text style={estilos.nome}>Escolha a data e a hora</Text><Pressable accessibilityRole="button" accessibilityLabel="Cancelar escolha de data e hora" onPress={() => setAberto(false)}><Text style={estilos.pickerCancelar}>Cancelar</Text></Pressable></View>
          <DateTimePicker value={rascunho} mode="datetime" display="spinner" locale="pt-BR" onChange={(_, data) => data && setRascunho(data)} />
          <Pressable accessibilityRole="button" accessibilityLabel="Usar data e hora escolhidas" onPress={concluir} style={estilos.botaoPrimario}><Text style={estilos.textoBotao}>Usar data e hora</Text></Pressable>
        </View>
      </View>
    </Modal>}
  </View>;
}
