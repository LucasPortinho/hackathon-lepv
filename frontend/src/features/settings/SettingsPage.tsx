import { useState } from 'react';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Card, Segmented, Select } from '@/components/ui';
import { usePrefs } from '@/lib/prefs';
import { getTeacher } from '@/services/catalog';
import { getScenario, setScenario, type Scenario } from '@/services/client';
import './settings.css';

function Row({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return <div className="set-row"><div><h3>{title}</h3><p>{hint}</p></div>{children}</div>;
}

export function SettingsPage() {
  useCrumbs([{ label: 'Configurações' }]);
  const { prefs, set } = usePrefs();
  const teacher = getTeacher();
  const [scenario, setS] = useState(getScenario());
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="settings">
        <Card>
          <h2>Leitura e acessibilidade</h2>
          <Row title="Reduzir movimento" hint="Troca transições por mudanças imediatas. &quot;Sistema&quot; segue o seu dispositivo.">
            <Segmented label="Reduzir movimento" value={prefs.motion} onChange={(v) => set('motion', v)} options={[{ value: 'sistema', label: 'Sistema' }, { value: 'reduzir', label: 'Reduzir' }, { value: 'completo', label: 'Completo' }]} />
          </Row>
          <Row title="Fonte" hint="A fonte de leitura tem letras mais fáceis de distinguir.">
            <Segmented label="Fonte" value={prefs.font} onChange={(v) => set('font', v)} options={[{ value: 'padrao', label: 'Padrão' }, { value: 'leitura', label: 'Leitura' }]} />
          </Row>
          <Row title="Espaçamento" hint="Mais espaço entre linhas e palavras e linhas de texto mais curtas.">
            <Segmented label="Espaçamento" value={prefs.spacing} onChange={(v) => set('spacing', v)} options={[{ value: 'padrao', label: 'Padrão' }, { value: 'confortavel', label: 'Confortável' }]} />
          </Row>
          <Row title="Tema" hint="O tema escuro usa os mesmos tokens de cor.">
            <Segmented label="Tema" value={prefs.theme} onChange={(v) => set('theme', v)} options={[{ value: 'claro', label: 'Claro' }, { value: 'escuro', label: 'Escuro' }]} />
          </Row>
        </Card>
        <Card>
          <h2>Perfil</h2>
          <dl className="set-dl"><dt>Nome</dt><dd>{teacher.name}</dd><dt>Função</dt><dd>{teacher.role}</dd><dt>E-mail</dt><dd>{teacher.email}</dd></dl>
        </Card>
        <Card>
          <h2>Demonstração</h2>
          <Row title="Cenário dos dados" hint="Mostra os estados das telas. &quot;Dados parciais&quot; afeta Dashboard, Provas e Alunos. Recarrega a página ao mudar.">
            <Select
              hideLabel label="Cenário dos dados" value={scenario} style={{ width: '13rem' }}
              onChange={(v) => { setS(v as Scenario); setScenario(v as Scenario); location.reload(); }}
              options={[{ value: 'normal', label: 'Normal' }, { value: 'lento', label: 'Conexão lenta' }, { value: 'parcial', label: 'Dados parciais' }, { value: 'vazio', label: 'Sem dados' }, { value: 'erro', label: 'Erro ao carregar' }]}
            />
          </Row>
        </Card>
      </div>
    </>
  );
}
