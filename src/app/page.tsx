import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';

export default async function HomePage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  if (session.isPrimaryAdmin || session.isAdmin || session.isManager) {
    redirect('/dashboard');
  }

  redirect('/my-ledger');
}
