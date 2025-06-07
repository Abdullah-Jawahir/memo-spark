
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

const Pricing = () => {
  const plans = [
    {
      name: "Student",
      price: "Free",
      period: "forever",
      popular: true,
      description: "Perfect for individual learners and students",
      features: [
        "Create unlimited flashcards",
        "AI-powered card generation",
        "Multilingual support (3 languages)",
        "Basic spaced repetition",
        "Community deck sharing",
        "Mobile app access",
        "Cloud sync (basic)",
        "Email support"
      ],
      cta: "Get Started Free",
      highlight: true
    },
    {
      name: "Educator",
      price: "$9",
      period: "per month",
      popular: false,
      description: "Enhanced features for teachers and educators",
      features: [
        "Everything in Student plan",
        "Advanced analytics dashboard",
        "Classroom management tools",
        "Bulk deck creation",
        "Custom branding options",
        "Priority support",
        "Student progress tracking",
        "Export capabilities (PDF/CSV)"
      ],
      cta: "Start Free Trial",
      highlight: false
    },
    {
      name: "Institution",
      price: "Custom",
      period: "contact us",
      popular: false,
      description: "Comprehensive solution for schools and organizations",
      features: [
        "Everything in Educator plan",
        "Single sign-on (SSO)",
        "Advanced user management",
        "Custom integrations",
        "Dedicated account manager",
        "24/7 phone support",
        "Custom deployment options",
        "Training and onboarding"
      ],
      cta: "Contact Sales",
      highlight: false
    }
  ];

  const faqs = [
    {
      question: "Is the free plan really free forever?",
      answer: "Yes! Our Student plan is completely free with no time limits. We believe education should be accessible to everyone."
    },
    {
      question: "Can I upgrade or downgrade at any time?",
      answer: "Absolutely. You can change your plan at any time, and we'll prorate any charges accordingly."
    },
    {
      question: "Do you offer discounts for students?",
      answer: "Our free Student plan is designed specifically for individual learners. Educational institutions may qualify for special pricing."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and bank transfers for institutional accounts."
    },
    {
      question: "Is there a free trial for paid plans?",
      answer: "Yes! All paid plans come with a 14-day free trial. No credit card required to start."
    },
    {
      question: "Can I cancel my subscription anytime?",
      answer: "Yes, you can cancel your subscription at any time. Your access will continue until the end of your billing period."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Header currentLanguage="en" />
      
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Simple, Transparent
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Pricing</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Start learning for free. Upgrade when you need more advanced features. No hidden fees, no surprises.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, index) => (
            <Card key={index} className={`relative hover:shadow-xl transition-all duration-300 ${plan.highlight ? 'ring-2 ring-blue-500 scale-105' : 'hover:-translate-y-1'}`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900">{plan.name}</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  {plan.period && <span className="text-gray-500 ml-2">/{plan.period}</span>}
                </div>
                <p className="text-gray-600 mt-2">{plan.description}</p>
              </CardHeader>
              
              <CardContent className="pt-0">
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Link to={plan.name === 'Institution' ? '/contact' : '/register'}>
                  <Button 
                    className={`w-full ${plan.highlight 
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700' 
                      : 'bg-gray-900 hover:bg-gray-800'
                    }`}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {faqs.map((faq, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">{faq.question}</h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to Start Learning Smarter?</h2>
            <p className="text-xl mb-8 opacity-90">Join thousands of students and educators using MemoSpark every day.</p>
            <Link to="/register">
              <Button className="bg-white text-blue-600 hover:bg-gray-100 px-8 py-3 text-lg">
                Get Started Free Today
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Pricing;
