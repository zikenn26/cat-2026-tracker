import { 
  Trophy, Zap, Target, BookOpen, Clock, 
  Flame, Award, Shield, Star, Medal
} from 'lucide-react';

export const BADGES = [
  {
    id: 'first_session',
    name: 'First Step',
    description: 'Completed your first study session',
    icon: Zap,
    color: '#6366f1',
    check: (stats) => stats.total_hours > 0
  },
  {
    id: 'question_100',
    name: 'Centurion',
    description: 'Solved 100+ questions',
    icon: Target,
    color: '#22c55e',
    check: (stats) => stats.total_questions >= 100
  },
  {
    id: 'question_500',
    name: 'Sharp Shooter',
    description: 'Solved 500+ questions',
    icon: Trophy,
    color: '#06b6d4',
    check: (stats) => stats.total_questions >= 500
  },
  {
    id: 'hours_10',
    name: 'Deep Diver',
    description: '10 hours of focused study',
    icon: Clock,
    color: '#8b5cf6',
    check: (stats) => stats.total_hours >= 10
  },
  {
    id: 'streak_7',
    name: 'Consistent',
    description: '7-day study streak',
    icon: Flame,
    color: '#ef4444',
    check: (stats) => stats.longest_streak >= 7
  },
  {
    id: 'accuracy_hero',
    name: 'Perfectionist',
    description: 'Maintain 90%+ accuracy over 100 questions',
    icon: Star,
    color: '#eab308',
    check: (stats) => stats.total_questions >= 100 && (stats.total_correct / stats.total_questions) >= 0.9
  }
];
