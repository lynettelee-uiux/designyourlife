// Explicit icon registry so the bundle only includes icons we use.
import {
  ArrowLeft, ArrowRight, Baby, BookOpen, Briefcase, Calculator, Check, ChevronDown, Circle, CircleCheck, CirclePause,
  Clock, Coffee, Compass, ExternalLink, GraduationCap, HeartHandshake, House, Info, KeyRound, Leaf, Lightbulb, Lock,
  Moon, Mountain, Palette, PawPrint, Pencil, PiggyBank, Plane, Repeat, Rocket, RotateCcw, ShieldCheck, Shuffle,
  SlidersHorizontal, Sparkles, Sunrise, Sunset, Thermometer, TrendingDown, TrendingUp, TriangleAlert, Umbrella, Users,
  Wallet, Waves, X, Zap, type LucideIcon,
} from 'lucide-react';

export const ICONS: Record<string, LucideIcon> = {
  ArrowLeft, ArrowRight, Baby, BookOpen, Briefcase, Calculator, Check, ChevronDown, Circle, CircleCheck,
  PauseCircle: CirclePause, Clock, Coffee, Compass, ExternalLink, GraduationCap, HeartHandshake, Home: House, Info,
  KeyRound, Leaf, Lightbulb, Lock, Moon, Mountain, Palette, PawPrint, Pencil, PiggyBank, Plane, Repeat, Rocket,
  RotateCcw, ShieldCheck, Shuffle, SlidersHorizontal, Sparkles, Sunrise, Sunset, Thermometer, TrendingDown, TrendingUp,
  TriangleAlert, Umbrella, Users, Wallet, Waves, X, Zap,
};
