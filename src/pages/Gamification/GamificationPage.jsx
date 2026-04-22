import { Trophy } from 'lucide-react';
export default function GamificationPage() {
  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Achievements</h1>
        <p>Streaks, badges, milestones — coming in Phase 5</p>
      </div>
      <div className="empty-state">
        <Trophy size={48} />
        <h3>Gamification — Phase 5</h3>
        <p>Daily streaks, milestone badges, weekly consistency scores.</p>
      </div>
    </div>
  );
}
