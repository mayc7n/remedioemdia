import { Alert, Text, View } from 'react-native';
import { Botao } from '../componentes/Botao';
import { Campo } from '../componentes/Campo';
import { cores, estilos } from '../componentes/tema';

type Avisos = { esquecido: boolean; adiado: boolean; consulta: boolean };
type Props = { nome: string; setNome: (valor: string) => void; contato: string; setContato: (valor: string) => void; avisos: Avisos; setAvisos: (valor: Avisos) => void; salvar: () => void; revogar?: () => void; };

export function CuidadorForm({ nome, setNome, contato, setContato, avisos, setAvisos, salvar, revogar }: Props) {
  const alternar = (chave: keyof Avisos) => setAvisos({ ...avisos, [chave]: !avisos[chave] });
  const confirmarRevogacao = () => {
    if (!revogar) return;
    Alert.alert('Revogar autorização?', 'O cuidador deixará de receber avisos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Revogar', style: 'destructive', onPress: revogar },
    ]);
  };
  return <View><Text style={estilos.ajuda}>A autorização fica registrada neste aparelho. Nenhum aviso externo será enviado nesta versão.</Text><Campo label="Nome do cuidador" value={nome} onChangeText={setNome} placeholder="Ex.: Ana" /><Campo label="Contato" value={contato} onChangeText={setContato} placeholder="Telefone ou e-mail" keyboardType="phone-pad" /><Text style={estilos.label}>Quais avisos registrar?</Text>{([['esquecido', 'Medicamento esquecido'], ['adiado', 'Medicamento adiado'], ['consulta', 'Consulta próxima']] as [keyof Avisos, string][]).map(([chave, texto]) => <Botao key={chave} texto={`${avisos[chave] ? 'Selecionado' : 'Não selecionado'}: ${texto}`} variante={avisos[chave] ? 'primario' : 'suave'} onPress={() => alternar(chave)} accessibilityLabel={texto} accessibilityHint="Alterna este tipo de registro" accessibilityState={{ selected: avisos[chave] }} />)}<Botao texto="Autorizar cuidador" onPress={salvar} accessibilityHint="Solicita confirmação antes de salvar" />{revogar && <Botao texto="Revogar autorização" variante="perigo" onPress={confirmarRevogacao} accessibilityHint="Desativa o cuidador neste aparelho" />}<Text style={{ color: cores.mutado, fontSize: 14, marginTop: 12 }}>Você poderá revogar esta autorização depois.</Text></View>;
}
