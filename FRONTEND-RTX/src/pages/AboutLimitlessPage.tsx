import { useNavigate } from 'react-router-dom'
import { Heart, Users, BookOpen, Building, Check, ArrowLeft } from 'lucide-react'

export default function AboutLimitlessPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-base-200 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <button
          onClick={() => navigate('/limitlessintiative')}
          className="btn btn-ghost mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </button>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="text-3xl font-bold text-primary mb-4">
              About the Limitless Initiative
            </h1>
            <p className="text-lg mb-8">
              Transforming lives, one step at a time. Discover our mission, vision,
              and the impact we strive to create.
            </p>

            <div className="divider" />

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">Our Mission</h2>
              <p className="text-base-content/80">
                To empower children and young adults suffering from epilepsy and mental
                infarcts by providing them with the resources and support they need to live
                fulfilling, limitless lives.
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">Our Vision</h2>
              <p className="text-base-content/80">
                A world where no individual feels constrained by their medical conditions,
                where every young person can access quality care, psychosocial support, and
                opportunities to achieve their full potential.
              </p>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">Our Approach</h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <Building className="w-5 h-5 text-primary mt-1" />
                  <span>
                    Establishing a <strong>Limitless Centre</strong> to serve as a hub
                    for care, community, and growth.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Heart className="w-5 h-5 text-primary mt-1" />
                  <span>
                    Providing seamless access to essential medication and therapeutic
                    resources.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <BookOpen className="w-5 h-5 text-primary mt-1" />
                  <span>
                    Curating educational and motivational materials to inspire
                    resilience and self-confidence.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-primary mt-1" />
                  <span>
                    Building a supportive network of professionals, caregivers, and advocates.
                  </span>
                </li>
              </ul>
            </div>

            <div className="divider" />

            <div className="mb-6">
              <h2 className="text-xl font-bold mb-3">Why Your Support Matters</h2>
              <p className="text-base-content/80 mb-4">
                Every donation helps us take a step closer to achieving our mission.
                By supporting the Limitless Initiative, you are:
              </p>
              <ul className="space-y-2">
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" />
                  Giving hope to those who need it most.
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" />
                  Helping us provide critical medical treatments and counseling
                  services.
                </li>
                <li className="flex items-center gap-3">
                  <Check className="w-5 h-5 text-success" />
                  Enabling young individuals to pursue education and personal growth
                  without limits.
                </li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-4 mt-8">
              <button
                onClick={() => navigate('/donations/add')}
                className="btn btn-primary"
              >
                Join Our Mission
              </button>
              <button
                onClick={() => navigate('/donations/add')}
                className="btn btn-outline"
              >
                <Heart className="w-4 h-4 mr-2" />
                Make a Donation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}