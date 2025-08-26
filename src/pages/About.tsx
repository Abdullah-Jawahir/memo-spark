import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Users, Globe, Shield, Lightbulb, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const About = () => {
  const values = [
    {
      icon: Heart,
      title: "Accessibility First",
      description: "We believe quality education should be accessible to everyone, regardless of language, location, or economic background."
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Our platform thrives on the collective knowledge and collaboration of learners and educators worldwide."
    },
    {
      icon: Globe,
      title: "Cultural Inclusivity",
      description: "Supporting multiple languages and cultural contexts to serve diverse learning communities globally."
    },
    {
      icon: Shield,
      title: "Privacy Protection",
      description: "Your data and privacy are sacred. We maintain the highest standards of security and transparency."
    },
    {
      icon: Lightbulb,
      title: "Innovation",
      description: "Constantly pushing the boundaries of what's possible in educational technology and AI-assisted learning."
    },
    {
      icon: Target,
      title: "Student Success",
      description: "Every feature we build is designed with one goal: helping students learn more effectively and enjoyably."
    }
  ];

  const team = [
    {
      name: "Alex Chen",
      role: "Founder & CEO",
      bio: "Former educator passionate about making learning accessible through technology.",
      avatar: "AC"
    },
    {
      name: "Maria Rodriguez",
      role: "Head of Product",
      bio: "UX expert focused on creating intuitive and inclusive learning experiences.",
      avatar: "MR"
    },
    {
      name: "Dr. Priya Sharma",
      role: "AI Research Lead",
      bio: "PhD in Machine Learning, specializing in multilingual NLP and educational AI.",
      avatar: "PS"
    },
    {
      name: "David Kim",
      role: "Engineering Lead",
      bio: "Full-stack developer building scalable platforms for global education.",
      avatar: "DK"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-950 dark:to-gray-800">
      <Header currentLanguage="en" />

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            Our Mission:
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Democratize Learning</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
            MemoSpark was born from a simple belief: every student deserves access to powerful,
            personalized learning tools that adapt to their unique needs and cultural context.
            We're building the future of education, one flashcard at a time.
          </p>
        </div>

        {/* Story Section */}
        <div className="mb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Why MemoSpark Exists</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  In classrooms around the world, we noticed students struggling with traditional study methods
                  that didn't adapt to their learning pace or cultural background. Many talented learners were
                  left behind simply because existing tools weren't designed for their needs.
                </p>
                <p>
                  That's when we decided to create something different. MemoSpark combines cutting-edge AI
                  with deep respect for linguistic diversity, creating personalized learning experiences
                  that work for students in English, Sinhala, Tamil, and beyond.
                </p>
                <p>
                  Today, thousands of students and educators use MemoSpark to transform how they create,
                  study, and share knowledge. But we're just getting started.
                </p>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-gray-900 dark:to-gray-800 rounded-2xl p-8 text-center">
              <div className="text-6xl font-bold text-blue-600 mb-2">50K+</div>
              <div className="text-muted-foreground font-medium mb-4">Students Empowered</div>
              <div className="text-4xl font-bold text-purple-600 mb-2">1M+</div>
              <div className="text-muted-foreground font-medium mb-4">Flashcards Created</div>
              <div className="text-4xl font-bold text-green-600 mb-2">25+</div>
              <div className="text-muted-foreground font-medium">Countries Reached</div>
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Our Core Values</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {values.map((value, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full w-fit mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <value.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{value.title}</h3>
                  <p className="text-muted-foreground">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {team.map((member, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 group-hover:scale-110 transition-transform">
                    {member.avatar}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">{member.name}</h3>
                  <p className="text-muted-foreground text-sm">{member.bio}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Join Us Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">Join Our Learning Revolution</h2>
          <p className="text-xl mb-8 opacity-90">
            Ready to be part of a community that's transforming education for everyone?
            Let's build the future of learning together.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button className="bg-card text-blue-600 hover:bg-muted px-8 py-3">
                Start Learning Today
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="border-card text-card-foreground hover:bg-muted/10 px-8 py-3">
                Get In Touch
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default About;
