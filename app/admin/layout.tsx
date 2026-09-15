import '../admin-shell-v4.css';
import AdminShell from '../../components/AdminShell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
