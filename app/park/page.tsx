import { ParkWorld } from '@/components/park/park-world';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Trailer Park Simulator',
  description: 'Twelve single-wides on a dead-end road. You live in one, alone.',
};

export default function ParkPage(): JSX.Element {
  return <ParkWorld />;
}
