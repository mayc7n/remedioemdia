import { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { EstadoRegistro, RegistroMedicamento } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { cores, estilos } from '../componentes/tema';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';

type Periodo = 'todos' | '7' | '30';

const periodos: Array<[Periodo, string]> = [['todos', 'Todos os períodos'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias']];

const visualDoEstado = (estado: EstadoRegistro) => {
  if (estado === 'taken') return { texto: 'Tomado', simbolo: '✓', marcador: estilos.historicoMarcadorTomado, status: estilos.statusTomado };
  if (estado === 'snoozed') return { texto: 'Adiado', simbolo: '↻', marcador: estilos.historicoMarcadorAdiado, status: estilos.statusAdiado };
  if (estado === 'missed') return { texto: 'Esquecido', simbolo: '!', marcador: estilos.historicoMarcadorEsquecido, status: estilos.statusEsquecido };
  return { texto: 'Pendente', simbolo: '○', marcador: estilos.historicoMarcadorPendente, status: estilos.statusPendente };
};

const dataSemHora = (valor: string) => {
  const data = new Date(valor);
  data.setHours(0, 0, 0, 0);
  return data;
};

export function Historico({ registros }: { registros: RegistroMedicamento[] }) {
  const [filtroMedicamento, setFiltroMedicamento] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const temFiltro = Boolean(filtroMedicamento.trim()) || periodo !== 'todos';
  const ordenados = useMemo(() => {
    const texto = filtroMedicamento.trim().toLocaleLowerCase('pt-BR');
    const limite = periodo === 'todos' ? undefined : dataSemHora(new Date().toISOString());
    if (limite && periodo !== 'todos') limite.setDate(limite.getDate() - Number(periodo) + 1);
    return [...registros]
      .filter((registro) => !texto || registro.medicamentoNome.toLocaleLowerCase('pt-BR').includes(texto))
      .filter((registro) => !limite || dataSemHora(registro.previstoPara) >= limite)
      .sort((a, b) => b.previstoPara.localeCompare(a.previstoPara));
  }, [filtroMedicamento, periodo, registros]);

  return <View>
    <Text style={estilos.titulo}>Histórico</Text>
    <Text style={estilos.lead}>O que aconteceu com seus lembretes, sem julgamento.</Text>
    <View style={estilos.historicoFiltros}>
      <Text style={estilos.label}>Filtrar por medicamento</Text>
      <TextInput accessibilityLabel="Filtrar por medicamento" placeholder="Digite o nome do medicamento" placeholderTextColor={cores.mutado} value={filtroMedicamento} onChangeText={setFiltroMedicamento} allowFontScaling style={estilos.input} />
      <Text style={[estilos.label, estilos.historicoPeriodoLabel]}>Período</Text>
      <View style={estilos.escolhas}>
        {periodos.map(([valor, texto]) => <Botao key={valor} texto={texto} variante={periodo === valor ? 'primario' : 'suave'} onPress={() => setPeriodo(valor)} accessibilityLabel={texto} accessibilityState={{ selected: periodo === valor }} />)}
      </View>
    </View>
    {ordenados.length === 0 ? <View style={estilos.vazio}><Text style={estilos.nome}>{temFiltro ? 'Nenhum registro encontrado' : 'Ainda não há registros'}</Text><Text style={estilos.secundario}>{temFiltro ? 'Tente mudar o medicamento ou o período.' : 'As marcações de hoje aparecerão aqui.'}</Text>{temFiltro && <Botao texto="Limpar filtros" variante="texto" onPress={() => { setFiltroMedicamento(''); setPeriodo('todos'); }} />}</View> : ordenados.map((registro) => {
      const visual = visualDoEstado(registro.estado);
      return <View style={estilos.historicoItem} key={registro.id}><View testID={`marcador-${registro.estado}`} style={[estilos.historicoMarcador, visual.marcador]} /><View style={estilos.flexivel}><Text style={estilos.nome}>{registro.medicamentoNome}</Text><Text style={estilos.secundario}>{formatarDataHoraBrasileira(registro.previstoPara.slice(0, 16))} · {registro.horario}</Text></View><Text style={[estilos.statusTexto, visual.status]}>{visual.simbolo} {visual.texto}</Text></View>;
    })}
  </View>;
}
