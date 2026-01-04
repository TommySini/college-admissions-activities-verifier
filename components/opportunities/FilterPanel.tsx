'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';

interface FilterPanelProps {
  currentFilters: any;
  onFiltersChange: (filters: any) => void;
  userSchoolId?: string | null;
}

export function FilterPanel({ currentFilters, onFiltersChange, userSchoolId }: FilterPanelProps) {
  // Local state for filters
  const [filters, setFilters] = useState(currentFilters);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  const updateFilter = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const toggleFilter = (key: string, value: string) => {
    const current = filters[key];
    if (!current) {
      updateFilter(key, value);
    } else if (current === value) {
      updateFilter(key, undefined);
    } else {
      const values = current.split(',');
      if (values.includes(value)) {
        const newValues = values.filter((v: string) => v !== value);
        updateFilter(key, newValues.length > 0 ? newValues.join(',') : undefined);
      } else {
        updateFilter(key, [...values, value].join(','));
      }
    }
  };

  const applyFilters = () => {
    onFiltersChange(filters);
  };

  const resetFilters = () => {
    setFilters({});
    onFiltersChange({});
  };

  const isFilterActive = (key: string, value: string) => {
    const current = filters[key];
    if (!current) return false;
    return current === value || current.split(',').includes(value);
  };

  return (
    <div className="space-y-6">
      {/* Social Proof & Popularity */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Social Proof & Popularity</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={filters.doneAtMySchool === 'true'}
              onChange={(e) =>
                updateFilter('doneAtMySchool', e.target.checked ? 'true' : undefined)
              }
              disabled={!userSchoolId}
              className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-sm text-slate-700">
              Done by students at my school
              {!userSchoolId && (
                <span className="text-xs text-slate-500 block">Requires school in profile</span>
              )}
            </span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={filters.popular === 'true'}
              onChange={(e) => updateFilter('popular', e.target.checked ? 'true' : undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-sm text-slate-700">Popular this month</span>
          </label>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={filters.trending === 'true'}
              onChange={(e) => updateFilter('trending', e.target.checked ? 'true' : undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-sm text-slate-700">Trending</span>
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Modality & Format */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Modality & Format</h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Modality</p>
            <div className="flex flex-wrap gap-2">
              {['in_person', 'hybrid', 'online'].map((mod) => (
                <Badge
                  key={mod}
                  variant={isFilterActive('modality', mod) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleFilter('modality', mod)}
                >
                  {mod.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Event Format</p>
            <div className="flex flex-wrap gap-2">
              {[
                'competition',
                'program',
                'scholarship',
                'internship',
                'conference',
                'volunteer',
                'course',
              ].map((type) => (
                <Badge
                  key={type}
                  variant={isFilterActive('type', type) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleFilter('type', type)}
                >
                  {type}
                </Badge>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Structure</p>
            <div className="flex gap-2">
              {['team', 'individual', 'either'].map((struct) => (
                <Badge
                  key={struct}
                  variant={filters.structure === struct ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 flex-1 justify-center"
                  onClick={() =>
                    updateFilter('structure', filters.structure === struct ? undefined : struct)
                  }
                >
                  {struct}
                </Badge>
              ))}
            </div>
          </div>

          {filters.structure === 'team' && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Team Size</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Min</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={filters.teamMin || ''}
                    onChange={(e) => updateFilter('teamMin', e.target.value || undefined)}
                    placeholder="1"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500">Max</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={filters.teamMax || ''}
                    onChange={(e) => updateFilter('teamMax', e.target.value || undefined)}
                    placeholder="10"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-300"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Domain */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Domain</h3>
        <div className="flex flex-wrap gap-2">
          {[
            'Finance',
            'Economics',
            'Business',
            'CS',
            'Cybersecurity',
            'Math',
            'Engineering',
            'Biology',
            'Health',
            'Physics',
            'Chemistry',
            'Environment',
            'Arts',
            'Music',
            'Writing',
            'Debate',
            'Civics',
            'Policy',
            'Entrepreneurship',
            'Journalism',
            'Languages',
          ].map((domain) => (
            <Badge
              key={domain}
              variant={isFilterActive('domain', domain) ? 'default' : 'outline'}
              className="cursor-pointer hover:opacity-80 text-xs"
              onClick={() => toggleFilter('domain', domain)}
            >
              {domain}
            </Badge>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Eligibility */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Eligibility</h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Grade Range</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-500">Min</label>
                <select
                  value={filters.gradeMin || ''}
                  onChange={(e) => updateFilter('gradeMin', e.target.value || undefined)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-300 text-slate-800"
                >
                  <option value="">Any</option>
                  {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500">Max</label>
                <select
                  value={filters.gradeMax || ''}
                  onChange={(e) => updateFilter('gradeMax', e.target.value || undefined)}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-300 text-slate-800"
                >
                  <option value="">Any</option>
                  {[6, 7, 8, 9, 10, 11, 12].map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Edition Status</p>
            <div className="flex flex-wrap gap-2">
              {['open', 'upcoming', 'closed', 'unknown'].map((status) => (
                <Badge
                  key={status}
                  variant={isFilterActive('status', status) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80"
                  onClick={() => toggleFilter('status', status)}
                >
                  {status}
                </Badge>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={filters.rolling === 'true'}
              onChange={(e) => updateFilter('rolling', e.target.checked ? 'true' : undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-sm text-slate-700">Rolling deadlines</span>
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Location & Travel */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Location & Travel</h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Geography Scope</p>
            <select
              value={filters.geo || ''}
              onChange={(e) => updateFilter('geo', e.target.value || undefined)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-blue-300 text-slate-800"
            >
              <option value="">Any</option>
              <option value="global">Global</option>
              <option value="us_national">US National</option>
              <option value="state_province">State/Province</option>
              <option value="local_regional">Local/Regional</option>
            </select>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Travel Required</p>
            <div className="flex gap-2">
              {[
                { value: 'req', label: 'Yes' },
                { value: 'opt', label: 'Optional' },
                { value: 'no', label: 'No' },
              ].map((option) => (
                <Badge
                  key={option.value}
                  variant={filters.travel === option.value ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 flex-1 justify-center"
                  onClick={() =>
                    updateFilter(
                      'travel',
                      filters.travel === option.value ? undefined : option.value
                    )
                  }
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Awards & Outcomes */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Awards & Outcomes</h3>

        <div className="space-y-3">
          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">Award Types</p>
            <div className="flex flex-wrap gap-2">
              {[
                'cash',
                'scholarship',
                'recognition',
                'internship',
                'publication',
                'college_credit',
                'credential',
              ].map((award) => (
                <Badge
                  key={award}
                  variant={isFilterActive('award', award) ? 'default' : 'outline'}
                  className="cursor-pointer hover:opacity-80 text-xs"
                  onClick={() => toggleFilter('award', award)}
                >
                  {award.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
            <input
              type="checkbox"
              checked={filters.alumniNotable === 'true'}
              onChange={(e) => updateFilter('alumniNotable', e.target.checked ? 'true' : undefined)}
              className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-300"
            />
            <span className="text-sm text-slate-700">Notable alumni outcomes</span>
          </label>
        </div>
      </div>

      <div className="border-t border-slate-200" />

      {/* Cost */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Cost</h3>
        <label className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors">
          <input
            type="checkbox"
            checked={filters.free === 'true'}
            onChange={(e) => updateFilter('free', e.target.checked ? 'true' : undefined)}
            className="rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-300"
          />
          <span className="text-sm text-slate-700">Free only (no registration fee)</span>
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4 sticky bottom-0 bg-white border-t border-slate-200 -mx-6 px-6 py-4">
        <Button onClick={applyFilters} className="flex-1">
          Apply Filters
        </Button>
        <Button variant="outline" onClick={resetFilters}>
          Reset
        </Button>
      </div>
    </div>
  );
}
