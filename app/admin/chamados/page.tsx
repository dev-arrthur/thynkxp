import TicketWorkspace from '../../../components/TicketWorkspace';

export default async function AdminTicketsPage({ searchParams }: { searchParams: Promise<{ id?: string; clientId?: string }> }) {
  const params = await searchParams;
  const clientId = typeof params.clientId === 'string' ? params.clientId : undefined;
  const ticketId = typeof params.id === 'string' ? params.id : undefined;
  return <>
    {clientId && <div className="tw-client-filter"><span>Atendimento do cliente selecionado</span><a href="/admin/chamados">Ver todos os clientes</a></div>}
    <TicketWorkspace mode="admin" clientId={clientId} ticketId={ticketId} />
  </>;
}
