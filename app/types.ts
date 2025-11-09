export type ActivityCategory =
  | "Sports"
  | "Clubs"
  | "Volunteer"
  | "Work"
  | "Academic"
  | "Arts"
  | "Leadership"
  | "Other";

export type ProfileType = "Organization" | "Applicant";

export interface BaseProfile {
  id: string;
  email: string;
  name: string;
  profileType: ProfileType;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationProfile extends BaseProfile {
  profileType: "Organization";
  description?: string;
  website?: string;
  location?: string;
}

export interface ApplicantProfile extends BaseProfile {
  profileType: "Applicant";
  bio?: string;
  location?: string;
}

export type Profile = OrganizationProfile | ApplicantProfile;

export interface Verification {
  id: string;
  organizationId: string;
  organizationName: string;
  applicantId: string;
  applicantEmail: string;
  title: string; // e.g., "Internship 2025 Financial Analyst"
  description?: string;
  startDate: string;
  endDate?: string;
  position?: string;
  category?: ActivityCategory;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
  updatedAt: string;
}

// Legacy Activity interface for self-added activities
export interface Activity {
  id: string;
  name: string;
  category: ActivityCategory;
  description: string;
  startDate: string;
  endDate?: string;
  hoursPerWeek?: number;
  totalHours?: number;
  position?: string;
  organization?: string;
  verified: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  applicantId?: string; // Link to applicant profile if added by user
}
