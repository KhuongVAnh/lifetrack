export const EMPTY_PHR_OVERVIEW = {
  personalInfo: {
    fullName: "",
    dob: "",
    gender: "",
    idCard: "",
    bloodType: "",
    phone: "",
    address: "",
    emergencyContact: {
      name: "",
      relation: "",
      phone: "",
    },
  },
  vitals: {
    height: "",
    weight: "",
    bmi: "",
    heartRate: "",
    bloodPressure: "",
  },
  medicalHistory: {
    personal: [],
    family: [],
    allergies: [],
    lifestyle: {
      smoking: "",
      alcohol: "",
      exercise: "",
    },
  },
  clinicalResults: {
    clinical: {
      internal: "",
      surgical: "",
      eyes: "",
      ent: "",
    },
    subclinical: {
      bloodTest: "",
      imaging: "",
      functional: "",
    },
    conclusion: {
      healthClass: "",
      advice: "",
    },
  },
};

export function buildPhrOverviewFormState(overview, patient = null) {
  return {
    personalInfo: {
      ...EMPTY_PHR_OVERVIEW.personalInfo,
      ...(overview?.personal_info || {}),
      fullName: overview?.personal_info?.fullName || patient?.name || "",
      emergencyContact: {
        ...EMPTY_PHR_OVERVIEW.personalInfo.emergencyContact,
        ...(overview?.personal_info?.emergencyContact || {}),
      },
    },
    vitals: {
      ...EMPTY_PHR_OVERVIEW.vitals,
      ...(overview?.vitals || {}),
    },
    medicalHistory: {
      ...EMPTY_PHR_OVERVIEW.medicalHistory,
      ...(overview?.medical_history || {}),
      personal: Array.isArray(overview?.medical_history?.personal)
        ? overview.medical_history.personal
        : [],
      family: Array.isArray(overview?.medical_history?.family)
        ? overview.medical_history.family
        : [],
      allergies: Array.isArray(overview?.medical_history?.allergies)
        ? overview.medical_history.allergies
        : [],
      lifestyle: {
        ...EMPTY_PHR_OVERVIEW.medicalHistory.lifestyle,
        ...(overview?.medical_history?.lifestyle || {}),
      },
    },
    clinicalResults: {
      ...EMPTY_PHR_OVERVIEW.clinicalResults,
      ...(overview?.clinical_results || {}),
      clinical: {
        ...EMPTY_PHR_OVERVIEW.clinicalResults.clinical,
        ...(overview?.clinical_results?.clinical || {}),
      },
      subclinical: {
        ...EMPTY_PHR_OVERVIEW.clinicalResults.subclinical,
        ...(overview?.clinical_results?.subclinical || {}),
      },
      conclusion: {
        ...EMPTY_PHR_OVERVIEW.clinicalResults.conclusion,
        ...(overview?.clinical_results?.conclusion || {}),
      },
    },
  };
}

export function calculatePhrBmi(height, weight, fallback = "") {
  const numericHeight = Number(height);
  const numericWeight = Number(weight);

  if (numericHeight > 0 && numericWeight > 0) {
    return (numericWeight / ((numericHeight / 100) ** 2)).toFixed(1);
  }

  return fallback || "";
}
