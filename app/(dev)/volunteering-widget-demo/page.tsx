'use client';

import { VolunteeringWidget } from '@/app/components/VolunteeringWidget';

export default function VolunteeringWidgetDemo() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Volunteering Widget Demo</h1>
          <p className="text-slate-600">
            Testing the enhanced volunteering widget with different states
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* New user - no hours */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">New User (0 hours)</p>
            <div className="h-[400px]">
              <VolunteeringWidget
                totalHours={0}
                active={0}
                completed={0}
                upcoming={2}
                highlight="Join your first opportunity"
              />
            </div>
          </div>

          {/* Getting started */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Getting Started (15 hours)</p>
            <div className="h-[400px]">
              <VolunteeringWidget
                totalHours={15}
                active={2}
                completed={1}
                upcoming={3}
                highlight="Community Food Bank"
              />
            </div>
          </div>

          {/* Active volunteer */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Active Volunteer (48 hours)</p>
            <div className="h-[400px]">
              <VolunteeringWidget
                totalHours={48}
                active={3}
                completed={5}
                upcoming={4}
                highlight="Beach Cleanup Initiative"
              />
            </div>
          </div>

          {/* Experienced volunteer */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Experienced (87 hours)</p>
            <div className="h-[400px]">
              <VolunteeringWidget
                totalHours={87}
                active={4}
                completed={12}
                upcoming={5}
                highlight="Senior Care Program"
              />
            </div>
          </div>

          {/* Dedicated volunteer */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Dedicated (125 hours)</p>
            <div className="h-[400px]">
              <VolunteeringWidget
                totalHours={125}
                active={5}
                completed={18}
                upcoming={7}
                highlight="Youth Mentorship Workshop"
              />
            </div>
          </div>

          {/* Super volunteer */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-700">Super Volunteer (250 hours)</p>
            <div className="h-[400px]">
              <VolunteeringWidget
                totalHours={250}
                active={6}
                completed={32}
                upcoming={8}
                highlight="Hospital Support Team"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">Widget Features</h2>
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Animated progress arc</strong> - Visual representation of hours logged with
                gradient
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Number animation</strong> - Hours count animates on load
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Hover effects</strong> - Smooth transitions with elevation and subtle
                gradient overlay
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Motivational messages</strong> - Dynamic encouragement based on progress
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Quick action button</strong> - Direct "Log hours" CTA with hover animation
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Status indicators</strong> - Color-coded badges for Active, Upcoming, and
                Completed
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-600 font-bold">✓</span>
              <span>
                <strong>Icon animation</strong> - Clock icon scales and rotates on hover
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
