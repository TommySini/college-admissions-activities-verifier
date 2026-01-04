import { ShimmerButton } from '@/components/ui/shimmer-button';
import { Button } from '@/components/ui/button';

export default function ShimmerDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-8 gap-12">
      <div className="text-center space-y-4 max-w-2xl">
        <h1 className="text-4xl font-bold text-white">ShimmerButton Demo</h1>
        <p className="text-slate-300">
          Test the shimmer animation effect with different configurations
        </p>
      </div>

      <div className="grid gap-8 max-w-4xl w-full">
        {/* Default ShimmerButton */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Default Blue Shimmer (White Text)</h2>
          <ShimmerButton className="shadow-2xl">
            <span className="whitespace-pre-wrap text-center text-sm font-medium leading-none tracking-tight lg:text-lg">
              Shimmer Button
            </span>
          </ShimmerButton>
        </div>

        {/* Custom Colors */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Custom Colors</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <ShimmerButton
              shimmerColor="#3b82f6"
              background="rgba(30, 58, 138, 1)"
              className="shadow-2xl"
            >
              <span className="text-sm font-medium">Blue Shimmer</span>
            </ShimmerButton>
            <ShimmerButton
              shimmerColor="#10b981"
              background="rgba(5, 46, 22, 1)"
              className="shadow-2xl"
            >
              <span className="text-sm font-medium">Green Shimmer</span>
            </ShimmerButton>
            <ShimmerButton
              shimmerColor="#f59e0b"
              background="rgba(120, 53, 15, 1)"
              className="shadow-2xl"
            >
              <span className="text-sm font-medium">Amber Shimmer</span>
            </ShimmerButton>
          </div>
        </div>

        {/* Via Button Component (variant="shimmer") */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Via Button Component</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="shimmer">Default Size</Button>
            <Button variant="shimmer" size="sm">
              Small Size
            </Button>
            <Button variant="shimmer" size="lg">
              Large Size
            </Button>
          </div>
        </div>

        {/* Different Speeds */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Animation Speed</h2>
          <div className="flex flex-wrap gap-4 justify-center">
            <ShimmerButton shimmerDuration="1s" className="shadow-2xl">
              <span className="text-sm font-medium">Fast (1s)</span>
            </ShimmerButton>
            <ShimmerButton shimmerDuration="3s" className="shadow-2xl">
              <span className="text-sm font-medium">Normal (3s)</span>
            </ShimmerButton>
            <ShimmerButton shimmerDuration="6s" className="shadow-2xl">
              <span className="text-sm font-medium">Slow (6s)</span>
            </ShimmerButton>
          </div>
        </div>

        {/* Disabled State */}
        <div className="flex flex-col items-center gap-4">
          <h2 className="text-xl font-semibold text-white">Disabled State</h2>
          <Button variant="shimmer" disabled>
            Disabled Button
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6 text-white">
          <h3 className="font-semibold mb-2">Features:</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-slate-200">
            <li>
              Respects <code className="bg-black/30 px-1 rounded">prefers-reduced-motion</code>
            </li>
            <li>Full keyboard navigation support with focus rings</li>
            <li>Accessible with proper ARIA labels</li>
            <li>Integrates seamlessly with Button component</li>
            <li>Customizable colors, speed, and border radius</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
