import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { LoginForm } from './login-form';
import { getLoginMembersListAction } from '@/app/actions/auth';

export default async function LoginPage() {
  const session = await getSession();

  // If already logged in, redirect appropriately
  if (session) {
    if (session.isPrimaryAdmin || session.isAdmin || session.isManager) {
      redirect('/dashboard');
    } else {
      redirect('/my-ledger');
    }
  }

  const mess = await prisma.mess.findFirst({
    include: { profile: true },
  });

  const messName = mess?.profile?.messName || mess?.name || "Tarek's Residence";
  const messLogoUrl = mess?.profile?.logoUrl || mess?.logoUrl || null;

  const members = await getLoginMembersListAction();

  return (
    <LoginForm
      members={members}
      messName={messName}
      messLogoUrl={messLogoUrl}
    />
  );
}
