
import { Badge } from '@/components/ui/badge';

const StatsSection = () => {
  const stats = [
    { number: "10K+", label: "Active Learners" },
    { number: "50K+", label: "Flashcards Created" },
    { number: "3", label: "Languages Supported" },
    { number: "95%", label: "Success Rate" }
  ];

  return (
    <section className="py-20 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Trusted by thousands
          </Badge>
          <h2 className="text-4xl font-bold text-gray-900 mb-6">
            Proven results across communities
          </h2>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat, index) => (
            <div key={index} className="text-center animate-fade-in" style={{ animationDelay: `${index * 200}ms` }}>
              <div className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
