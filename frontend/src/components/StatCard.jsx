import { StatTile } from './ui/primitives';

export default function StatCard({ value, label }) {
  return <StatTile value={value} label={label} />;
}
