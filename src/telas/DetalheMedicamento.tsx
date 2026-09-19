import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { Medicamento, RegistroMedicamento } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { Campo, Rotulo } from '../componentes/Campo';
import { SeletorFrequencia } from '../componentes/SeletorFrequencia';
import { HorarioPicker } from '../componentes/HorarioPicker';
import { cores, estilos } from '../componentes/tema';

type Props = {
  medicamento: Medicamento;
  registros: RegistroMedicamento[];
  onSalvar: (medicamento: Medicamento) => void;
  onPausar: (situacao: 'ativo' | 'pausado') => void;
  onExcluir: () => void;
  novo?: boolean;
};

const horarioValido = (horario: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(horario);

export function DetalheMedicamento({ medicamento, registros, onSalvar, onPausar, onExcluir, novo = false }: Props) {
  const [nome, setNome] = useState(medicamento.nome);
  const [observacao, setObservacao] = useState(medicamento.observacao ?? '');
  const [horarios, setHorarios] = useState(medicamento.horarios);
  const [frequencia, setFrequencia] = useState(medicamento.frequencia);
  const registrosRecentes = useMemo(() => registros.filter((registro) => registro.medicamentoId === medicamento.id).slice(0, 5), [medicamento.id, registros]);

  const salvar = () => {
    const horariosLimpos = Array.from(new Set(horarios.map((horario) => horario.trim()).filter(horarioValido))).sort();
    if (!nome.trim() || horariosLimpos.length === 0 || (frequencia.tipo === 'diasDaSemana' && frequencia.dias.length === 0) || (frequencia.tipo === 'intervalo' && frequencia.aCadaDias < 1)) {
      Alert.alert('Confira os dados', 'Informe nome, pelo menos um horário e uma frequência válida.');
      return;
    }
    onSalvar({
      ...medicamento,
      nome: nome.trim(),
      observacao: observacao.trim() || undefined,
      horarios: horariosLimpos,
      frequencia,
      atualizadoEm: new Date().toISOString(),
    });
  };

  const excluir = () => Alert.alert('Excluir medicamento?', 'O histórico será preservado.', [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Excluir', style: 'destructive', onPress: onExcluir },
  ]);

  return <ScrollView>
    <Text style={estilos.titulo}>{novo ? 'Novo medicamento' : 'Detalhe do medicamento'}</Text>
    <Text style={estilos.ajuda}>A observação deve repetir apenas o que foi fornecido pelo seu médico. O app não altera doses.</Text>
    <Campo label="Nome do medicamento" value={nome} onChangeText={setNome} placeholder="Ex.: Remédio da manhã" />
    <Rotulo>Horários</Rotulo>
    <Text style={estilos.ajudaCampo}>Escolha horários exatos. O app salva e agenda sempre no formato de 24 horas.</Text>
    {horarios.map((horario, indice) => <HorarioPicker key={`${indice}-${horario}`} indice={indice} valor={horario} onChange={(valor) => setHorarios((atuais) => atuais.map((atual, atualIndice) => atualIndice === indice ? valor : atual))} remover={horarios.length > 1 ? () => setHorarios((atuais) => atuais.filter((_, atualIndice) => atualIndice !== indice)) : undefined} />)}
    <Botao texto="Adicionar horário" variante="suave" onPress={() => setHorarios((atuais) => [...atuais, '20:00'])} />
    <SeletorFrequencia value={frequencia} onChange={setFrequencia} />
    <Campo label="Observação do médico (opcional)" value={observacao} onChangeText={setObservacao} placeholder="Ex.: conforme orientação recebida" multiline />
    <Botao texto="Salvar medicamento" onPress={salvar} />
    {!novo && <><Botao texto={medicamento.situacao === 'pausado' ? 'Retomar lembretes' : 'Pausar lembretes'} variante="suave" onPress={() => onPausar(medicamento.situacao === 'pausado' ? 'ativo' : 'pausado')} accessibilityLabel={medicamento.situacao === 'pausado' ? 'Retomar lembretes' : 'Pausar lembretes'} />
      <Botao texto="Excluir medicamento" variante="perigo" onPress={excluir} />
      <View style={{ marginTop: 22, padding: 16, borderRadius: 16, backgroundColor: cores.branco, borderWidth: 1, borderColor: cores.borda }}><Text style={estilos.nome}>Histórico recente</Text>{registrosRecentes.length === 0 ? <Text style={estilos.secundario}>Ainda não há registros.</Text> : registrosRecentes.map((registro) => <Text key={registro.id} style={estilos.secundario}>{registro.horario} · {registro.estado}</Text>)}</View></>}
  </ScrollView>;
}
