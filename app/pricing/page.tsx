'use client'

import { useState } from 'react'
import { createCheckoutSession } from '@/app/actions/stripe'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    description: 'For solo BD managers and small firms just getting started.',
    features: [
      '5 win strategy reports per month',
      'Win probability scoring',
      'Plain English summaries',
      'Go or no-go recommendation',
      '1 user',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    description: 'The complete intelligence platform for small GovCon firms actively pursuing contracts.',
    features: [
      '20 win strategy reports per month',
      'Win probability scoring',
      'Competitive landscape analysis',
      'Teaming recommendations',
      'Positioning guidance',
      'Plain English summaries',
      'Go or no-go recommendation',
      '3 users',
      'Priority support',
    ],
    featured: true,
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 299,
    description: 'For BD consultants managing multiple clients and larger capture pipelines.',
    features: [
      'Unlimited win strategy reports',
      'Everything in Pro',
      'Multiple firm workspaces',
      'Unlimited users',
      'Dedicated support',
    ],
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (tier: string) => {
    setLoading(tier)
    const result = await createCheckoutSession(tier)

    if (result.url) {
      window.location.href = result.url
    } else {
      alert(result.error || 'Something went wrong.')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="text-3xl font-bold text-foreground">Simple, transparent pricing.</h1>
        <p className="mt-3 text-muted">Choose the plan that fits your firm. Cancel any time.</p>

        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-lg border p-6 text-left ${
                plan.featured ? 'border-accent bg-surface' : 'border-border bg-surface'
              }`}
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted">{plan.name}</p>
              <div className="mt-2 text-3xl font-bold text-foreground">
                ${plan.price}
                <span className="text-sm font-normal text-muted"> per month</span>
              </div>
              <p className="mt-2 text-sm text-muted">{plan.description}</p>

              <ul className="mt-4 space-y-2 text-sm text-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <span className="text-accent">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan.id)}
                disabled={loading === plan.id}
                className="mt-6 w-full rounded bg-accent px-4 py-2 text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {loading === plan.id ? 'Loading...' : 'Choose Plan'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}