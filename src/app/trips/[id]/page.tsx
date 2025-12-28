import TripDetailsClient from './TripDetailsClient';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailsClient id={id} />;
}
