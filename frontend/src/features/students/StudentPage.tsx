import { motion } from 'motion/react';
import { useParams } from 'react-router-dom';
import { useCrumbs } from '@/components/shell/Crumbs';
import { Async, Card } from '@/components/ui';
import { Ticks, useSettle } from '@/components/ui/Sheet';
import { useQuery } from '@/lib/useQuery';
import { getStudentDetail } from '@/api/profiles/profile.api';
import { ProfileSkeleton, ReviewActions, StudentProfileBody } from './StudentProfile';

/** The same document as the dashboard sheet, for arriving from Alunos or a shared link. */
export function StudentPage() {
  const { studentId = '' } = useParams();
  const q = useQuery(() => getStudentDetail(studentId), [studentId]);
  const draft = q.data ? q.data.profile.review !== 'aprovado' : false;
  const controls = useSettle(draft);
  useCrumbs([{ label: 'Alunos', to: '/alunos' }, { label: q.data?.student.name ?? 'Aluno' }]);
  return (
    <div className="pf-page-grid">
      <motion.div animate={controls}>
        <Card pad={false} className="pf-page">
          <Ticks show={draft} />
          <Async query={q} skeleton={<ProfileSkeleton />}>{(d) => (
            <>
              <StudentProfileBody detail={d} />
              <div className="pf-page-foot"><ReviewActions key={d.student.id} detail={d} /></div>
            </>
          )}</Async>
        </Card>
      </motion.div>
    </div>
  );
}
