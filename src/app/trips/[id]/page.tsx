import TripDetailsClient from './TripDetailsClient';

export function generateStaticParams() {
  return [{ id: '_' }];
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TripDetailsClient id={id} />;
}
