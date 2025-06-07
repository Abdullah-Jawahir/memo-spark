
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

const FeatureCard = ({ feature, index }: FeatureCardProps) => {
  const { icon: Icon, title, description, color } = feature;

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 animate-fade-in border-0 bg-white/80 backdrop-blur-sm" style={{ animationDelay: `${index * 200}ms` }}>
      <CardContent className="p-8 text-center">
        <div className={`w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-r ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="h-8 w-8 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
};

export default FeatureCard;
