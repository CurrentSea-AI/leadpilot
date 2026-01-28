// Pre-defined niche templates
// These are used to seed the database and provide defaults for new users

export interface NicheConfig {
  slug: string;
  displayName: string;
  icon: string;
  searchTerms: string[];
  auditCriteria: {
    mustHave: string[];
    niceToHave: string[];
    industryFocus: string;
  };
}

export const NICHE_TEMPLATES: NicheConfig[] = [
  {
    slug: "medical_office",
    displayName: "Medical Office",
    icon: "🏥",
    searchTerms: [
      "medical office",
      "family medicine",
      "primary care physician",
      "doctor's office",
    ],
    auditCriteria: {
      mustHave: [
        "Online appointment booking",
        "Insurance information",
        "Office hours clearly displayed",
        "Provider profiles",
        "Contact form or phone number",
      ],
      niceToHave: [
        "Patient portal link",
        "Telehealth options",
        "Reviews/testimonials",
        "Services list",
        "New patient forms",
      ],
      industryFocus: "healthcare accessibility and patient trust",
    },
  },
  {
    slug: "dental_practice",
    displayName: "Dental Practice",
    icon: "🦷",
    searchTerms: [
      "dental office",
      "dentist",
      "family dentistry",
      "dental clinic",
    ],
    auditCriteria: {
      mustHave: [
        "Online appointment scheduling",
        "Services list (cleanings, cosmetic, etc.)",
        "Insurance/payment info",
        "Before/after gallery",
        "Emergency contact info",
      ],
      niceToHave: [
        "New patient specials",
        "Financing options",
        "Meet the team page",
        "Patient testimonials",
        "Office tour photos/video",
      ],
      industryFocus: "patient comfort and cosmetic outcomes",
    },
  },
  {
    slug: "law_firm",
    displayName: "Law Firm",
    icon: "⚖️",
    searchTerms: [
      "law firm",
      "attorney",
      "lawyer",
      "legal services",
    ],
    auditCriteria: {
      mustHave: [
        "Practice areas clearly listed",
        "Attorney profiles with credentials",
        "Contact form for consultations",
        "Phone number prominently displayed",
        "Professional, trustworthy design",
      ],
      niceToHave: [
        "Case results/success stories",
        "Client testimonials",
        "FAQ section",
        "Blog with legal insights",
        "Free consultation offer",
      ],
      industryFocus: "credibility, expertise, and client trust",
    },
  },
  {
    slug: "restaurant",
    displayName: "Restaurant",
    icon: "🍽️",
    searchTerms: [
      "restaurant",
      "cafe",
      "bistro",
      "dining",
    ],
    auditCriteria: {
      mustHave: [
        "Menu with prices",
        "Hours of operation",
        "Location/directions",
        "Reservation or ordering option",
        "Food photos",
      ],
      niceToHave: [
        "Online ordering integration",
        "Reservation system",
        "Events/specials section",
        "Social media integration",
        "Customer reviews",
      ],
      industryFocus: "appetite appeal and convenience",
    },
  },
  {
    slug: "gym_fitness",
    displayName: "Gym & Fitness",
    icon: "💪",
    searchTerms: [
      "gym",
      "fitness center",
      "personal training",
      "crossfit",
    ],
    auditCriteria: {
      mustHave: [
        "Membership options/pricing",
        "Class schedule",
        "Facility photos",
        "Hours of operation",
        "Free trial or consultation offer",
      ],
      niceToHave: [
        "Trainer profiles",
        "Success stories/transformations",
        "Online class booking",
        "Virtual tour",
        "Blog/fitness tips",
      ],
      industryFocus: "motivation and community atmosphere",
    },
  },
  {
    slug: "salon_spa",
    displayName: "Salon & Spa",
    icon: "💇",
    searchTerms: [
      "hair salon",
      "spa",
      "beauty salon",
      "nail salon",
    ],
    auditCriteria: {
      mustHave: [
        "Services menu with prices",
        "Online booking option",
        "Stylist/therapist profiles",
        "Gallery of work",
        "Contact info",
      ],
      niceToHave: [
        "Gift cards",
        "Loyalty program",
        "Product sales",
        "Before/after photos",
        "Client reviews",
      ],
      industryFocus: "aesthetic appeal and relaxation",
    },
  },
  {
    slug: "real_estate",
    displayName: "Real Estate",
    icon: "🏠",
    searchTerms: [
      "real estate agent",
      "realtor",
      "property management",
      "real estate broker",
    ],
    auditCriteria: {
      mustHave: [
        "Active listings/MLS integration",
        "Agent bio and credentials",
        "Contact form",
        "Search functionality",
        "Property photos",
      ],
      niceToHave: [
        "Neighborhood guides",
        "Sold/success stories",
        "Market reports",
        "Home valuation tool",
        "Client testimonials",
      ],
      industryFocus: "local expertise and trustworthiness",
    },
  },
  {
    slug: "home_services",
    displayName: "Home Services",
    icon: "🔧",
    searchTerms: [
      "plumber",
      "electrician",
      "HVAC",
      "handyman",
    ],
    auditCriteria: {
      mustHave: [
        "Services offered",
        "Service area",
        "Phone number prominently displayed",
        "Request quote form",
        "License/insurance info",
      ],
      niceToHave: [
        "Online booking",
        "Emergency services info",
        "Before/after project photos",
        "Customer reviews",
        "Pricing estimates",
      ],
      industryFocus: "reliability and quick response",
    },
  },
  {
    slug: "pet_services",
    displayName: "Pet Services",
    icon: "🐕",
    searchTerms: [
      "veterinarian",
      "pet grooming",
      "dog training",
      "pet boarding",
    ],
    auditCriteria: {
      mustHave: [
        "Services and pricing",
        "Booking/scheduling option",
        "Hours and location",
        "Staff qualifications",
        "Contact info",
      ],
      niceToHave: [
        "Pet photos/gallery",
        "Emergency info",
        "Pet care tips blog",
        "Client testimonials",
        "Vaccination/health records portal",
      ],
      industryFocus: "pet safety and owner trust",
    },
  },
  {
    slug: "photographer",
    displayName: "Photographer",
    icon: "📸",
    searchTerms: [
      "photographer",
      "wedding photographer",
      "portrait photographer",
      "photography studio",
    ],
    auditCriteria: {
      mustHave: [
        "Portfolio gallery",
        "Service packages/pricing",
        "Contact/booking form",
        "About/bio section",
        "Session types offered",
      ],
      niceToHave: [
        "Blog with recent work",
        "Client testimonials",
        "FAQ section",
        "Social media integration",
        "Video samples",
      ],
      industryFocus: "visual storytelling and artistic style",
    },
  },
  {
    slug: "contractor",
    displayName: "Contractor",
    icon: "🏗️",
    searchTerms: [
      "general contractor",
      "construction company",
      "home builder",
      "remodeling contractor",
    ],
    auditCriteria: {
      mustHave: [
        "Services offered",
        "Project portfolio/gallery",
        "Contact form",
        "License and insurance info",
        "Service areas",
      ],
      niceToHave: [
        "Testimonials/reviews",
        "Project timeline info",
        "Financing options",
        "Awards/certifications",
        "Blog with project updates",
      ],
      industryFocus: "project quality and contractor reliability",
    },
  },
  {
    slug: "accounting",
    displayName: "Accounting Firm",
    icon: "📊",
    searchTerms: [
      "accountant",
      "CPA",
      "tax preparation",
      "bookkeeping",
    ],
    auditCriteria: {
      mustHave: [
        "Services offered",
        "Team/CPA credentials",
        "Contact info",
        "Client portal link",
        "Industries served",
      ],
      niceToHave: [
        "Tax deadline reminders",
        "Resource center",
        "Free consultation offer",
        "Client testimonials",
        "Online document upload",
      ],
      industryFocus: "expertise and data security",
    },
  },
];

export function getNicheBySlug(slug: string): NicheConfig | undefined {
  return NICHE_TEMPLATES.find((n) => n.slug === slug);
}

export function getNicheSearchTerms(slug: string): string[] {
  const niche = getNicheBySlug(slug);
  return niche?.searchTerms || [slug.replace(/_/g, " ")];
}

