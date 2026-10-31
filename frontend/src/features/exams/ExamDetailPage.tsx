import { ClipboardCheck, Download, Upload, Wand2 } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, Button, ButtonLink, Card, Skeleton, toast } from '@/components/ui';
import { formatDateLong, plural } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import { subtopicById } from '@/api/catalog/catalog.store';
import { getExam } from '@/api/exams/exam.api';
import { QuestionKey, SolutionUpload } from './AnswerKey';
import { StatusBadge } from './StatusBadge';
import './exams.css';

export function ExamDetailPage() {
  const { examId = '' } = useParams();
  const q = useQuery(() => getExam(examId), [examId]);
  useCrumbs([{ label: 'Provas', to: '/provas' }, { label: q.data?.exam.title ?? 'Prova' }]);
  return (
    <Async query={q} skeleton={<div style={{ display: 'grid', gap: 16 }}><Skeleton w="40%" h="2rem" /><Skeleton h="20rem" r="var(--r-lg)" /></div>}>
      {({ exam, questions }) => (
        <>
          <PageHeader
            title={exam.title}
            description={`${exam.className} · ${formatDateLong(exam.date)}`}
            actions={<>
              <StatusBadge status={exam.status} />
              {(exam.status === 'rascunho' || exam.status === 'em_adaptacao') && <ButtonLink variant="primary" to={`/provas/${exam.id}/adaptar`}><Wand2 />{exam.status === 'rascunho' ? 'Adaptar com IA' : 'Continuar revisão'}</ButtonLink>}
            </>}
          />
          <div className="detail-grid">
            <Card>
              <div className="section-bar"><h2>Questões</h2><span className="muted">{questions.filter((x) => x.keySource).length} de {plural(questions.length, 'questão', 'questões')} com gabarito</span></div>
              <ol>
                {questions.map((x, i) => (
                  <li className="exam-q" key={x.id}>
                    <span className="q-num">{i + 1}</span>
                    <div>
                      <p className="prose">{x.statement}</p>
                      <div className="q-meta"><Badge>{subtopicById(x.subtopicId).name}</Badge><span className="muted" style={{ fontSize: 'var(--text-sm)' }}>{x.points} pt</span></div>
                      <QuestionKey examId={exam.id} question={x} locked={exam.status === 'corrigida'} />
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
            <div className="detail-side">
            {exam.status !== 'corrigida' && <SolutionUpload examId={exam.id} />}
            {exam.status !== 'em_adaptacao' && (
              <Card>
                <div className="section-bar"><h2>Correção</h2></div>
                <p className="muted" style={{ marginBottom: 'var(--s-3)' }}>Depois de aplicar a prova, envie o que os alunos responderam. A IA corrige pelo seu gabarito e define as competências de cada aluno.</p>
                <div className="key-actions">
                  {exam.status === 'corrigida' && <ButtonLink variant="primary" to={`/provas/${exam.id}/correcoes`}><ClipboardCheck />Ver correções</ButtonLink>}
                  <ButtonLink variant={exam.status === 'corrigida' ? 'secondary' : 'primary'} to={`/provas/enviar?prova=${exam.id}`}><Upload />Enviar provas dos alunos</ButtonLink>
                </div>
              </Card>
            )}
            <Card>
              {exam.partialReads ? <p style={{ marginBottom: 'var(--s-4)' }}><Badge tone="caution">{plural(exam.partialReads, 'folha a conferir', 'folhas a conferir')}</Badge> <span className="muted">A IA leu estas folhas só em parte.</span></p> : null}
              <div className="section-bar"><h2>Versões</h2></div>
              {exam.versions.length === 0 && <p className="muted">Por enquanto só existe a versão original. Adapte com IA para gerar as versões da turma.</p>}
              {exam.versions.map((v) => (
                <div className="version" key={v.id}>
                  <strong>{v.label}</strong>
                  <p>{plural(v.studentIds.length, 'aluno', 'alunos')}</p>
                </div>
              ))}
              {exam.versions.length > 1 && <div style={{ marginTop: 'var(--s-4)' }}><Button variant="secondary" onClick={() => toast('Exportação em PDF disponível com o backend real')}><Download />Exportar versões</Button></div>}
            </Card>
            </div>
          </div>
        </>
      )}
    </Async>
  );
}
