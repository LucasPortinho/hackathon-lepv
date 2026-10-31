import { ClipboardCheck, Upload } from 'lucide-react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { PageHeader } from '@/components/shell/PageHeader';
import { Async, Badge, ButtonLink, Card, EmptyState, Skeleton } from '@/components/ui';
import { getExam, listCorrections, sheetImageUrl } from '@/api/exams/exam.api';
import { plural } from '@/lib/format';
import { useQuery } from '@/lib/useQuery';
import type { CorrectedAnswer, CorrectedSheet, ExamQuestion } from '@/types/domain';
import './exams.css';

const points = (value: number) => value.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const sheetName = (sheet: CorrectedSheet) => sheet.student?.name ?? sheet.readName ?? 'Aluno não identificado';
const needsCheck = (sheet: CorrectedSheet) => sheet.readStatus === 'parcial' || sheet.readStatus === 'erro';
const wasCorrected = (sheet: CorrectedSheet) => sheet.answers.some((a) => a.awardedPoints !== null);

function SheetList({ sheets, current, maxPoints, onPick }: { sheets: CorrectedSheet[]; current: CorrectedSheet; maxPoints: number; onPick: (id: string) => void }) {
  return (
    <Card className="sheet-list">
      <div className="section-bar"><h2>Alunos</h2><span className="muted">{plural(sheets.length, 'folha', 'folhas')}</span></div>
      <ul>
        {sheets.map((sheet) => (
          <li key={sheet.id}>
            <button type="button" className="sheet-pick" aria-current={sheet.id === current.id} onClick={() => onPick(sheet.id)}>
              <span className="truncate">{sheetName(sheet)}</span>
              {needsCheck(sheet) ? <Badge tone="caution">Conferir</Badge> : wasCorrected(sheet) ? <span className="muted">{points(sheet.earned)} / {points(maxPoints)}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function QuestionResult({ index, question, answer }: { index: number; question: ExamQuestion; answer: CorrectedAnswer }) {
  const illegible = answer.awardedPoints === null;
  return (
    <li className="exam-q">
      <span className="q-num">{index + 1}</span>
      <div>
        <p className="prose">{question.statement}</p>
        {(question.answerKey || question.solution) && <p className="muted result-key"><b>Gabarito:</b> {question.answerKey ?? question.solution}</p>}
        <div className="key-box">
          <p><b>Resposta do aluno:</b> {answer.answer ?? <span className="muted">{illegible ? 'não foi possível ler' : 'em branco'}</span>}</p>
          {answer.feedback && <p>{answer.feedback}</p>}
          <div className="key-actions">{illegible ? <Badge tone="caution">Não corrigida</Badge> : <Badge>{points(answer.awardedPoints!)} de {points(question.points)} {question.points === 1 ? 'ponto' : 'pontos'}</Badge>}</div>
        </div>
      </div>
    </li>
  );
}

function SheetDetail({ examId, sheet, questions, maxPoints }: { examId: string; sheet: CorrectedSheet; questions: ExamQuestion[]; maxPoints: number }) {
  const name = sheetName(sheet);
  return (
    <div className="sheet-detail">
      <Card>
        <div className="section-bar"><h2>Prova do aluno</h2></div>
        {sheet.hasImage ? (
          <a href={sheetImageUrl(examId, sheet.id)} target="_blank" rel="noreferrer" title="Abrir a folha em tamanho real">
            <img key={sheet.id} className="sheet-image" src={sheetImageUrl(examId, sheet.id)} alt={`Folha de ${name}`} />
          </a>
        ) : <p className="muted">A imagem desta folha não está disponível. Só as provas corrigidas a partir de agora guardam a imagem.</p>}
      </Card>
      <Card>
        <div className="section-bar"><h2>{name}</h2>{wasCorrected(sheet) && <span className="muted">{points(sheet.earned)} de {points(maxPoints)} pontos</span>}</div>
        {needsCheck(sheet) && <p style={{ marginBottom: 'var(--s-3)' }}><Badge tone="caution">Conferir</Badge> <span className="muted">{sheet.partialReason ?? 'Leitura parcial.'}</span></p>}
        {wasCorrected(sheet)
          ? <ol>{questions.map((q, i) => <QuestionResult key={q.id} index={i} question={q} answer={sheet.answers[i]} />)}</ol>
          : <p className="muted">{needsCheck(sheet) ? 'Esta folha não foi corrigida e não entrou nas notas. Confira a imagem.' : 'Esta folha não tem correção por questão registrada.'}</p>}
      </Card>
    </div>
  );
}

export function CorrectionsPage() {
  const { examId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const exam = useQuery(() => getExam(examId), [examId]);
  const corrections = useQuery(() => listCorrections(examId), [examId]);
  const title = exam.data?.exam.title ?? 'Prova';
  useCrumbs([{ label: 'Provas', to: '/provas' }, { label: title, to: `/provas/${examId}` }, { label: 'Correções' }]);

  return (
    <>
      <PageHeader title="Correções" description={title} />
      <Async
        query={corrections}
        skeleton={<Skeleton h="24rem" r="var(--r-lg)" />}
        isEmpty={(d) => d.sheets.length === 0}
        empty={<EmptyState icon={<ClipboardCheck />} title="Nenhuma prova corrigida ainda" actions={<ButtonLink variant="primary" to={`/provas/enviar?prova=${examId}`}><Upload />Enviar provas dos alunos</ButtonLink>}>As correções aparecem aqui depois que você enviar as provas dos alunos.</EmptyState>}
      >
        {({ sheets, questions, maxPoints }) => {
          const current = sheets.find((s) => s.id === params.get('folha')) ?? sheets[0];
          return (
            <div className="corrections">
              <SheetList sheets={sheets} current={current} maxPoints={maxPoints} onPick={(folha) => setParams({ folha }, { replace: true })} />
              <SheetDetail examId={examId} sheet={current} questions={questions} maxPoints={maxPoints} />
            </div>
          );
        }}
      </Async>
    </>
  );
}
