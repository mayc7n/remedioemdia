import { useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Botao } from '../componentes/Botao';
import { EscolhaModoCuidador, type ModoCuidadorEscolhido } from '../componentes/EscolhaModoCuidador';
import { estilos } from '../componentes/tema';

type Props = {
  somenteModo?: boolean;
  onConcluir: (modo: ModoCuidadorEscolhido) => void | Promise<void>;
};

export function BoasVindas({ somenteModo = false, onConcluir }: Props) {
  const [modo, setModo] = useState<ModoCuidadorEscolhido | null>(null);
  const [enviando, setEnviando] = useState(false);
  const envioEmAndamento = useRef(false);

  const concluir = async () => {
    if (!modo || envioEmAndamento.current) return;
    envioEmAndamento.current = true;
    setEnviando(true);
    try {
      await onConcluir(modo);
    } catch {
      Alert.alert('Não foi possível salvar', 'Tente novamente.');
    } finally {
      envioEmAndamento.current = false;
      setEnviando(false);
    }
  };

  return <SafeAreaView style={estilos.tela}>
    <StatusBar style="dark" />
    <ScrollView contentContainerStyle={[estilos.conteudo, estilos.boasVindasConteudo]}>
      {!somenteModo && <>
        <Text allowFontScaling style={estilos.boasVindasMarca}>Remédio em Dia</Text>
        <Text allowFontScaling style={estilos.titulo}>Organize seus cuidados</Text>
        <Text allowFontScaling style={estilos.boasVindasTexto}>Organize medicamentos, consultas e exames com lembretes locais.</Text>
        <Text allowFontScaling style={estilos.boasVindasTexto}>Seus dados ficam neste aparelho. O app funciona sem Internet.</Text>
        <View style={estilos.avisoClinico}>
          <Text allowFontScaling style={estilos.nome}>Um lembrete, não uma prescrição.</Text>
          <Text allowFontScaling style={estilos.secundario}>Siga sempre a orientação do seu médico. O app não altera doses nem oferece diagnóstico.</Text>
        </View>
      </>}

      <Text allowFontScaling style={somenteModo ? estilos.titulo : estilos.secaoTitulo}>Você conta com a ajuda de um cuidador?</Text>
      <Text allowFontScaling style={estilos.ajuda}>Essa escolha organiza as opções mostradas no app. Você pode mudá-la depois.</Text>
      <EscolhaModoCuidador valor={modo} onChange={setModo} desativado={enviando} />
      <View style={estilos.boasVindasAcao}>
        <Botao texto={somenteModo ? 'Continuar' : 'Começar'} desativado={!modo || enviando} onPress={() => { void concluir(); }} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}
