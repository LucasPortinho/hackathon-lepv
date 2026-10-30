import { ChevronDown, ChevronUp } from 'lucide-react';
import { Async, Button, Crossfade, Sheet, Tooltip } from '@/components/ui';
import { useQuery } from '@/lib/useQuery';
import { getStudentDetail } from '@/services/profiles';
import { ProfileSkeleton, ReviewActions, StudentProfileBody } from './StudentProfile';

interface Props { studentId: string; subjectId: string; onClose: () => void; onStep: (dir: 1 | -1) => void; morphing?: boolean }

export function StudentSheet({ studentId, subjectId, onClose, onStep, morphing }: Props) {
  const q = useQuery(() => getStudentDetail(studentId, subjectId), [studentId, subjectId]);
  const draft = q.data?.student.id === studentId ? q.data.profile.review !== 'aprovado' : true;
  return (
    <Sheet
      label="Perfil do aluno" width="var(--sheet-w-profile)" draft={draft} onClose={onClose} focusKey={studentId} morphing={morphing}
      headerActions={<>
        <Tooltip label="Aluno anterior"><Button variant="ghost" size="sm" icon aria-label="Aluno anterior" onClick={() => onStep(-1)}><ChevronUp /></Button></Tooltip>
        <Tooltip label="Próximo aluno"><Button variant="ghost" size="sm" icon aria-label="Próximo aluno" onClick={() => onStep(1)}><ChevronDown /></Button></Tooltip>
      </>}
      footer={q.data && !q.loading ? <ReviewActions key={studentId} detail={q.data} /> : undefined}
    >
      <Crossfade k={studentId}>
        <Async query={q} skeleton={<ProfileSkeleton />}>{(d) => <StudentProfileBody detail={d} />}</Async>
      </Crossfade>
    </Sheet>
  );
}
