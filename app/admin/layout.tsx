import AdminRadarShortcut from '../../components/AdminRadarShortcut';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <AdminRadarShortcut />
    </>
  );
}
