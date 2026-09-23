import { useEffect, useMemo, useState } from 'react';
import { AppState, Text, TextInput, View } from 'react-native';
import { RegistroMedicamento } from '../dominio/agenda';
import { Botao } from '../componentes/Botao';
import { EstadoRegistroVisual, rotuloEstadoRegistro } from '../componentes/EstadoRegistro';
import { formatarDataHoraBrasileira } from '../componentes/DataHoraPicker';
import { cores, estilos } from '../componentes/tema';

type Periodo = 'todos' | '7' | '30';

const periodos: Array<[Periodo, string]> = [['todos', 'Todos os períodos'], ['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias']];

const chaveDataLocal = (valor: string | Date) => {
  const data = valor instanceof Date ? valor : new Date(valor);
  const doisDigitos = (numero: number) => String(numero).padStart(2, '0');
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
};

export function agruparRegistrosPorData(registros: RegistroMedicamento[]) {
  const grupos = new Map<string, RegistroMedicamento[]>();
  for (const registro of registros) {
    const chave = chaveDataLocal(registro.previstoPara);
    const grupo = grupos.get(chave);
    if (grupo) grupo.push(registro);
    else grupos.set(chave, [registro]);
  }
  return [...grupos.entries()].sort(([a], [b]) => b.localeCompare(a))
    .map(([chave, itens]) => ({ chave, registros: itens.sort((a, b) => new Date(b.previstoPara).getTime() - new Date(a.previstoPara).getTime()) }));
}

const dataSemHora = (valor: string | Date) => {
  const data = new Date(valor);
  data.setHours(0, 0, 0, 0);
  return data;
};

export function Historico({ registros, agora }: { registros: RegistroMedicamento[]; agora?: Date }) {
  const [filtroMedicamento, setFiltroMedicamento] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>('todos');
  const [relogio, setRelogio] = useState(() => new Date());
  const dataAtual = agora ?? relogio;
  useEffect(() => {
    if (agora) return;
    const proximaMeiaNoite = new Date(relogio.getFullYear(), relogio.getMonth(), relogio.getDate() + 1);
    const timer = setTimeout(() => setRelogio(new Date()), Math.max(1, proximaMeiaNoite.getTime() - relogio.getTime()));
    const assinatura = AppState.addEventListener('change', (estado) => {
      if (estado === 'active') setRelogio(new Date());
    });
    return () => { clearTimeout(timer); assinatura?.remove(); };
  }, [agora, relogio]);
  const temFiltro = Boolean(filtroMedicamento.trim()) || periodo !== 'todos';
  const ordenados = useMemo(() => {
    const texto = filtroMedicamento.trim().toLocaleLowerCase('pt-BR');
    const limite = periodo === 'todos' ? undefined : dataSemHora(dataAtual);
    if (limite && periodo !== 'todos') limite.setDate(limite.getDate() - Number(periodo) + 1);
    return [...registros]
      .filter((registro) => !texto || registro.medicamentoNome.toLocaleLowerCase('pt-BR').includes(texto))
      .filter((registro) => !limite || dataSemHora(registro.previstoPara) >= limite)
      .sort((a, b) => new Date(b.previstoPara).getTime() - new Date(a.previstoPara).getTime());
  }, [dataAtual, filtroMedicamento, periodo, registros]);
  const grupos = agruparRegistrosPorData(ordenados);
  const hoje = chaveDataLocal(dataAtual);
  const ontemData = new Date(dataAtual);
  ontemData.setDate(ontemData.getDate() - 1);
  const ontem = chaveDataLocal(ontemData);
  const tituloGrupo = (chave: string) => chave === hoje ? 'Hoje' : chave === ontem ? 'Ontem'
    : new Date(`${chave}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  return <View>
    <Text allowFontScaling style={estilos.titulo}>Histórico</Text>
    <Text allowFontScaling style={estilos.lead}>Consulte suas marcações.</Text>
    <View style={estilos.historicoFiltros}>
      <Text allowFontScaling style={estilos.label}>Filtrar por medicamento</Text>
      <TextInput accessibilityLabel="Filtrar por medicamento" placeholder="Digite o nome do medicamento" placeholderTextColor={cores.mutado} value={filtroMedicamento} onChangeText={setFiltroMedicamento} allowFontScaling style={estilos.input} />
      <Text allowFontScaling style={[estilos.label, estilos.historicoPeriodoLabel]}>Período</Text>
      <View style={estilos.escolhas}>
        {periodos.map(([valor, texto]) => <Botao key={valor} texto={texto} variante={periodo === valor ? 'primario' : 'suave'} onPress={() => setPeriodo(valor)} accessibilityLabel={texto} accessibilityState={{ selected: periodo === valor }} />)}
      </View>
    </View>
    {ordenados.length === 0 ? <View style={estilos.vazio}><Text allowFontScaling style={estilos.nome}>{temFiltro ? 'Nenhum registro encontrado' : 'Ainda não há registros'}</Text><Text allowFontScaling style={estilos.secundario}>{temFiltro ? 'Tente mudar o medicamento ou o período.' : 'As marcações de hoje aparecerão aqui.'}</Text>{temFiltro && <Botao texto="Limpar filtros" variante="texto" onPress={() => { setFiltroMedicamento(''); setPeriodo('todos'); }} />}</View> : grupos.map((grupo) => <View key={grupo.chave}>
      <Text allowFontScaling accessibilityRole="header" style={estilos.historicoGrupoTitulo}>{tituloGrupo(grupo.chave)}</Text>
      {grupo.registros.map((registro) => <View accessible accessibilityRole="text" accessibilityLabel={`${formatarDataHoraBrasileira(registro.previstoPara.slice(0, 16))}, ${registro.medicamentoNome}, ${rotuloEstadoRegistro(registro.estado)}`} style={estilos.historicoItem} key={registro.id}>
        <Text allowFontScaling style={estilos.historicoHorario}>{registro.horario}</Text>
        <View style={estilos.flexivel}><Text allowFontScaling style={estilos.nome}>{registro.medicamentoNome}</Text><EstadoRegistroVisual estado={registro.estado} compacto /></View>
      </View>)}
    </View>)}
  </View>;
}
